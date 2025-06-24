# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-page HTML Bitcoin portfolio visualizer that tracks BTC value over time. The project displays portfolio worth in USD using historical Bitcoin price data with configurable time windows and BTC amounts.

## Key Features

- Single-page HTML application (no build system required)
- Dark mode default with bitcoin-orange chart lines
- Configurable BTC amount via URL parameters
- Time window selection: 1d, 7d, 30d, 3mo, 6mo, 1Y, 5Y, ALL
- Displays: Total % gained, Total USD gained, CAGR
- Phase 1: Simple portfolio tracking from first historical date
- Phase 2: Trade tracking with buy/sell dates for accurate gain calculations

## Development Setup

This is a static HTML project with no build system or dependencies. Simply open the HTML file in a browser to develop and test.

## Project Structure

Currently only contains README.md - the actual implementation files need to be created as a single HTML file with embedded CSS and JavaScript.

## Implementation Notes

- Use historical Bitcoin price data (daily closing prices minimum)
- All calculations based on BTCUSD closing prices
- URL parameter parsing for BTC amount configuration
- Responsive design for various screen sizes
- No backend required - all data fetching should be client-side

## Data Strategy Decisions

### Historical Price Data
- **Static JSON file**: `btc-prices.json` with bulk historical data (2014-present)
- **Optimized format**: `{"start": "2014-09-17", "prices": [465.86, 457.33, ...]}` 
- **Date calculation**: `new Date(start).setDate(start.getDate() + index)`
- **GitHub Actions**: Daily workflow updates JSON file automatically
- **Size**: ~22KB total for 10+ years of daily prices (75% reduction vs date strings)

### Current Price Caching
- **localStorage**: Cache current price with timestamp
- **Rate limiting**: Never fetch more than once per minute
- **Key**: `btc_current_price` with `{price: number, timestamp: number}`
- **Fallback**: Use latest historical price if current fetch fails

### API Choice
- **Primary**: CoinGecko API (free, no auth, CORS-friendly)
- **Historical endpoint**: `/coins/bitcoin/market_chart?vs_currency=usd&days=max`
- **Current endpoint**: `/simple/price?ids=bitcoin&vs_currencies=usd`

## Implementation Plan

**IMPORTANT**: This implementation should happen step by step with careful review and testing of each phase before continuing to the next. Each phase builds on the previous one and should be fully functional before proceeding.

### Phase 1: Project Foundation & Basic Data Fetching
**Files to create**: `index.html`, `js/app.js`, `js/data/priceService.js`, `css/style.css`

1.1. **Create basic HTML structure** (`index.html`)
   - Simple HTML5 document with dark theme styling
   - Placeholder divs for current price and BTC amount display
   - Include ES6 module script tags

1.2. **Implement current price fetching** (`js/data/priceService.js`)
   - Function to fetch current BTC price from CoinGecko API
   - localStorage caching with 1-minute rate limiting
   - Error handling and fallback logic
   - Export pure functions for testability

1.3. **Create basic app coordinator** (`js/app.js`)
   - URL parameter parsing for BTC amount (default: 1 BTC)
   - Initialize price fetching on page load
   - Basic DOM updates to display current price and BTC amount

