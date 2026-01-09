// doughnut-chart.js

// Async function to load chart data and render the chart with a dynamic title
async function loadDoughnutChart() {
    try {
        const response = await fetch('/assets/json-data/doughnut-chart-data.json');
        if (!response.ok) {
            var errMsg = String(`Failed to load chart data: ${response.status}`);
            console.log(errMsg);
            throw new Error(errMsg);
        }
        const chartData = await response.json();
        
        // Set the dynamic chart title in the HTML
        document.getElementById('chartTitle').textContent = chartData.title;
        
        // Get the canvas context and render the chart
        const ctx = document.getElementById('myDoughnutChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: chartData.title,  // Using the dynamic title in the chart legend
                    data: chartData.data,
                    backgroundColor: chartData.backgroundColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

// Call the function to load the chart
loadDoughnutChart();
