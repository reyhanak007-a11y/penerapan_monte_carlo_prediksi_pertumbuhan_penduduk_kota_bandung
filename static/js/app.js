/**
 * Main JavaScript for Employment Prediction App
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initApp();
    
    // Event listeners
    setupEventListeners();
    
    // Load initial data
    loadDataSummary();
});

// Global variables
let currentPredictions = [];
let currentJobType = '';

function initApp() {
    console.log('🚀 Employment Prediction App Initialized');
    
    // Check system status
    checkSystemStatus();
}

function setupEventListeners() {
    // Form submission
    document.getElementById('predictionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        runPrediction();
    });
    
    // Quick predict button
    document.getElementById('quickPredict').addEventListener('click', function() {
        runBatchPrediction();
    });
    
    // Reset form
    document.getElementById('resetForm').addEventListener('click', function() {
        resetForm();
    });
    
    // Export results
    document.getElementById('exportResults').addEventListener('click', function() {
        exportResults();
    });
    
    // Sample predictions
    document.getElementById('samplePrediction1').addEventListener('click', function() {
        runSamplePrediction(0);
    });
    
    document.getElementById('samplePrediction2').addEventListener('click', function() {
        runSamplePrediction(1);
    });
}

// ===========================================
// API FUNCTIONS
// ===========================================

function checkSystemStatus() {
    fetch('/api/system/status')
        .then(response => response.json())
        .then(data => {
            console.log('System Status:', data);
        })
        .catch(error => {
            console.error('Error checking system status:', error);
        });
}

function loadDataSummary() {
    fetch('/api/data/summary')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError('Gagal memuat data: ' + data.error);
                return;
            }
            
            updateDataStats(data);
        })
        .catch(error => {
            console.error('Error loading data summary:', error);
            showError('Gagal memuat data statistik');
        });
}

function updateDataStats(data) {
    const statsDiv = document.getElementById('dataStats');
    
    if (!statsDiv) return;
    
    const html = `
        <div class="row">
            <div class="col-6">
                <small class="text-muted">Total Data:</small>
                <p class="mb-2"><strong>${data.total_records.toLocaleString()}</strong> records</p>
            </div>
            <div class="col-6">
                <small class="text-muted">Tahun Data:</small>
                <p class="mb-2"><strong>${data.earliest_year} - ${data.latest_year}</strong></p>
            </div>
            <div class="col-12">
                <small class="text-muted">Jenis Pekerjaan:</small>
                <p class="mb-2"><strong>${data.job_types.length}</strong> jenis</p>
            </div>
        </div>
        <hr>
        <small class="text-muted">Top 3 Pekerjaan (${data.latest_year}):</small>
        <ul class="list-unstyled mb-0">
            ${data.top_jobs.slice(0, 3).map(job => 
                `<li class="small">• ${job.jenis_pekerjaan}: ${parseInt(job.jumlah_penduduk).toLocaleString()}</li>`
            ).join('')}
        </ul>
    `;
    
    statsDiv.innerHTML = html;
}

// ===========================================
// PREDICTION FUNCTIONS
// ===========================================

function runPrediction() {
    // Get form values
    const jobType = document.getElementById('jobType').value;
    const targetYear = parseInt(document.getElementById('targetYear').value);
    const simulations = parseInt(document.getElementById('simulations').value);
    const confidenceLevel = parseFloat(document.getElementById('confidenceLevel').value);
    
    // Validation
    if (!jobType) {
        showError('Silakan pilih jenis pekerjaan');
        return;
    }
    
    if (targetYear < 2024 || targetYear > 2040) {
        showError('Tahun target harus antara 2024-2040');
        return;
    }
    
    // Show loading
    showLoading();
    currentJobType = jobType;
    
    // Prepare request data
    const requestData = {
        job_type: jobType,
        target_year: targetYear,
        n_simulations: simulations,
        confidence_level: confidenceLevel
    };
    
    // Make API call
    fetch('/api/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.error) {
            showError('Prediksi gagal: ' + data.error);
            return;
        }
        
        if (data.success) {
            currentPredictions = [data.prediction];
            displayPredictionResults(data);
            updateCharts(data);
            showSuccess('Prediksi berhasil!');
        }
    })
    .catch(error => {
        hideLoading();
        showError('Terjadi kesalahan: ' + error.message);
        console.error('Prediction error:', error);
    });
}

function runBatchPrediction() {
    const targetYear = parseInt(document.getElementById('targetYear').value);
    const simulations = parseInt(document.getElementById('simulations').value);
    const confidenceLevel = parseFloat(document.getElementById('confidenceLevel').value);
    
    // Show loading
    showLoading();
    
    // Prepare request data
    const requestData = {
        target_year: targetYear,
        n_simulations: simulations,
        confidence_level: confidenceLevel
    };
    
    // Make API call
    fetch('/api/predict/batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.error) {
            showError('Batch prediksi gagal: ' + data.error);
            return;
        }
        
        if (data.success) {
            currentPredictions = data.results;
            displayBatchResults(data);
            showSuccess(`Batch prediksi berhasil! ${data.results.length} pekerjaan diprediksi.`);
        }
    })
    .catch(error => {
        hideLoading();
        showError('Terjadi kesalahan: ' + error.message);
        console.error('Batch prediction error:', error);
    });
}

function runSamplePrediction(index) {
    // Get job types from dropdown
    const jobTypes = Array.from(document.getElementById('jobType').options)
        .map(option => option.value)
        .filter(value => value !== '');
    
    if (jobTypes.length === 0) return;
    
    const sampleJob = jobTypes[index % jobTypes.length];
    
    // Set form values
    document.getElementById('jobType').value = sampleJob;
    document.getElementById('targetYear').value = 2030;
    document.getElementById('simulations').value = 5000;
    document.getElementById('confidenceLevel').value = 0.95;
    
    // Run prediction
    runPrediction();
}

// ===========================================
// DISPLAY FUNCTIONS
// ===========================================

function displayPredictionResults(data) {
    const prediction = data.prediction;
    const historical = data.historical_data;
    
    // Show results section
    document.getElementById('initialMessage').classList.add('d-none');
    document.getElementById('resultsSection').classList.remove('d-none');
    
    // Update results card
    const resultsDiv = document.getElementById('predictionResults');
    resultsDiv.innerHTML = `
        <div class="col-md-4">
            <div class="result-item">
                <div class="result-label">Jenis Pekerjaan</div>
                <div class="result-value">${prediction.job_type}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="result-item">
                <div class="result-label">Populasi Saat Ini (${prediction.current_year})</div>
                <div class="result-value">${prediction.current_population.toLocaleString()}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="result-item">
                <div class="result-label">Prediksi ${prediction.target_year}</div>
                <div class="result-value">${prediction.mean_prediction.toLocaleString()}</div>
            </div>
        </div>
        <div class="col-md-6 mt-2">
            <div class="result-item">
                <div class="result-label">CAGR (Pertumbuhan Tahunan)</div>
                <div class="result-value ${prediction.cagr >= 0 ? 'text-success' : 'text-danger'}">
                    ${prediction.cagr.toFixed(2)}%
                </div>
            </div>
        </div>
        <div class="col-md-6 mt-2">
            <div class="result-item">
                <div class="result-label">95% Confidence Interval</div>
                <div class="result-value">
                    ${prediction.ci_lower.toLocaleString()} - ${prediction.ci_upper.toLocaleString()}
                </div>
            </div>
        </div>
    `;
    
    // Update results table
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = `
        <tr>
            <td>${prediction.job_type}</td>
            <td>${prediction.current_year}</td>
            <td>${prediction.current_population.toLocaleString()}</td>
            <td>${prediction.target_year}</td>
            <td><strong>${prediction.mean_prediction.toLocaleString()}</strong></td>
            <td class="${prediction.cagr >= 0 ? 'text-success' : 'text-danger'}">
                ${prediction.cagr.toFixed(2)}%
            </td>
            <td>${prediction.ci_lower.toLocaleString()} - ${prediction.ci_upper.toLocaleString()}</td>
        </tr>
    `;
    
    // Load historical chart
    loadHistoricalChart(historical, prediction);
}

function displayBatchResults(data) {
    const results = data.results;
    
    // Show results section
    document.getElementById('initialMessage').classList.add('d-none');
    document.getElementById('resultsSection').classList.remove('d-none');
    
    // Update results card with summary
    const resultsDiv = document.getElementById('predictionResults');
    const avgCAGR = results.reduce((sum, r) => sum + r.cagr, 0) / results.length;
    const totalCurrent = results.reduce((sum, r) => sum + r.current_population, 0);
    const totalPredicted = results.reduce((sum, r) => sum + r.mean_prediction, 0);
    
    resultsDiv.innerHTML = `
        <div class="col-md-4">
            <div class="result-item">
                <div class="result-label">Total Pekerjaan</div>
                <div class="result-value">${results.length}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="result-item">
                <div class="result-label">Total Populasi Saat Ini</div>
                <div class="result-value">${totalCurrent.toLocaleString()}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="result-item">
                <div class="result-label">Total Prediksi ${data.parameters.target_year}</div>
                <div class="result-value">${totalPredicted.toLocaleString()}</div>
            </div>
        </div>
        <div class="col-md-6 mt-2">
            <div class="result-item">
                <div class="result-label">Rata-rata CAGR</div>
                <div class="result-value ${avgCAGR >= 0 ? 'text-success' : 'text-danger'}">
                    ${avgCAGR.toFixed(2)}%
                </div>
            </div>
        </div>
        <div class="col-md-6 mt-2">
            <div class="result-item">
                <div class="result-label">Jumlah Simulasi</div>
                <div class="result-value">${data.parameters.n_simulations.toLocaleString()}</div>
            </div>
        </div>
    `;
    
    // Update results table
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = results.map(result => `
        <tr>
            <td>${result.job_type}</td>
            <td>${result.current_year}</td>
            <td>${result.current_population.toLocaleString()}</td>
            <td>${result.target_year}</td>
            <td><strong>${result.mean_prediction.toLocaleString()}</strong></td>
            <td class="${result.cagr >= 0 ? 'text-success' : 'text-danger'}">
                ${result.cagr.toFixed(2)}%
            </td>
            <td>${result.ci_lower.toLocaleString()} - ${result.ci_upper.toLocaleString()}</td>
        </tr>
    `).join('');
    
    // Create comparison chart for batch results
    createComparisonChart(results);
}

function loadHistoricalChart(historicalData, prediction) {
    // Prepare data for chart
    const years = historicalData.map(d => d.tahun);
    const populations = historicalData.map(d => d.jumlah_penduduk);
    
    // Add prediction point
    years.push(prediction.target_year);
    populations.push(prediction.mean_prediction);
    
    // Create trend chart
    const trace1 = {
        x: years.slice(0, -1),
        y: populations.slice(0, -1),
        mode: 'lines+markers',
        name: 'Historical',
        line: { color: 'blue', width: 3 }
    };
    
    const trace2 = {
        x: [years[years.length - 2], years[years.length - 1]],
        y: [populations[populations.length - 2], populations[populations.length - 1]],
        mode: 'lines+markers',
        name: 'Prediction',
        line: { color: 'red', width: 3, dash: 'dash' }
    };
    
    const layout = {
        title: 'Historical Trend and Prediction',
        xaxis: { title: 'Year' },
        yaxis: { title: 'Population' },
        hovermode: 'closest'
    };
    
    Plotly.newPlot('trendChart', [trace1, trace2], layout);
    
    // Create distribution chart (placeholder - would need simulation data)
    createDistributionChart(prediction);
}

function createDistributionChart(prediction) {
    // For now, create a simple bar showing prediction with error bars
    const trace = {
        x: [prediction.job_type],
        y: [prediction.mean_prediction],
        type: 'bar',
        error_y: {
            type: 'data',
            symmetric: false,
            array: [prediction.ci_upper - prediction.mean_prediction],
            arrayminus: [prediction.mean_prediction - prediction.ci_lower],
            visible: true
        },
        marker: { color: 'green' }
    };
    
    const layout = {
        title: 'Prediction with Confidence Interval',
        yaxis: { title: 'Population' }
    };
    
    Plotly.newPlot('distributionChart', [trace], layout);
}

function createComparisonChart(results) {
    // Sort by prediction
    const sortedResults = [...results].sort((a, b) => b.mean_prediction - a.mean_prediction);
    
    const trace = {
        x: sortedResults.map(r => r.job_type),
        y: sortedResults.map(r => r.mean_prediction),
        type: 'bar',
        marker: {
            color: sortedResults.map(r => r.cagr >= 0 ? 'green' : 'red')
        }
    };
    
    const layout = {
        title: 'Comparison of Predictions',
        xaxis: { title: 'Job Type', tickangle: -45 },
        yaxis: { title: 'Predicted Population' },
        showlegend: false
    };
    
    Plotly.newPlot('trendChart', [trace], layout);
    
    // Create CAGR comparison chart
    const trace2 = {
        x: sortedResults.map(r => r.job_type),
        y: sortedResults.map(r => r.cagr),
        type: 'bar',
        marker: {
            color: sortedResults.map(r => r.cagr >= 0 ? 'lightgreen' : 'lightcoral')
        }
    };
    
    const layout2 = {
        title: 'CAGR Comparison',
        xaxis: { title: 'Job Type', tickangle: -45 },
        yaxis: { title: 'CAGR (%)' },
        showlegend: false
    };
    
    Plotly.newPlot('distributionChart', [trace2], layout2);
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function showLoading() {
    document.getElementById('loadingIndicator').classList.remove('d-none');
    document.getElementById('resultsSection').classList.add('d-none');
}

function hideLoading() {
    document.getElementById('loadingIndicator').classList.add('d-none');
}

function showError(message) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function resetForm() {
    document.getElementById('predictionForm').reset();
    document.getElementById('resultsSection').classList.add('d-none');
    document.getElementById('initialMessage').classList.remove('d-none');
    currentPredictions = [];
    currentJobType = '';
}

function exportResults() {
    if (currentPredictions.length === 0) {
        showError('Tidak ada hasil untuk diexport');
        return;
    }
    
    // Prepare data for export
    const exportData = {
        results: currentPredictions,
        export_date: new Date().toISOString(),
        job_type: currentJobType || 'batch'
    };
    
    // Send to server for Excel export
    fetch('/api/export/results', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Export failed');
        }
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predictions_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Hasil berhasil diexport!');
    })
    .catch(error => {
        showError('Gagal mengexport: ' + error.message);
        console.error('Export error:', error);
    });
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function formatNumber(num) {
    return num.toLocaleString('id-ID');
}

function formatPercent(num, decimals = 2) {
    return num.toFixed(decimals) + '%';
}