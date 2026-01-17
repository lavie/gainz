import { loadHistoricalData, calculateDate, parseDate, formatDate } from './data/historicalData.js';
import { createRangeSelector } from './ui/rangeSelector.js';

const UNIT_USD = 'usd';
const UNIT_PERCENT = 'percent';

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

function formatCompactValue(value, unit) {
    if (value == null) return 'n/a';
    return unit === UNIT_PERCENT ? formatCompactPercent(value) : formatCompactUSD(value);
}

function getWeekStart(date) {
    const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = weekStart.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setUTCDate(weekStart.getUTCDate() + diff);
    return formatDate(weekStart);
}

function computeWeeklyAverages(prices, startDate, unit, startIndex, endIndex) {
    const start = Math.max(0, startIndex ?? 0);
    const end = Math.min(prices.length - 1, endIndex ?? prices.length - 1);
    const weekly = new Map();

    for (let i = Math.max(1, start + 1); i <= end; i += 1) {
        const prev = prices[i - 1];
        const curr = prices[i];
        const delta = Math.abs(curr - prev);

        if (unit === UNIT_PERCENT && prev === 0) {
            continue;
        }

        const value = unit === UNIT_PERCENT ? (delta / prev) * 100 : delta;
        const date = parseDate(calculateDate(startDate, i));
        const day = date.getUTCDay();
        const weekKey = getWeekStart(date);

        if (!weekly.has(weekKey)) {
            weekly.set(weekKey, {
                weekStart: weekKey,
                weekdaySum: 0,
                weekdayCount: 0,
                weekendSum: 0,
                weekendCount: 0
            });
        }

        const entry = weekly.get(weekKey);
        if (day === 0 || day === 6) {
            entry.weekendSum += value;
            entry.weekendCount += 1;
        } else {
            entry.weekdaySum += value;
            entry.weekdayCount += 1;
        }
    }

    return Array.from(weekly.values()).sort((a, b) => parseDate(a.weekStart) - parseDate(b.weekStart));
}

function buildSeries(weeklyData) {
    const labels = [];
    const weekdayValues = [];
    const weekendValues = [];
    const weekdayCounts = [];
    const weekendCounts = [];

    for (const week of weeklyData) {
        labels.push(week.weekStart);
        weekdayValues.push(week.weekdayCount ? week.weekdaySum / week.weekdayCount : null);
        weekendValues.push(week.weekendCount ? week.weekendSum / week.weekendCount : null);
        weekdayCounts.push(week.weekdayCount);
        weekendCounts.push(week.weekendCount);
    }

    return { labels, weekdayValues, weekendValues, weekdayCounts, weekendCounts };
}

function getPositiveMin(values) {
    const positive = values.filter((value) => typeof value === 'number' && value > 0);
    return positive.length ? Math.min(...positive) : null;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function renderChart(series, unit) {
    const canvas = document.getElementById('weekmove-chart');
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const { labels, weekdayValues, weekendValues, weekdayCounts, weekendCounts } = series;
    const minValue = getPositiveMin([...weekdayValues, ...weekendValues]);
    const logMin = unit === UNIT_PERCENT ? 0.01 : 1;
    const yMin = currentScale === 'logarithmic'
        ? Math.max(minValue ? minValue * 0.8 : logMin, logMin)
        : 0;

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Weekdays (Mon–Fri)',
                    data: weekdayValues,
                    backgroundColor: 'rgba(56, 189, 248, 0.25)',
                    borderColor: 'rgba(56, 189, 248, 0.9)',
                    borderWidth: 1,
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    spanGaps: true,
                    _counts: weekdayCounts
                },
                {
                    label: 'Weekends (Sat–Sun)',
                    data: weekendValues,
                    backgroundColor: 'rgba(249, 115, 22, 0.25)',
                    borderColor: 'rgba(249, 115, 22, 0.9)',
                    borderWidth: 1,
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    spanGaps: true,
                    _counts: weekendCounts
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
                        title: (items) => (items.length ? `Week of ${items[0].label}` : ''),
                        label: (context) => {
                            const count = context.dataset._counts ? context.dataset._counts[context.dataIndex] : null;
                            const valueLabel = formatCompactValue(context.raw, unit);
                            if (count == null) {
                                return `${context.dataset.label}: ${valueLabel}`;
                            }
                            return `${context.dataset.label}: ${valueLabel} (${count} day${count === 1 ? '' : 's'})`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: currentScale,
                    min: yMin,
                    ticks: {
                        color: '#9ca3af',
                        callback: (value) => {
                            if (currentScale === 'logarithmic') {
                                const log10 = Math.log10(value);
                                return Number.isInteger(log10) ? value : '';
                            }
                            return value;
                        }
                    },
                    grid: {
                        color: 'rgba(68, 68, 68, 0.4)'
                    },
                    title: {
                        display: true,
                        text: unit === UNIT_PERCENT ? 'Average Daily Move (%)' : 'Average Daily Move (USD)',
                        color: '#cccccc'
                    }
                },
                x: {
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
                        text: 'Week start (Monday)',
                        color: '#cccccc'
                    }
                }
            }
        }
    });
}

