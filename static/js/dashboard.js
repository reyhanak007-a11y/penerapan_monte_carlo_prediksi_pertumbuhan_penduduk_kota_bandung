/**
 * Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard data
    loadDashboardData();
    
    // Setup event listeners
    document.getElementById('applyFilter').addEventListener('click', function() {
        loadFilteredData();
    });
});

function loadDashboardData() {
    // Load data summary
    fetch('/api/data/summary')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error loading dashboard data:', data.error);
                return;
            }
            
            // Update stats cards
            updateStatsCards(data);
            
            // Load charts
            loadCharts(data);
            
            // Populate filters
            populateFilters(data);
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
        });
}

function updateStatsCards(data) {
    // Total records
    document.getElementById('totalRecords').textContent = 
        data.total_records.toLocaleString();
    
    // Total job types
    document.getElementById('totalJobs').textContent = 
        data.job_types.length;
    
    // Total population
    document.getElementById('totalPopulation').textContent = 
        data.total_population.toLocaleString();
    
    // Year range
    document.getElementById('yearRange').textContent = 
        `${data.earliest_year}-${data.latest_year}`;
}

function loadCharts(data) {
    // 1. Total Trend Chart
    createTotalTrendChart(data.yearly_totals);
    
    // 2. Job Distribution Chart (latest year)
    createJobDistributionChart(data.top_jobs);
    
    // 3. Top Jobs Chart
    createTopJobsChart(data.top_jobs);
    
    // 4. Growth Chart
    createGrowthChart(data.yearly_totals);
}

function createTotalTrendChart(yearlyTotals) {
    const trace = {
        x: yearlyTotals.map(d => d.tahun),
        y: yearlyTotals.map(d => d.jumlah_penduduk),
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Total Population',
        line: { color: '#4361ee', width: 3 },
        marker: { size: 8 }
    };
    
    const layout = {
        title: 'Total Population Trend',
        xaxis: { title: 'Year' },
        yaxis: { title: 'Population' },
        hovermode: 'closest'
    };
    
    Plotly.newPlot('totalTrendChart', [trace], layout);
}

function createJobDistributionChart(topJobs) {
    const jobNames = topJobs.map(job => job.jenis_pekerjaan);
    const jobValues = topJobs.map(job => job.jumlah_penduduk);
    
    const trace = {
        labels: jobNames,
        values: jobValues,
        type: 'pie',
        hole: 0.4,
        textinfo: 'label+percent',
        hoverinfo: 'label+value+percent',
        marker: {
            colors: ['#4361ee', '#3a0ca3', '#4cc9f0', '#7209b7', '#f72585', 
                    '#4895ef', '#560bad', '#b5179e', '#480ca8', '#3f37c9']
        }
    };
    
    const layout = {
        title: 'Job Distribution (Latest Year)',
        showlegend: false
    };
    
    Plotly.newPlot('jobDistributionChart', [trace], layout);
}

function createTopJobsChart(topJobs) {
    // Sort by population
    const sortedJobs = [...topJobs].sort((a, b) => a.jumlah_penduduk - b.jumlah_penduduk);
    
    const trace = {
        x: sortedJobs.map(job => job.jumlah_penduduk),
        y: sortedJobs.map(job => job.jenis_pekerjaan),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgba(67, 97, 238, 0.6)'
        }
    };
    
    const layout = {
        title: 'Top 10 Jobs by Population',
        xaxis: { title: 'Population' },
        margin: { l: 150 }
    };
    
    Plotly.newPlot('topJobsChart', [trace], layout);
}

function createGrowthChart(yearlyTotals) {
    // Calculate year-over-year growth
    const years = yearlyTotals.map(d => d.tahun);
    const populations = yearlyTotals.map(d => d.jumlah_penduduk);
    
    const growthRates = [];
    for (let i = 1; i < populations.length; i++) {
        const growth = ((populations[i] - populations[i-1]) / populations[i-1]) * 100;
        growthRates.push(growth);
    }
    
    const trace = {
        x: years.slice(1),
        y: growthRates,
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Growth Rate',
        line: { color: '#4cc9f0', width: 3 },
        marker: { size: 8 }
    };
    
    const layout = {
        title: 'Year-over-Year Growth Rate',
        xaxis: { title: 'Year' },
        yaxis: { 
            title: 'Growth Rate (%)',
            ticksuffix: '%'
        },
        hovermode: 'closest'
    };
    
    Plotly.newPlot('growthChart', [trace], layout);
}

function populateFilters(data) {
    const jobFilter = document.getElementById('dashboardJobFilter');
    const yearFilter = document.getElementById('dashboardYearFilter');
    
    // Clear existing options
    jobFilter.innerHTML = '<option value="">Semua</option>';
    yearFilter.innerHTML = '<option value="">Semua</option>';
    
    // Add job options
    data.job_types.forEach(job => {
        const option = document.createElement('option');
        option.value = job;
        option.textContent = job;
        jobFilter.appendChild(option);
    });
    
    // Add year options
    data.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

function loadFilteredData() {
    const jobFilter = document.getElementById('dashboardJobFilter').value;
    const yearFilter = document.getElementById('dashboardYearFilter').value;
    
    // Build query string
    let query = '';
    if (jobFilter) query += `job_type=${jobFilter}`;
    if (yearFilter) {
        if (query) query += '&';
        query += `tahun=${yearFilter}`;
    }
    
    // Load filtered historical data
    fetch(`/api/historical/data?${query}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error loading filtered data:', data.error);
                return;
            }
            
            // Update charts with filtered data
            updateFilteredCharts(data, jobFilter, yearFilter);
        })
        .catch(error => {
            console.error('Error loading filtered data:', error);
        });
}

function updateFilteredCharts(filteredData, jobFilter, yearFilter) {
    // Create a new array from filtered data
    const dataArray = Array.isArray(filteredData) ? filteredData : [filteredData];
    
    if (dataArray.length === 0) {
        console.log('No data found for selected filters');
        return;
    }
    
    // Group by year for trend chart
    const groupedByYear = {};
    dataArray.forEach(item => {
        if (!groupedByYear[item.tahun]) {
            groupedByYear[item.tahun] = 0;
        }
        groupedByYear[item.tahun] += item.jumlah_penduduk;
    });
    
    const yearlyData = Object.keys(groupedByYear).map(year => ({
        tahun: parseInt(year),
        jumlah_penduduk: groupedByYear[year]
    })).sort((a, b) => a.tahun - b.tahun);
    
    // Update trend chart
    if (yearlyData.length > 0) {
        updateTrendChartWithData(yearlyData, jobFilter);
    }
}

function updateTrendChartWithData(yearlyData, jobFilter) {
    const trace = {
        x: yearlyData.map(d => d.tahun),
        y: yearlyData.map(d => d.jumlah_penduduk),
        mode: 'lines+markers',
        type: 'scatter',
        name: jobFilter || 'Total',
        line: { color: '#f72585', width: 3 },
        marker: { size: 8 }
    };
    
    const layout = {
        title: jobFilter ? `Trend for ${jobFilter}` : 'Total Trend',
        xaxis: { title: 'Year' },
        yaxis: { title: 'Population' },
        hovermode: 'closest'
    };
    
    Plotly.newPlot('totalTrendChart', [trace], layout);
}