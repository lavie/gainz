// Chart service for Bitcoin price visualization
let chartInstance = null;
let currentScale = 'linear';

function isPowerOfTen(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return false;
    }
    const log10 = Math.log10(value);
    return Math.abs(log10 - Math.round(log10)) < 1e-9;
}

function formatAxisValue(value) {
    return '$' + Number(value).toLocaleString();
}

function getPositiveMin(values) {
    const positiveValues = values.filter((value) => typeof value === 'number' && value > 0);
    return positiveValues.length ? Math.min(...positiveValues) : null;
}

function applyScaleConfig(values = []) {
    if (!chartInstance) {
        return;
    }

    const yScale = chartInstance.options.scales.y;
    const y1Scale = chartInstance.options.scales.y1;
    const positiveMin = getPositiveMin(values);
    const resolvedScale = currentScale === 'logarithmic' && positiveMin !== null
        ? 'logarithmic'
        : 'linear';

    yScale.type = resolvedScale;
    y1Scale.type = resolvedScale;

    yScale.ticks.callback = (value) => {
        if (resolvedScale === 'logarithmic') {
            return isPowerOfTen(value) ? formatAxisValue(value) : '';
        }
        return formatAxisValue(value);
    };
    y1Scale.ticks.callback = yScale.ticks.callback;

    if (resolvedScale === 'logarithmic') {
        const minValue = Math.pow(10, Math.floor(Math.log10(positiveMin)));
        yScale.min = minValue;
        y1Scale.min = minValue;
    } else {
        delete yScale.min;
        delete y1Scale.min;
    }
}

/**
 * Initialize the Bitcoin price chart
 * @param {string} canvasId - ID of the canvas element
 * @returns {Chart} Chart.js instance
 */
export function initChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    // Destroy existing chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value (USD)',
                data: [],
                borderColor: '#f7931a', // Bitcoin orange
                backgroundColor: 'rgba(247, 147, 26, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#f7931a',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            day: 'MMM dd',
                            week: 'MMM dd',
                            month: 'MMM yyyy',
                            quarter: 'MMM yyyy',
                            year: 'yyyy'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#cccccc',
                        maxTicksLimit: 6,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    type: currentScale,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#cccccc',
                        maxTicksLimit: 8,
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return formatAxisValue(value);
                        }
                    }
                },
                y1: {
                    type: currentScale,
                    position: 'right',
                    grid: {
                        display: false, // Don't show grid lines from right axis to avoid duplication
                        drawBorder: false
                    },
                    ticks: {
                        color: '#cccccc',
                        maxTicksLimit: 8,
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return formatAxisValue(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(45, 45, 45, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#f7931a',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: context[0].parsed.x % (24 * 60 * 60 * 1000) !== 0 ? 'numeric' : undefined,
                                minute: context[0].parsed.x % (24 * 60 * 60 * 1000) !== 0 ? '2-digit' : undefined
                            });
                        },
                        label: function(context) {
                            const portfolioValue = context.parsed.y;
                            return `Portfolio Value: $${portfolioValue.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}`;
                        },
                        afterLabel: function(context) {
                            // Calculate BTC price from portfolio value
                            const portfolioValue = context.parsed.y;
                            const btcAmount = context.dataset.btcAmount || 1;
                            const btcPrice = portfolioValue / btcAmount;
                            return [
                                `BTC Amount: ${btcAmount.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 8
                                })} BTC`,
                                `BTC Price: $${btcPrice.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                })}`
                            ];
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });

    return chartInstance;
}

/**
 * Update chart with new data
 * @param {Array} priceData - Array of {date, price} objects
 * @param {number} btcAmount - Amount of BTC in portfolio
 * @param {string} timeWindow - Current time window for styling
 */
export function updateChart(priceData, btcAmount = 1, timeWindow = 'all') {
    if (!chartInstance) {
        throw new Error('Chart not initialized. Call initChart() first.');
    }

    if (!priceData || priceData.length === 0) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets[0].data = [];
        chartInstance.update('none');
        return;
    }

    // Sort data by date to ensure proper ordering
    const sortedData = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Format data for Chart.js - calculate portfolio values
    const labels = sortedData.map(item => new Date(item.date));
    const portfolioValues = sortedData.map(item => item.price * btcAmount);

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = portfolioValues;
    applyScaleConfig(portfolioValues);
    
    // Store BTC amount in dataset for tooltip calculations
    chartInstance.data.datasets[0].btcAmount = btcAmount;

    // Update time display format based on time window
    updateTimeFormat(timeWindow);

    // Update chart without animation
    chartInstance.update('none');
    
    // Sync the y-axes after update
    if (chartInstance.scales.y && chartInstance.scales.y1) {
        const leftScale = chartInstance.scales.y;
        const rightScale = chartInstance.scales.y1;
        
        // Force the right axis to match the left axis scale
        chartInstance.options.scales.y1.min = leftScale.min;
        chartInstance.options.scales.y1.max = leftScale.max;
        
        // Update again to apply the synchronized scale
        chartInstance.update('none');
    }
}

/**
 * Update time format based on time window
 * @param {string} timeWindow - Current time window
 */
function updateTimeFormat(timeWindow) {
    if (!chartInstance) return;

    const timeConfig = chartInstance.options.scales.x.time;
    
    switch (timeWindow) {
        case '1d':
            timeConfig.unit = 'hour';
            timeConfig.displayFormats = { hour: 'HH:mm' };
            chartInstance.options.scales.x.ticks.maxTicksLimit = 8;
            break;
        case '7d':
        case '30d':
            timeConfig.unit = 'day';
            timeConfig.displayFormats = { day: 'MMM dd' };
            chartInstance.options.scales.x.ticks.maxTicksLimit = 7;
            break;
        case '3mo':
        case '6mo':
            timeConfig.unit = 'week';
            timeConfig.displayFormats = { week: 'MMM dd' };
            chartInstance.options.scales.x.ticks.maxTicksLimit = 8;
            break;
        case '1y':
        case '5y':
            timeConfig.unit = 'month';
            timeConfig.displayFormats = { month: 'MMM yyyy' };
            chartInstance.options.scales.x.ticks.maxTicksLimit = 6;
            break;
        case '10y':
        case 'all':
        default:
            timeConfig.unit = 'year';
            timeConfig.displayFormats = { year: 'yyyy' };
            chartInstance.options.scales.x.ticks.maxTicksLimit = 5;
            break;
    }
}

/**
 * Get chart instance for external access
 * @returns {Chart|null} Current chart instance
 */
export function getChart() {
    return chartInstance;
}

export function setChartScale(scale) {
    currentScale = scale === 'logarithmic' ? 'logarithmic' : 'linear';

    if (!chartInstance) {
        return;
    }

    const values = chartInstance.data.datasets[0]?.data || [];
    applyScaleConfig(values);
    chartInstance.update('none');
}

/**
 * Destroy chart instance
 */
export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

/**
 * Resize chart (useful for responsive layouts)
 */
export function resizeChart() {
    if (chartInstance) {
        chartInstance.resize();
    }
}