function updateToggleButtons(activeUnit) {
    document.querySelectorAll('.toggle-btn[data-unit]').forEach((button) => {
        const isActive = button.dataset.unit === activeUnit;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive.toString());
    });
}

function updateScaleButtons(activeScale) {
    document.querySelectorAll('.toggle-btn[data-scale]').forEach((button) => {
        const isActive = button.dataset.scale === activeScale;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive.toString());
    });
}

const rangeState = {
    startIndex: 0,
    endIndex: 0
};

let rangeSelector = null;
let cachedData = null;
let currentUnit = UNIT_PERCENT;
let currentScale = 'logarithmic';
let weekChart = null;

function renderForUnit(unit) {
    if (!cachedData) return;

    const weeklyData = computeWeeklyAverages(
        cachedData.prices,
        cachedData.start,
        unit,
        rangeState.startIndex,
        rangeState.endIndex
    );
    const series = buildSeries(weeklyData);

    if (weekChart) {
        weekChart.destroy();
    }
    weekChart = renderChart(series, unit);
    updateToggleButtons(unit);
    updateScaleButtons(currentScale);
}

async function initWeekmove() {
    try {
        cachedData = await loadHistoricalData();

        document.querySelectorAll('.toggle-btn').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.unit) {
                    currentUnit = button.dataset.unit === UNIT_PERCENT ? UNIT_PERCENT : UNIT_USD;
                }
                if (button.dataset.scale) {
                    currentScale = button.dataset.scale === 'linear' ? 'linear' : 'logarithmic';
                }
                renderForUnit(currentUnit);
            });
        });

        updateToggleButtons(currentUnit);
        updateScaleButtons(currentScale);

        rangeSelector = createRangeSelector({
            chartId: 'weekmove-range-chart',
            selectionId: 'weekmove-range-selection',
            shadeLeftId: 'weekmove-range-shade-left',
            shadeRightId: 'weekmove-range-shade-right',
            displayId: 'weekmove-range-display',
            minLabelId: 'weekmove-range-min',
            maxLabelId: 'weekmove-range-max',
            values: cachedData.prices,
            formatRangeLabel: (startIndex, endIndex) => {
                const startDate = calculateDate(cachedData.start, startIndex);
                const endDate = calculateDate(cachedData.start, endIndex);
                return `${startDate} → ${endDate}`;
            },
            formatMinLabel: () => cachedData.start,
            formatMaxLabel: () => calculateDate(cachedData.start, cachedData.prices.length - 1),
            onRangeChange: (startIndex, endIndex) => {
                rangeState.startIndex = startIndex;
                rangeState.endIndex = endIndex;
                renderForUnit(currentUnit);
            },
            lineColor: 'rgba(56, 189, 248, 0.9)',
            fillTop: 'rgba(56, 189, 248, 0.25)',
            fillBottom: 'rgba(56, 189, 248, 0.02)'
        });

        if (rangeSelector) {
            const initialRange = rangeSelector.getRange();
            rangeState.startIndex = initialRange.startIndex;
            rangeState.endIndex = initialRange.endIndex;
        }

        renderForUnit(currentUnit);
    } catch (error) {
        console.error('Failed to initialize weekmove chart:', error);
        setText('weekmove-status', 'Failed to load data. Check the console for details.');
    }
}

initWeekmove();