1.4. **Add minimal dark theme styling** (`css/style.css`)
   - Dark background, light text
   - Basic layout and typography
   - Bitcoin orange accent color (#f7931a)

**Phase 1 Testing**: Verify current price fetches correctly, caches properly, and displays with BTC amount from URL parameter.

### Phase 2: Historical Data Foundation
**Files to create**: `js/data/historicalData.js`, `btc-prices.json` (placeholder), `tests/historicalData.test.js`

2.1. **Create historical data parser** (`js/data/historicalData.js`)
   - Function to parse optimized JSON format `{start: "date", prices: [...]}`
   - Date calculation logic: `new Date(start).setDate(start.getDate() + index)`
   - Function to get price for specific date
   - Export pure functions for easy testing

2.2. **Create placeholder historical data** (`btc-prices.json`)
   - Small sample dataset (last 30 days) for initial testing
   - Use actual CoinGecko API call to generate sample data
   - Validate JSON structure matches parser expectations

2.3. **Integrate historical data loading** (`js/app.js`)
   - Fetch and parse historical data on page load
   - Display latest historical price as fallback
   - Show basic data stats (date range, number of days)

2.4. **Add unit tests** (`tests/historicalData.test.js`)
   - Test date calculation logic
   - Test price lookup by date
   - Test JSON parsing edge cases

**Phase 2 Testing**: Verify historical data loads, parses correctly, and can lookup prices by date. Run unit tests.

### Phase 3: Business Logic - Portfolio Calculations
**Files to create**: `js/business/portfolio.js`, `js/business/timeWindows.js`, `tests/portfolio.test.js`

3.1. **Implement portfolio calculations** (`js/business/portfolio.js`)
   - Calculate total USD value: `btcAmount * currentPrice`
   - Calculate gains: absolute USD and percentage
   - Calculate CAGR (Compound Annual Growth Rate)
   - Pure functions accepting price data and BTC amount

3.2. **Implement time window logic** (`js/business/timeWindows.js`)
   - Functions to filter price data by time ranges
   - Support: 1d, 7d, 30d, 3mo, 6mo, 1y, 5y, all
   - Handle edge cases (not enough data for requested range)

3.3. **Display calculated metrics** (update `js/app.js` and `index.html`)
   - Add HTML elements for metrics display
   - Show: Total USD value, Total gain (USD), Total gain (%), CAGR
   - Format numbers with proper currency and percentage formatting

3.4. **Add comprehensive unit tests** (`tests/portfolio.test.js`)
   - Test all calculation functions with known data
   - Test edge cases (zero gains, losses, short time periods)
   - Test CAGR calculation accuracy

**Phase 3 Testing**: Verify all calculations are mathematically correct. Display shows proper formatted metrics.

### Phase 4: Time Window Selection UI
**Files to update**: `index.html`, `js/ui/display.js`, `js/app.js`, `css/style.css`

4.1. **Create time window UI** (`js/ui/display.js`)
   - Functions to update DOM elements
   - Handle button states (active/inactive)
   - Separate presentation logic from business logic

4.2. **Add time window buttons** (`index.html`)
   - Button group: 1d, 7d, 30d, 3mo, 6mo, 1y, 5y, all
   - Default selection based on available data

4.3. **Implement time window switching** (`js/app.js`)
   - Event handlers for time window buttons
   - Recalculate metrics when time window changes
   - Update display with new calculations

4.4. **Style time window controls** (`css/style.css`)
   - Button styling with bitcoin orange active state
   - Responsive layout for different screen sizes

**Phase 4 Testing**: Verify time window switching updates all metrics correctly. Test all time ranges.

### Phase 5: GitHub Actions for Data Updates
**Files to create**: `.github/workflows/update-prices.yml`, `scripts/fetch-prices.js`

5.1. **Create price fetching script** (`scripts/fetch-prices.js`)
   - Node.js script to fetch full historical data from CoinGecko
   - Convert to optimized JSON format
   - Update `btc-prices.json` with new data

5.2. **Create GitHub Actions workflow** (`.github/workflows/update-prices.yml`)
   - Daily schedule (runs at 00:30 UTC after markets)
   - Fetch latest prices and update JSON file
   - Commit changes back to repository

5.3. **Test data update workflow**
   - Run script locally to verify data fetching
   - Test GitHub Action (can trigger manually first)
   - Verify updated data loads correctly in application

**Phase 5 Testing**: Verify automated data updates work correctly and don't break the application.

### Phase 6: Enhanced UI and Error Handling
**Files to update**: All existing files for polish and robustness

6.1. **Add loading states and error handling**
   - Loading indicators while fetching data
   - Graceful error messages for API failures
   - Offline functionality with cached data

6.2. **Improve responsive design**
   - Mobile-first responsive layout
   - Touch-friendly button sizes
   - Readable typography across devices

6.3. **Add data validation and edge cases**
   - Validate JSON data structure
   - Handle partial data loads
   - Graceful degradation for old browsers

**Phase 6 Testing**: Test on multiple devices, simulate network failures, validate all edge cases.

### Phase 7: Charts and Visualization (Future)
**Note**: This phase is planned for later iteration and would add chart visualization using a lightweight charting library.

## Development Notes
- **Test-Driven Approach**: Write tests for business logic before implementation
- **Incremental Development**: Each phase should be fully functional
- **Performance Focus**: Keep bundle size minimal, optimize for mobile
- **Browser Support**: Target modern browsers with ES6 module support