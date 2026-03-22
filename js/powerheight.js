import { createRangeSelector } from './ui/rangeSelector.js';
import {
    formatDate,
    getPriceRange,
    loadHistoricalData,
    parseDate
} from './data/historicalData.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_START = parseDate('2011-01-01');
const POWER_LAW_ORIGIN = parseDate('2009-01-01');
const FALLBACK_HEIGHT_ANCHOR = parseDate('2024-04-20');
const FALLBACK_HEIGHT_VALUE = 840000;
const PROJECTED_BLOCKS_PER_DAY = 144;
const SUPPORT_K = 3.4186699220706843e-18;
const SUPPORT_B = 5.845159623795625;

const HEIGHT_ANCHORS = [
    { date: parseDate('2009-01-03'), height: 0 },
    { date: parseDate('2012-11-28'), height: 210000 },
    { date: parseDate('2016-07-09'), height: 420000 },
    { date: parseDate('2020-05-11'), height: 630000 },
    { date: FALLBACK_HEIGHT_ANCHOR, height: FALLBACK_HEIGHT_VALUE }
];

let chart = null;
let rangeSelector = null;
let series = [];
let currentSnapshot = null;

function daysBetween(start, end) {
    return Math.floor((Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate()
    ) - Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate()
    )) / DAY_MS);
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function getDayIndex(date) {
    return daysBetween(POWER_LAW_ORIGIN, date) + 1;
}

function getSupportPrice(date) {
    return SUPPORT_K * Math.pow(getDayIndex(date), SUPPORT_B);
}

function getFallbackCurrentHeight(currentDate) {
    return FALLBACK_HEIGHT_VALUE + (daysBetween(FALLBACK_HEIGHT_ANCHOR, currentDate) * PROJECTED_BLOCKS_PER_DAY);
}

async function fetchCurrentHeight() {
    const response = await fetch('https://blockstream.info/api/blocks/tip/height');
    if (!response.ok) {
        throw new Error(`Failed to fetch current block height: ${response.status}`);
    }
    const text = await response.text();
    const height = Number.parseInt(text, 10);
    if (!Number.isFinite(height)) {
        throw new Error('Current block height response was not numeric');
    }
    return height;
}

function buildHeightAnchors(currentDate, currentHeight) {
    const anchors = [...HEIGHT_ANCHORS];
    const tipDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
    ));

    if (tipDate > anchors[anchors.length - 1].date) {
        anchors.push({ date: tipDate, height: currentHeight });
    } else {
        anchors[anchors.length - 1] = { date: tipDate, height: currentHeight };
    }

    return anchors;
}

function interpolateHistoricalHeight(date, anchors) {
    for (let i = 0; i < anchors.length - 1; i += 1) {
        const left = anchors[i];
        const right = anchors[i + 1];
        if (date >= left.date && date <= right.date) {
            const totalDays = Math.max(daysBetween(left.date, right.date), 1);
            const elapsedDays = daysBetween(left.date, date);
            const ratio = elapsedDays / totalDays;
            return left.height + ((right.height - left.height) * ratio);
        }
    }

    return anchors[anchors.length - 1].height;
}

function getProjectedHeight(date, currentDate, currentHeight) {
    return currentHeight + (daysBetween(currentDate, date) * PROJECTED_BLOCKS_PER_DAY);
}

function findCrossover(currentDate, currentHeight, maxDaysAhead = 8000) {
    let previousDate = currentDate;
    let previousSupport = getSupportPrice(currentDate);
    let previousHeight = currentHeight;
    let previousGap = previousSupport - previousHeight;

    for (let offset = 1; offset <= maxDaysAhead; offset += 1) {
        const date = addDays(currentDate, offset);
        const support = getSupportPrice(date);
        const height = getProjectedHeight(date, currentDate, currentHeight);
        const gap = support - height;

        if (gap >= 0) {
            const span = previousGap === gap ? 1 : previousGap / (previousGap - gap);
            const crossoverDate = new Date(previousDate.getTime() + (DAY_MS * Math.max(0, Math.min(span, 1))));
            const crossoverValue = previousSupport + ((support - previousSupport) * Math.max(0, Math.min(span, 1)));

            return {
                date: crossoverDate,
                value: crossoverValue
            };
        }

        previousDate = date;
        previousSupport = support;
        previousHeight = height;
        previousGap = gap;
    }

    return null;
}

