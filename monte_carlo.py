"""
Monte Carlo Predictor for Employment Prediction
"""

import numpy as np
import pandas as pd

class MonteCarloPredictor:
    def __init__(self, df_agg):
        self.df_agg = df_agg
        self.historical_stats = {}
        self.predictions = {}
        
    def calculate_historical_stats(self, job_type):
        """Calculate historical statistics for a job type"""
        job_data = self.df_agg[self.df_agg['jenis_pekerjaan'] == job_type]
        
        if len(job_data) < 2:
            return None
        
        # Sort by year
        job_data = job_data.sort_values('tahun')
        years = job_data['tahun'].values
        populations = job_data['jumlah_penduduk'].values
        
        # Calculate growth rates
        growth_rates = []
        for i in range(1, len(populations)):
            growth = (populations[i] - populations[i-1]) / populations[i-1]
            growth_rates.append(growth)
        
        stats = {
            'years': years.tolist(),
            'populations': populations.tolist(),
            'current_population': float(populations[-1]),
            'current_year': int(years[-1]),
            'mean_growth': float(np.mean(growth_rates)) if growth_rates else 0.03,
            'std_growth': float(np.std(growth_rates)) if len(growth_rates) > 1 else 0.05,
            'n_years': len(years)
        }
        
        self.historical_stats[job_type] = stats
        return stats
    
    def predict_job_growth(self, job_type, target_year=2030, n_simulations=10000, confidence_level=0.95):
        """Predict job growth using Monte Carlo simulation"""
        
        # Calculate historical statistics
        if job_type not in self.historical_stats:
            stats = self.calculate_historical_stats(job_type)
            if stats is None:
                print(f"⚠️ Insufficient data for {job_type}")
                return None
        else:
            stats = self.historical_stats[job_type]
        
        # Simulation parameters
        years_to_predict = target_year - stats['current_year']
        if years_to_predict <= 0:
            print(f"⚠️ Target year must be greater than {stats['current_year']}")
            return None
        
        # Initialize simulation array
        simulations = np.zeros((n_simulations, years_to_predict + 1))
        simulations[:, 0] = stats['current_population']
        
        # Generate random growth rates
        growth_rates = np.random.normal(
            stats['mean_growth'],
            stats['std_growth'],
            (n_simulations, years_to_predict)
        )
        
        # Clip extreme growth rates
        growth_rates = np.clip(growth_rates, -0.5, 1.0)
        
        # Run simulation
        for year in range(years_to_predict):
            simulations[:, year + 1] = simulations[:, year] * (1 + growth_rates[:, year])
        
        # Calculate prediction statistics
        final_predictions = simulations[:, -1]
        
        # Calculate percentiles for confidence interval
        alpha = 1 - confidence_level
        lower_percentile = (alpha / 2) * 100
        upper_percentile = 100 - (alpha / 2)
        
        prediction_stats = {
            'job_type': job_type,
            'current_year': stats['current_year'],
            'current_population': stats['current_population'],
            'target_year': target_year,
            'n_simulations': n_simulations,
            'mean_prediction': float(np.mean(final_predictions)),
            'median_prediction': float(np.median(final_predictions)),
            'std_prediction': float(np.std(final_predictions)),
            'ci_lower': float(np.percentile(final_predictions, lower_percentile)),
            'ci_upper': float(np.percentile(final_predictions, upper_percentile)),
            'min_prediction': float(np.min(final_predictions)),
            'max_prediction': float(np.max(final_predictions)),
            'cagr': float(((np.mean(final_predictions) / stats['current_population']) ** 
                    (1/years_to_predict) - 1) * 100)
        }
        
        self.predictions[job_type] = {
            'stats': prediction_stats,
            'simulations': simulations.tolist(),
            'growth_rates': growth_rates.tolist()
        }
        
        return prediction_stats
    
    def batch_predict(self, job_types, target_year=2030, n_simulations=5000):
        """Batch prediction for multiple job types"""
        results = []
        
        for job_type in job_types:
            try:
                result = self.predict_job_growth(
                    job_type=job_type,
                    target_year=target_year,
                    n_simulations=n_simulations
                )
                
                if result:
                    results.append(result)
            except Exception as e:
                print(f"❌ Error predicting {job_type}: {str(e)}")
        
        return results