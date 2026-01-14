// Reusable range selector with mini line chart and draggable handles

export function createRangeSelector({
    chartId,
    selectionId,
    shadeLeftId,
    shadeRightId,
    displayId,
    minLabelId,
    maxLabelId,
    values = [],
    formatRangeLabel,
    formatMinLabel,
    formatMaxLabel,
    onRangeChange,
    lineColor = 'rgba(247, 147, 26, 0.9)',
    fillTop = 'rgba(247, 147, 26, 0.35)',
    fillBottom = 'rgba(247, 147, 26, 0.05)'
}) {
    const chart = document.getElementById(chartId);
    const selection = document.getElementById(selectionId);
    const shadeLeft = document.getElementById(shadeLeftId);
    const shadeRight = document.getElementById(shadeRightId);
    const display = displayId ? document.getElementById(displayId) : null;
    const minLabel = minLabelId ? document.getElementById(minLabelId) : null;
    const maxLabel = maxLabelId ? document.getElementById(maxLabelId) : null;

    const handleLeft = selection ? selection.querySelector('.range-handle.left') : null;
    const handleRight = selection ? selection.querySelector('.range-handle.right') : null;

    let data = values;
    let maxIndex = Math.max(data.length - 1, 0);
    let startIndex = 0;
    let endIndex = maxIndex;

    let activeHandle = null;
    let dragAnchorIndex = 0;
    let dragRangeSize = 0;

    function clampIndex(index) {
        return Math.min(Math.max(index, 0), maxIndex);
    }

    function updateSelectionUI() {
        if (!selection || !shadeLeft || !shadeRight) return;
        const rangeMax = Math.max(maxIndex, 1);
        const startRatio = startIndex / rangeMax;
        const endRatio = endIndex / rangeMax;

        const startPercent = Math.max(0, Math.min(100, startRatio * 100));
        const endPercent = Math.max(0, Math.min(100, endRatio * 100));
        const widthPercent = Math.max(0, endPercent - startPercent);

        selection.style.left = `${startPercent}%`;
        selection.style.width = `${widthPercent}%`;
        shadeLeft.style.width = `${startPercent}%`;
        shadeRight.style.width = `${100 - endPercent}%`;
    }

    function updateLabels() {
        if (display && formatRangeLabel) {
            display.textContent = formatRangeLabel(startIndex, endIndex);
        }
        if (minLabel && formatMinLabel) {
            minLabel.textContent = formatMinLabel();
        }
        if (maxLabel && formatMaxLabel) {
            maxLabel.textContent = formatMaxLabel();
        }
    }

    function updateUI() {
        updateSelectionUI();
        updateLabels();
    }

    function toIndex(clientX) {
        if (!chart) return 0;
        const rect = chart.getBoundingClientRect();
        const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const ratio = rect.width > 0 ? x / rect.width : 0;
        return Math.round(ratio * maxIndex);
    }

    function renderChart() {
        if (!chart) return;
        const ctx = chart.getContext('2d');
        if (!ctx) return;

        const rect = chart.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        chart.width = Math.max(1, Math.floor(rect.width * dpr));
        chart.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!data.length) return;

        const min = Math.min(...data);
        const max = Math.max(...data);
        const padding = 6;
        const width = rect.width;
        const height = rect.height;

        ctx.beginPath();
        data.forEach((value, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * width;
            const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(width, height - padding);
        ctx.lineTo(0, height - padding);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, fillTop);
        gradient.addColorStop(1, fillBottom);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * width;
            const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    }

    function emitRangeChange() {
        if (typeof onRangeChange === 'function') {
            onRangeChange(startIndex, endIndex);
        }
    }

    function setRange(start, end, { emit = true } = {}) {
        startIndex = clampIndex(start);
        endIndex = clampIndex(end);
        if (startIndex > endIndex) {
            [startIndex, endIndex] = [endIndex, startIndex];
        }
        updateUI();
        if (emit) {
            emitRangeChange();
        }
    }

    function attachHandle(handle, name) {
        if (!handle) return;
        handle.addEventListener('pointerdown', (event) => {
            activeHandle = name;
            handle.setPointerCapture(event.pointerId);
            dragRangeSize = endIndex - startIndex;
        });
        handle.addEventListener('pointerup', () => {
            activeHandle = null;
        });
    }

    function moveHandle(index, handle) {
        if (handle === 'range') {
            const clampedStart = Math.min(Math.max(index - dragAnchorIndex, 0), maxIndex - dragRangeSize);
            startIndex = clampedStart;
            endIndex = clampedStart + dragRangeSize;
        } else if (handle === 'left') {
            startIndex = Math.min(index, endIndex);
        } else {
            endIndex = Math.max(index, startIndex);
        }
        updateUI();
        emitRangeChange();
    }

    function bindEvents() {
        attachHandle(handleLeft, 'left');
        attachHandle(handleRight, 'right');

        if (selection) {
            selection.addEventListener('pointerdown', (event) => {
                if (event.target.classList.contains('range-handle')) return;
                activeHandle = 'range';
                selection.setPointerCapture(event.pointerId);
                dragRangeSize = endIndex - startIndex;
                const clickIndex = toIndex(event.clientX);
                dragAnchorIndex = Math.min(Math.max(clickIndex - startIndex, 0), dragRangeSize);
            });
            selection.addEventListener('pointerup', () => {
                activeHandle = null;
            });
        }

        window.addEventListener('pointermove', (event) => {
            if (!activeHandle) return;
            moveHandle(toIndex(event.clientX), activeHandle);
        });

        window.addEventListener('pointerup', () => {
            activeHandle = null;
        });

        if (chart) {
            chart.addEventListener('click', (event) => {
                const index = toIndex(event.clientX);
                const distToStart = Math.abs(index - startIndex);
                const distToEnd = Math.abs(index - endIndex);
                moveHandle(index, distToStart <= distToEnd ? 'left' : 'right');
            });
        }

        window.addEventListener('resize', () => {
            renderChart();
            updateSelectionUI();
        });
    }

    function setValues(nextValues) {
        data = Array.isArray(nextValues) ? nextValues : [];
        maxIndex = Math.max(data.length - 1, 0);
        startIndex = 0;
        endIndex = maxIndex;
        renderChart();
        updateUI();
    }

    setValues(data);
    bindEvents();

    return {
        setRange,
        setValues,
        renderChart,
        getRange: () => ({ startIndex, endIndex })
    };
}