function buildActualPriceMap(historicalData, currentDate) {
    if (!historicalData) {
        return new Map();
    }

    const priceRange = getPriceRange(historicalData, formatDate(CHART_START), formatDate(currentDate));
    const mondayPrices = priceRange.filter((point) => parseDate(point.date).getUTCDay() === 1);
    return new Map(mondayPrices.map((point) => [point.date, point.price]));
}

function buildSeries(currentDate, currentHeight, historicalData = null) {
    const anchors = buildHeightAnchors(currentDate, currentHeight);
    const crossover = findCrossover(currentDate, currentHeight);
    const actualPriceByDate = buildActualPriceMap(historicalData, currentDate);
    const postCrossoverDays = crossover
        ? Math.max(daysBetween(CHART_START, crossover.date), 365)
        : 3650;
    const endDate = crossover
        ? addDays(crossover.date, postCrossoverDays)
        : addDays(currentDate, 3650);
    const points = [];

    for (let date = new Date(CHART_START); date <= endDate; date = addDays(date, 1)) {
        const support = getSupportPrice(date);
        const blockHeight = date <= currentDate
            ? interpolateHistoricalHeight(date, anchors)
            : getProjectedHeight(date, currentDate, currentHeight);

        points.push({
            date: new Date(date),
            actualPrice: actualPriceByDate.get(formatDate(date)) ?? null,
            support,
            blockHeight,
            isProjected: date > currentDate
        });
    }

    return {
        points,
        crossover
    };
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value >= 1000 ? 0 : 2
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0
    }).format(value);
}

