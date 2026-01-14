import { loadHistoricalData, calculateDate } from './data/historicalData.js';

const BIN_COUNT = 20;
const UNIT_USD = 'usd';
const UNIT_PERCENT = 'percent';

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

function formatUSD(value) {
    return formatter.format(value);
}

function formatPercent(value) {
    return `${value.toFixed(2)}%`;
}

function formatCompactUSD(value) {
    const absValue = Math.abs(value);
    const maxFractionDigits = absValue >= 1000 ? 0 : absValue >= 100 ? 0 : absValue >= 10 ? 1 : 2;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: maxFractionDigits
    }).format(value);
}

function formatCompactPercent(value) {
    const absValue = Math.abs(value);
    const maxFractionDigits = absValue >= 10 ? 0 : absValue >= 1 ? 1 : 2;
    return `${value.toFixed(maxFractionDigits)}%`;
}

function computeCandleSizes(prices, unit) {
    const red = [];
    const green = [];
    let flat = 0;

    for (let i = 1; i < prices.length; i += 1) {
        const prev = prices[i - 1];
        const curr = prices[i];
        if (curr === prev) {
            flat += 1;
            continue;
        }

        const delta = Math.abs(curr - prev);
        if (unit === UNIT_PERCENT && prev === 0) {
            flat += 1;
            continue;
        }
        const value = unit === UNIT_PERCENT
            ? (delta / prev) * 100
            : delta;

        if (curr > prev) {
            green.push(value);
        } else {
            red.push(value);
        }
    }

    return { red, green, flat };
}

function computeStats(values) {
    if (!values.length) {
        return { count: 0, mean: 0, median: 0, p90: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
    const median = count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];
    const p90Index = Math.floor(0.9 * (count - 1));
    const p90 = sorted[p90Index];

    return { count, mean, median, p90 };
}

function buildLogHistogram(values, binCount) {
    const positiveValues = values.filter((value) => value > 0);
    if (!positiveValues.length) {
        return {
            binEdges: [1, 10],
            counts: [0]
        };
    }

    const minValue = Math.min(...positiveValues);
    const maxValue = Math.max(...positiveValues);
    const safeMax = maxValue === minValue ? maxValue * 1.1 : maxValue;
    const logMin = Math.log(minValue);
    const logMax = Math.log(safeMax);
    const step = (logMax - logMin) / binCount;

    const binEdges = new Array(binCount + 1).fill(0).map((_, i) => Math.exp(logMin + step * i));
    const counts = new Array(binCount).fill(0);

    for (const value of positiveValues) {
        const index = Math.min(Math.floor((Math.log(value) - logMin) / step), binCount - 1);
        counts[index] += 1;
    }

    return { binEdges, counts };
}

function buildBinLabels(binEdges, unit) {
    return binEdges.slice(0, -1).map((edge, index) => {
        const next = binEdges[index + 1];
        if (unit === UNIT_PERCENT) {
            return `${formatCompactPercent(edge)}–${formatCompactPercent(next)}`;
        }
        return `${formatCompactUSD(edge)}–${formatCompactUSD(next)}`;
    });
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function renderChart(labels, redCounts, greenCounts, unit) {
    const canvas = document.getElementById('candlez-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Red days (down)',
                    data: redCounts,
                    backgroundColor: 'rgba(239, 68, 68, 0.45)',
                    borderColor: 'rgba(239, 68, 68, 0.9)',
                    borderWidth: 1
                },
                {
                    label: 'Green days (up)',
                    data: greenCounts,
                    backgroundColor: 'rgba(34, 197, 94, 0.45)',
                    borderColor: 'rgba(34, 197, 94, 0.9)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#cccccc'
                    }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => items.length ? items[0].label : ''
                    }
                }
            },
            scales: {
                y: {
                    type: 'logarithmic',
                    min: 1,
                    ticks: {
                        color: '#9ca3af',
                        callback: (value) => Number.isInteger(value) ? value : ''
                    },
                    grid: {
                        color: 'rgba(68, 68, 68, 0.4)'
                    },
                    title: {
                        display: true,
                        text: 'Number of Days',
                        color: '#cccccc'
                    }
                },
                x: {
                    stacked: false,
                    ticks: {
                        color: '#9ca3af',
                        maxRotation: 60,
                        minRotation: 60,
                        autoSkip: false,
                        font: {
                            size: 10
                        },
                        callback: (value, index) => {
                            const skipEvery = Math.ceil(labels.length / 10);
                            return index % skipEvery === 0 ? labels[index] : '';
                        }
                    },
                    grid: {
                        color: 'rgba(68, 68, 68, 0.4)'
                    },
                    title: {
                        display: true,
                        text: unit === UNIT_PERCENT ? 'Daily Move (%)' : 'Daily Move (USD)',
                        color: '#cccccc'
                    }
                }
            }
        }
    });
}

function updateToggleButtons(activeUnit) {
    document.querySelectorAll('.toggle-btn').forEach((button) => {
        const isActive = button.dataset.unit === activeUnit;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive.toString());
    });
}

let candleChart = null;
let cachedData = null;

function formatStatsValue(value, unit) {
    return unit === UNIT_PERCENT ? formatPercent(value) : formatUSD(value);
}

function renderForUnit(unit) {
    if (!cachedData) return;

    const { red, green, flat } = computeCandleSizes(cachedData.prices, unit);
    const { binEdges, counts: redCounts } = buildLogHistogram(red, BIN_COUNT);
    const { counts: greenCounts } = buildLogHistogram(green, BIN_COUNT);
    const labels = buildBinLabels(binEdges, unit);

    const redStats = computeStats(red);
    const greenStats = computeStats(green);

    setText('red-count', redStats.count.toLocaleString());
    setText('green-count', greenStats.count.toLocaleString());
    setText('flat-count', flat.toLocaleString());
    setText('flat-definition', unit === UNIT_PERCENT ? 'Close = Close or prev = 0' : 'Close = Close');

    setText('red-mean', formatStatsValue(redStats.mean, unit));
    setText('green-mean', formatStatsValue(greenStats.mean, unit));
    setText('red-median', formatStatsValue(redStats.median, unit));
    setText('green-median', formatStatsValue(greenStats.median, unit));
    setText('red-p90', formatStatsValue(redStats.p90, unit));
    setText('green-p90', formatStatsValue(greenStats.p90, unit));

    if (candleChart) {
        candleChart.destroy();
    }
    candleChart = renderChart(labels, redCounts, greenCounts, unit);
    updateToggleButtons(unit);
}

async function initCandlez() {
    try {
        cachedData = await loadHistoricalData();
        setText('data-range', `${cachedData.start} → ${calculateDate(cachedData.start, cachedData.prices.length - 1)}`);

        document.querySelectorAll('.toggle-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const unit = button.dataset.unit === UNIT_PERCENT ? UNIT_PERCENT : UNIT_USD;
                renderForUnit(unit);
            });
        });

        renderForUnit(UNIT_USD);
    } catch (error) {
        console.error('Failed to initialize candle histogram:', error);
        setText('candlez-status', 'Failed to load data. Check the console for details.');
    }
}

initCandlez();
