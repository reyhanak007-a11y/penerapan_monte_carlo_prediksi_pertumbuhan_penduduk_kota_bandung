"""
Flask Application for Employment Prediction using Monte Carlo
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, session
from flask_cors import CORS
import plotly
import plotly.express as px
import plotly.graph_objects as go

# Import custom modules
from monte_carlo import MonteCarloPredictor
from data_processor import DataPreprocessor

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['DEBUG'] = True
CORS(app)

# Global variables
df = None
df_agg = None
predictor = None

def initialize_data():
    """Initialize data and predictor on startup"""
    global df, df_agg, predictor
    
    try:
        # Load and process data
        print("📂 Loading dataset...")
        df = pd.read_csv('data/raw/jumlah_penduduk_kota_bandung_berdasarkan_jenis_pekerjaan.csv')
        
        # Process data
        preprocessor = DataPreprocessor(df)
        df_clean, df_agg = preprocessor.get_processed_data()
        
        # Initialize predictor
        predictor = MonteCarloPredictor(df_agg)
        
        print(f"✅ Data initialized successfully!")
        print(f"   Rows: {len(df_agg)}")
        print(f"   Years: {df_agg['tahun'].min()} - {df_agg['tahun'].max()}")
        print(f"   Job types: {df_agg['jenis_pekerjaan'].nunique()}")
        
        return True
    except Exception as e:
        print(f"❌ Error initializing data: {str(e)}")
        return False

# Initialize on startup
initialize_data()

# ===========================================
# ROUTES
# ===========================================

@app.route('/')
def index():
    """Home page"""
    if df_agg is not None:
        job_types = sorted(df_agg['jenis_pekerjaan'].unique().tolist())
        years = sorted(df_agg['tahun'].unique().tolist())
        
        # Get summary statistics
        total_population = df_agg.groupby('tahun')['jumlah_penduduk'].sum().max()
        total_jobs = len(job_types)
        data_years = f"{years[0]} - {years[-1]}"
    else:
        job_types = []
        years = []
        total_population = 0
        total_jobs = 0
        data_years = "N/A"
    
    return render_template('index.html',
                         job_types=job_types,
                         years=years,
                         total_population=f"{total_population:,}",
                         total_jobs=total_jobs,
                         data_years=data_years)

@app.route('/dashboard')
def dashboard():
    """Dashboard page"""
    return render_template('dashboard.html')

@app.route('/about')
def about():
    """About page"""
    return render_template('about.html')

# ===========================================
# API ENDPOINTS
# ===========================================

@app.route('/api/data/summary')
def get_data_summary():
    """Get data summary"""
    if df_agg is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Basic statistics
        summary = {
            'total_records': len(df_agg),
            'years': sorted(df_agg['tahun'].unique().tolist()),
            'job_types': sorted(df_agg['jenis_pekerjaan'].unique().tolist()),
            'total_population': int(df_agg['jumlah_penduduk'].sum()),
            'latest_year': int(df_agg['tahun'].max()),
            'earliest_year': int(df_agg['tahun'].min())
        }
        
        # Yearly totals
        yearly_totals = df_agg.groupby('tahun')['jumlah_penduduk'].sum().reset_index()
        summary['yearly_totals'] = yearly_totals.to_dict('records')
        
        # Top 10 jobs in latest year
        latest_year = df_agg['tahun'].max()
        top_jobs = df_agg[df_agg['tahun'] == latest_year] \
            .nlargest(10, 'jumlah_penduduk')[['jenis_pekerjaan', 'jumlah_penduduk']]
        
        summary['top_jobs'] = top_jobs.to_dict('records')
        
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/job/types')
def get_job_types():
    """Get list of job types"""
    if df_agg is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    job_types = sorted(df_agg['jenis_pekerjaan'].unique().tolist())
    return jsonify(job_types)

@app.route('/api/historical/data')
def get_historical_data():
    """Get historical data for visualization"""
    if df_agg is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Get job type from query parameter
        job_type = request.args.get('job_type', None)
        
        if job_type:
            # Filter for specific job
            filtered_data = df_agg[df_agg['jenis_pekerjaan'] == job_type]
            if len(filtered_data) == 0:
                return jsonify({'error': 'Job type not found'}), 404
            data = filtered_data
        else:
            # All data
            data = df_agg
        
        # Convert to records
        result = data.to_dict('records')
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    """Run Monte Carlo prediction"""
    if predictor is None:
        return jsonify({'error': 'Predictor not initialized'}), 500
    
    try:
        data = request.json
        
        # Validate parameters
        job_type = data.get('job_type')
        target_year = int(data.get('target_year', 2030))
        n_simulations = int(data.get('n_simulations', 5000))
        confidence_level = float(data.get('confidence_level', 0.95))
        
        if not job_type:
            return jsonify({'error': 'Job type is required'}), 400
        
        # Check if job type exists
        if job_type not in df_agg['jenis_pekerjaan'].unique():
            return jsonify({'error': f'Job type "{job_type}" not found'}), 404
        
        # Run prediction
        print(f"🎯 Predicting {job_type} for {target_year} with {n_simulations} simulations")
        
        prediction_result = predictor.predict_job_growth(
            job_type=job_type,
            target_year=target_year,
            n_simulations=n_simulations,
            confidence_level=confidence_level
        )
        
        if prediction_result is None:
            return jsonify({'error': 'Prediction failed'}), 500
        
        # Get historical data for this job
        historical_data = df_agg[df_agg['jenis_pekerjaan'] == job_type] \
            .sort_values('tahun') \
            .to_dict('records')
        
        # Prepare response
        response = {
            'success': True,
            'prediction': prediction_result,
            'historical_data': historical_data,
            'parameters': {
                'job_type': job_type,
                'target_year': target_year,
                'n_simulations': n_simulations,
                'confidence_level': confidence_level
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/batch', methods=['POST'])
def batch_predict():
    """Run batch prediction for multiple jobs"""
    if predictor is None:
        return jsonify({'error': 'Predictor not initialized'}), 500
    
    try:
        data = request.json
        
        # Get parameters
        job_types = data.get('job_types', [])
        target_year = int(data.get('target_year', 2030))
        n_simulations = int(data.get('n_simulations', 5000))
        confidence_level = float(data.get('confidence_level', 0.95))
        
        # If no jobs specified, use top 10
        if not job_types:
            latest_year = df_agg['tahun'].max()
            top_jobs = df_agg[df_agg['tahun'] == latest_year] \
                .nlargest(10, 'jumlah_penduduk')['jenis_pekerjaan'].tolist()
            job_types = top_jobs
        
        results = []
        
        for job_type in job_types:
            try:
                result = predictor.predict_job_growth(
                    job_type=job_type,
                    target_year=target_year,
                    n_simulations=n_simulations,
                    confidence_level=confidence_level
                )
                
                if result:
                    results.append(result)
            except Exception as e:
                print(f"⚠️ Error predicting {job_type}: {str(e)}")
        
        return jsonify({
            'success': True,
            'results': results,
            'parameters': {
                'target_year': target_year,
                'n_simulations': n_simulations,
                'confidence_level': confidence_level,
                'total_predictions': len(results)
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/charts/historical')
def get_historical_chart():
    """Generate historical chart data"""
    if df_agg is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Create a line chart of total population over time
        yearly_totals = df_agg.groupby('tahun')['jumlah_penduduk'].sum().reset_index()
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=yearly_totals['tahun'],
            y=yearly_totals['jumlah_penduduk'],
            mode='lines+markers',
            name='Total Population',
            line=dict(color='blue', width=3)
        ))
        
        fig.update_layout(
            title='Total Population Trend',
            xaxis_title='Year',
            yaxis_title='Population',
            hovermode='x unified'
        )
        
        chart_json = json.loads(fig.to_json())
        
        return jsonify(chart_json)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/results', methods=['POST'])
def export_results():
    """Export prediction results to Excel"""
    try:
        data = request.json
        results = data.get('results', [])
        
        if not results:
            return jsonify({'error': 'No results to export'}), 400
        
        # Create DataFrame
        df_results = pd.DataFrame(results)
        
        # Save to Excel
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"predictions_{timestamp}.xlsx"
        filepath = os.path.join('outputs', filename)
        
        # Create outputs directory if it doesn't exist
        os.makedirs('outputs', exist_ok=True)
        
        # Save to Excel
        df_results.to_excel(filepath, index=False)
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/status')
def system_status():
    """Check system status"""
    status = {
        'data_loaded': df_agg is not None,
        'predictor_ready': predictor is not None,
        'total_records': len(df_agg) if df_agg is not None else 0,
        'job_types_count': df_agg['jenis_pekerjaan'].nunique() if df_agg is not None else 0,
        'timestamp': datetime.now().isoformat()
    }
    
    return jsonify(status)

# ===========================================
# ERROR HANDLERS
# ===========================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ===========================================
# MAIN
# ===========================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)