function formatSignedNumber(value) {
    const rounded = Math.round(value);
    const sign = rounded >= 0 ? '+' : '';
    return `${sign}${formatNumber(rounded)}`;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function renderStats(snapshot) {
    const supportToday = getSupportPrice(snapshot.currentDate);
    const gapToday = supportToday - snapshot.currentHeight;

    setText('powerheight-support-today', formatCurrency(supportToday));
    setText('powerheight-height-today', formatNumber(snapshot.currentHeight));
    setText('powerheight-gap-today', formatSignedNumber(gapToday));
    setText('powerheight-cross-date', snapshot.crossover ? formatDate(snapshot.crossover.date) : 'Not found');
    setText('powerheight-cross-value', snapshot.crossover ? formatNumber(snapshot.crossover.value) : '--');
}

function buildDatasets(points, crossover) {
    const actualPricePoints = points.map((point) => ({
        x: point.date,
        y: point.actualPrice
    }));
    const supportPoints = points.map((point) => ({ x: point.date, y: point.support }));
    const lastHistoricalIndex = points.findLastIndex((point) => !point.isProjected);
    const historyPoints = points.map((point) => ({
        x: point.date,
        y: point.isProjected ? null : point.blockHeight
    }));
    const projectedPoints = points.map((point, index) => ({
        x: point.date,
        y: index >= lastHistoricalIndex ? point.blockHeight : null
    }));

    const datasets = [
        {
            label: 'Price (actual)',
            data: actualPricePoints,
            borderColor: 'rgba(226, 232, 240, 0.95)',
            backgroundColor: 'rgba(226, 232, 240, 0.08)',
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0,
            spanGaps: true
        },
        {
            label: 'Price (power law)',
            data: supportPoints,
            borderColor: 'rgba(239, 68, 68, 0.95)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0
        },
        {
            label: 'Block height (historical)',
            data: historyPoints,
            borderColor: 'rgba(56, 189, 248, 0.95)',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0
        },
        {
            label: 'Block height (projected)',
            data: projectedPoints,
            borderColor: 'rgba(56, 189, 248, 0.75)',
            borderDash: [7, 5],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0
        }
    ];

    if (crossover) {
        datasets.push({
            label: 'Crossover',
            type: 'scatter',
            data: [{ x: crossover.date, y: crossover.value }],
            pointRadius: 5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f7931a',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
        });
    }

    return datasets;
}

function renderChart(snapshot) {
    const canvas = document.getElementById('powerheight-chart');
    if (!canvas) return;

    const datasets = buildDatasets(snapshot.points, snapshot.crossover);
    const compactLayout = window.innerWidth <= 600;

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: compactLayout ? 'bottom' : 'top',
                    labels: {
                        color: '#cccccc',
                        boxWidth: compactLayout ? 18 : 32,
                        font: {
                            size: compactLayout ? 10 : 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.92)',
                    borderColor: '#f7931a',
                    borderWidth: 1,
                    callbacks: {
                        title: (items) => items.length ? formatDate(new Date(items[0].parsed.x)) : '',
                        label: (context) => {
                            if (context.dataset.label.startsWith('Price')) {
                                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                            }
                            return `${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'year',
                        displayFormats: {
                            year: 'yyyy'
                        }
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxTicksLimit: compactLayout ? 5 : 8
                    },
                    grid: {
                        color: 'rgba(68, 68, 68, 0.35)'
                    }
                },
                y: {
                    type: 'logarithmic',
                    ticks: {
                        color: '#9ca3af',
                        callback: (value) => {
                            const log10 = Math.log10(value);
                            return Number.isInteger(log10) ? formatNumber(value) : '';
                        }
                    },
                    grid: {
                        color: 'rgba(68, 68, 68, 0.35)'
                    }
                }
            }
        }
    });
}

function updateVisibleRange(startIndex, endIndex) {
    if (!chart || !series.length) return;
    const startPoint = series[startIndex];
    const endPoint = series[endIndex];
    chart.options.scales.x.min = startPoint.date;
    chart.options.scales.x.max = endPoint.date;
    chart.update('none');
}

function initRangeSelector(snapshot) {
    const values = snapshot.points.map((point) => point.support);

    rangeSelector = createRangeSelector({
        chartId: 'powerheight-range-chart',
        selectionId: 'powerheight-range-selection',
        shadeLeftId: 'powerheight-range-shade-left',
        shadeRightId: 'powerheight-range-shade-right',
        displayId: 'powerheight-range-display',
        minLabelId: 'powerheight-range-min',
        maxLabelId: 'powerheight-range-max',
        values,
        formatRangeLabel: (startIndex, endIndex) => `${formatDate(snapshot.points[startIndex].date)} → ${formatDate(snapshot.points[endIndex].date)}`,
        formatMinLabel: () => formatDate(snapshot.points[0].date),
        formatMaxLabel: () => formatDate(snapshot.points[snapshot.points.length - 1].date),
        onRangeChange: updateVisibleRange,
        lineColor: 'rgba(239, 68, 68, 0.9)',
        fillTop: 'rgba(239, 68, 68, 0.25)',
        fillBottom: 'rgba(239, 68, 68, 0.03)'
    });
}

async function initPowerHeight() {
    const currentDate = new Date();
    const currentDateUtc = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
    ));

    let currentHeight = getFallbackCurrentHeight(currentDateUtc);
    let historicalData = null;
    let usingFallbackHeight = false;
    let missingHistoricalData = false;
    const statusMessages = [];

    try {
        currentHeight = await fetchCurrentHeight();
    } catch (error) {
        usingFallbackHeight = true;
        console.error('Falling back to estimated tip height:', error);
    }

    try {
        historicalData = await loadHistoricalData();
    } catch (error) {
        missingHistoricalData = true;
        console.error('Failed to load historical price data:', error);
    }

    const snapshot = {
        currentDate: currentDateUtc,
        currentHeight,
        ...buildSeries(currentDateUtc, currentHeight, historicalData)
    };

    series = snapshot.points;
    currentSnapshot = snapshot;

    renderChart(snapshot);
    renderStats(snapshot);
    initRangeSelector(snapshot);

    if (rangeSelector) {
        const initialRange = rangeSelector.getRange();
        updateVisibleRange(initialRange.startIndex, initialRange.endIndex);
    }

    if (usingFallbackHeight) {
        statusMessages.push('Live tip height fetch failed, using a fallback height estimate from the 2024 halving anchor.');
    }

    if (missingHistoricalData) {
        statusMessages.push('Historical BTC price data failed to load, so the actual-price line is unavailable.');
    }

    if (statusMessages.length) {
        setText('powerheight-status', statusMessages.join(' '));
    }
}

initPowerHeight().catch((error) => {
    console.error('Failed to initialize PowerHeight:', error);
    setText('powerheight-status', 'Failed to render the PowerHeight chart. Check the console for details.');
});
