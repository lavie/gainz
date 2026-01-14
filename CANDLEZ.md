# CANDLEZ – Design Plan + Work Plan

## Design Plan

### Goal
Visualize whether red (down) days have larger daily price movements than green (up) days using a comparative histogram built from `btc-prices.json`.

### Data Definition
- **Source**: `btc-prices.json` (daily closing prices).
- **Daily candle size**: `abs(close[t] - close[t-1])`.
- **Color classification**:
  - **Green day**: `close[t] > close[t-1]`.
  - **Red day**: `close[t] < close[t-1]`.
  - **Flat day**: `close[t] === close[t-1]` (track separately; do not include in either histogram by default).
- **Start date**: `start + 1 day` (because day 0 has no prior close).

### Histogram Strategy
- Use **shared bin edges** so the red/green distributions are directly comparable.
- **Bin count**: start with 40–60 bins; pick 50 by default for a good resolution.
- **Bin range**: from 0 to max candle size across all days.
- **Bin labeling**: show tick labels in USD (e.g., “$0–$250”, “$250–$500”) while keeping the chart scale numeric.

### Visualization
- Single chart with **overlaid histograms**:
  - Green: `rgba(34, 197, 94, 0.45)`
  - Red: `rgba(239, 68, 68, 0.45)`
- Use a **thin outline** for each series to make overlapping regions visible.
- Provide a clear legend and summary stats above the chart:
  - Count of days in each category
  - Mean and median candle size for red/green
  - Optional: 90th percentile for each

### Layout + UX
- New page: `candlez.html`
- Minimal header with a back link to `index.html`.
- Main panel: chart + stats.
- Small footnote explaining that data are **daily closing prices only** (no intraday OHLC), so the “candle size” is **close-to-close movement**.

---

## Work Plan

1) **Add histogram data builder**
   - Create a script (client-side module) that loads `btc-prices.json`, computes daily deltas, splits red/green, and bins into a shared histogram.

2) **Create `candlez.html`**
   - New HTML page that includes a header, summary stats area, and a canvas for the histogram chart.
   - Load Chart.js + the histogram script as ES module.

3) **Implement visualization**
   - Render overlaid histograms with shared bins.
   - Add legend and axis labels (X: candle size in USD, Y: count of days).

4) **Style**
   - Reuse existing CSS where possible; add a small, scoped stylesheet for this page if needed.

5) **Wire navigation**
   - Add a link to `candlez.html` from the main `index.html` (e.g., in header/footer).

6) **Validate**
   - Load `candlez.html` locally and confirm bins, counts, and colors look correct.
   - Spot-check a few sample days to verify red/green classification.
