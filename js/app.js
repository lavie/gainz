// Main application coordinator
import { getCurrentPrice } from './data/priceService.js';
import { loadHistoricalData, getLatestPrice, getPriceForDate } from './data/historicalData.js';
import { calculatePortfolioMetrics, calculateYearsBetweenDates } from './business/portfolio.js';
import { TIME_WINDOWS, filterByTimeWindow, getAvailableTimeWindows, getCalendarStartDate } from './business/timeWindows.js';
import { 
    updateTimeWindowButtons, 
    showMetricsLoading, 
    showMetricsError,
    updateTimeWindowTitle,
    updateTimeWindowAvailability,
    updateStatusWithTimeWindow
} from './ui/display.js';
import { initChart, updateChart, resizeChart } from './ui/chartService.js';

/**
 * Parse URL parameters to get BTC amount
 * @returns {number} BTC amount (default: 1)
 */
function getBtcAmountFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const btcParam = urlParams.get('btc');
    
    if (btcParam) {
        const amount = parseFloat(btcParam);
        if (!isNaN(amount) && amount > 0) {
            return amount;
        }
    }
    
    return 1; // Default to 1 BTC
}

/**
 * Parse URL parameters to get time window period
 * @returns {string} Time window period (default: 'all')
 */
function getTimeWindowFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const periodParam = urlParams.get('period');
    
    if (periodParam && TIME_WINDOWS[periodParam]) {
        return periodParam;
    }
    
    return 'all'; // Default to all time
}

/**
 * Update URL with current parameters without page reload
 * @param {number} btcAmount - Current BTC amount
 * @param {string} timeWindow - Current time window
 */
function updateUrl(btcAmount, timeWindow) {
    const url = new URL(window.location);
    
    // Update BTC amount parameter
    if (btcAmount !== 1) {
        url.searchParams.set('btc', btcAmount.toString());
    } else {
        url.searchParams.delete('btc');
    }
    
    // Update period parameter
    if (timeWindow !== 'all') {
        url.searchParams.set('period', timeWindow);
    } else {
        url.searchParams.delete('period');
    }
    
    // Update URL without page reload
    window.history.replaceState({}, '', url);
}

/**
 * Format number as currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Format BTC amount
 * @param {number} amount - BTC amount to format
 * @returns {string} Formatted BTC string
 */
function formatBtc(amount) {
    return `${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 8 
    })} BTC`;
}

/**
 * Format percentage
 * @param {number} percentage - Percentage as decimal (e.g., 0.25 for 25%)
 * @returns {string} Formatted percentage string
 */
function formatPercentage(percentage) {
    const percent = percentage * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Format years
 * @param {number} years - Years as decimal
 * @returns {string} Formatted time string
 */
function formatYears(years) {
    if (years < 1) {
        const days = Math.round(years * 365);
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
        return `${years.toFixed(2)} year${years !== 1 ? 's' : ''}`;
    }
}

/**
 * Update portfolio metrics display
 * @param {Object} metrics - Portfolio metrics object
 */
function updateMetricsDisplay(metrics) {
    const elements = {
        'total-gain-usd': formatCurrency(metrics.absoluteGain),
        'total-gain-percent': formatPercentage(metrics.percentageGain),
        'cagr': metrics.displayCAGR !== null ? formatPercentage(metrics.displayCAGR) : 'N/A*',
        'time-held': formatYears(metrics.years),
        'initial-value': formatCurrency(metrics.initialValue),
        'purchase-price': formatCurrency(metrics.initialValue / metrics.totalValue * getCurrentPriceFromMetrics(metrics))
    };
    
    // Helper function to get current price from metrics
    function getCurrentPriceFromMetrics(m) {
        return m.totalValue / (m.initialValue / (m.initialValue / m.totalValue * m.totalValue));
    }
    
    // Calculate purchase price: initialValue / btcAmount
    const purchasePrice = metrics.initialValue / (metrics.totalValue / globalCurrentPrice);
    elements['purchase-price'] = formatCurrency(purchasePrice);
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            
            // Add styling for gains/losses
            if (id.includes('gain') || id === 'cagr') {
                if (id === 'cagr' && metrics.displayCAGR === null) {
                    element.className = 'metric-value'; // No color for N/A
                } else {
                    const numericValue = id === 'total-gain-usd' ? metrics.absoluteGain : 
                                       id === 'cagr' ? metrics.displayCAGR : metrics.percentageGain;
                    element.className = `metric-value ${numericValue >= 0 ? 'positive' : 'negative'}`;
                }
            }
        }
    });
}

// Global variables for state management
let globalCurrentPrice = 0;
let globalBtcAmount = 1;
let globalHistoricalData = null;
let currentTimeWindow = 'all';
let chartInstance = null;

function getCurrentPriceForDisplay() {
    return globalCurrentPrice;
}

/**
 * Add current API price as latest data point if it differs from historical data
 * This ensures chart and metrics show consistent information
 * @param {Array} priceData - Historical price data
 * @param {number} currentPrice - Current API price
 * @returns {Array} Enhanced price data with current price if needed
 */
function addCurrentPriceToData(priceData, currentPrice) {
    if (!priceData || priceData.length === 0 || !currentPrice) {
        return priceData;
    }
    
    // Get the latest historical data point
    const sortedData = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestHistorical = sortedData[sortedData.length - 1];
    
    if (!latestHistorical) {
        return priceData;
    }
    
    // Check if current API price is significantly different from latest historical
    const priceDifference = Math.abs(currentPrice - latestHistorical.price);
    const percentDifference = priceDifference / latestHistorical.price;
    const THRESHOLD = 0.001; // 0.1% threshold
    
    if (percentDifference > THRESHOLD) {
        // Add current price as "now" data point
        const currentDataPoint = {
            date: new Date(), // Current time
            price: currentPrice
        };
        
        console.log(`📊 Adding current API price to chart: $${currentPrice.toLocaleString()} (differs from latest historical by ${(percentDifference * 100).toFixed(2)}%)`);
        
        return [...sortedData, currentDataPoint];
    }
    
    return sortedData;
}

/**
 * Update chart with data for current time window
 * @param {string} timeWindow - Current time window
 */
function updateChartForTimeWindow(timeWindow) {
    if (!globalHistoricalData || !chartInstance) {
        return;
    }

    try {
        // Convert historical data to format expected by time windows
        const priceData = [];
        for (let i = 0; i < globalHistoricalData.prices.length; i++) {
            const date = new Date(globalHistoricalData.start);
            date.setDate(date.getDate() + i);
            priceData.push({
                date: date,
                price: globalHistoricalData.prices[i]
            });
        }

        let filteredData;
        
        if (timeWindow === 'all') {
            filteredData = priceData;
        } else {
            // Filter data based on time window
            const windowConfig = TIME_WINDOWS[timeWindow];
            if (!windowConfig) {
                console.warn(`Invalid time window: ${timeWindow}`);
                return;
            }

            const currentDate = new Date();
            let startDate;
            
            if (windowConfig.type === 'calendar' || windowConfig.type === 'daily') {
                startDate = getCalendarStartDate(timeWindow, currentDate);
            } else {
                startDate = new Date(currentDate);
                startDate.setDate(startDate.getDate() - windowConfig.days);
            }
            
            filteredData = priceData.filter(item => new Date(item.date) >= startDate);
        }

        // Add current API price as the latest data point if different from latest historical
        const enhancedData = addCurrentPriceToData(filteredData, globalCurrentPrice);
        
        // Update chart with enhanced data
        updateChart(enhancedData, globalBtcAmount, timeWindow);
        
    } catch (error) {
        console.warn('Failed to update chart:', error);
    }
}

/**
 * Calculate and display portfolio metrics for the current time window
 * @param {string} timeWindow - Time window to calculate for
 */
function updatePortfolioMetricsForTimeWindow(timeWindow) {
    if (!globalHistoricalData) {
        showMetricsError('No historical data available');
        return;
    }
    
    try {
        showMetricsLoading();
        
        if (timeWindow === 'all') {
            // Use the earliest historical date as the purchase date
            const purchaseDate = new Date(globalHistoricalData.start);
            const earliestPriceData = getPriceForDate(globalHistoricalData, purchaseDate);
            
            if (earliestPriceData) {
                const metrics = calculatePortfolioMetrics(
                    globalBtcAmount,
                    globalCurrentPrice,
                    earliestPriceData.price,
                    purchaseDate
                );
                
                updateMetricsDisplay(metrics);
                updateTimeWindowTitle(timeWindow, TIME_WINDOWS[timeWindow]);
            }
        } else {
            // Calculate metrics for specific time window
            const windowConfig = TIME_WINDOWS[timeWindow];
            if (!windowConfig) {
                throw new Error(`Invalid time window: ${timeWindow}`);
            }
            
            const currentDate = new Date();
            let startDate;
            
            if (windowConfig.type === 'calendar' || windowConfig.type === 'daily') {
                // Calendar-based time windows (1D, WTD, MTD, YTD)
                startDate = getCalendarStartDate(timeWindow, currentDate);
            } else {
                // Fixed day windows (7d, 30d, etc.)
                startDate = new Date(currentDate);
                startDate.setDate(startDate.getDate() - windowConfig.days);
            }
            
            // Find the closest available price to the start date
            const startPriceData = getPriceForDate(globalHistoricalData, startDate);
            
            // Special handling for 1D period: check if we're using stale data
            if (timeWindow === '1d' && startPriceData) {
                const latestHistorical = getLatestPrice(globalHistoricalData);
                
                // If start date equals latest historical date, the calculation would show 0% gain
                // This happens when current price API fails and we fall back to historical data
                if (startPriceData.date === latestHistorical.date) {
                    console.warn('⚠️  1D calculation skipped: start price equals current price (using stale data)');
                    
                    // Show a more informative message
                    const elements = {
                        'total-gain-usd': 'N/A*',
                        'total-gain-percent': 'N/A*',
                        'cagr': 'N/A*',
                        'time-held': formatYears(calculateYearsBetweenDates(new Date(startPriceData.date), new Date())),
                        'initial-value': formatCurrency(globalBtcAmount * startPriceData.price),
                        'purchase-price': formatCurrency(startPriceData.price)
                    };
                    
                    Object.entries(elements).forEach(([id, value]) => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.textContent = value;
                            element.className = 'metric-value';
                        }
                    });
                    
                    updateTimeWindowTitle(timeWindow, windowConfig);
                    updateStatusWithTimeWindow(timeWindow, new Date(startPriceData.date), new Date(), 1);
                    return;
                }
            }
            
            if (startPriceData) {
                const actualStartDate = new Date(startPriceData.date);
                const metrics = calculatePortfolioMetrics(
                    globalBtcAmount,
                    globalCurrentPrice,
                    startPriceData.price,
                    actualStartDate
                );
                
                updateMetricsDisplay(metrics);
                updateTimeWindowTitle(timeWindow, windowConfig);
                
                // Calculate actual days for status display
                const actualDays = Math.ceil((currentDate - actualStartDate) / (1000 * 60 * 60 * 24));
                updateStatusWithTimeWindow(timeWindow, actualStartDate, currentDate, actualDays);
            } else {
                showMetricsError('Insufficient data for this time window');
            }
        }
    } catch (error) {
        console.warn('Failed to calculate portfolio metrics for time window:', error);
        showMetricsError();
    }
}

/**
 * Update DOM elements with current data
 * @param {number} btcAmount - Amount of BTC
 * @param {number} currentPrice - Current BTC price in USD
 * @param {Object} historicalData - Historical data object (optional)
 */
function updateDisplay(btcAmount, currentPrice, historicalData = null) {
    globalCurrentPrice = currentPrice;
    globalBtcAmount = btcAmount;
    globalHistoricalData = historicalData;
    
    const btcAmountEl = document.getElementById('btc-amount-input');
    const currentPriceEl = document.getElementById('current-price-display');
    const portfolioValueEl = document.getElementById('portfolio-value-display');
    const statusEl = document.getElementById('status-display');
    
    if (btcAmountEl) {
        btcAmountEl.value = btcAmount;
    }
    
    if (currentPriceEl) {
        currentPriceEl.textContent = formatCurrency(currentPrice);
    }
    
    if (portfolioValueEl) {
        const portfolioValue = btcAmount * currentPrice;
        portfolioValueEl.textContent = formatCurrency(portfolioValue);
    }
    
    // Setup time window availability and calculate metrics
    if (historicalData) {
        // Convert historical data to format expected by time windows
        const priceData = [];
        for (let i = 0; i < historicalData.prices.length; i++) {
            const date = new Date(historicalData.start);
            date.setDate(date.getDate() + i);
            priceData.push({
                date: date,
                price: historicalData.prices[i]
            });
        }
        
        const availableWindows = getAvailableTimeWindows(priceData);
        updateTimeWindowAvailability(availableWindows);
        
        // Set the correct time window button state
        updateTimeWindowButtons(currentTimeWindow);
        
        // Calculate metrics for current time window
        updatePortfolioMetricsForTimeWindow(currentTimeWindow);
        
        // Update URL to reflect current state
        updateUrl(btcAmount, currentTimeWindow);
    }
    
    if (statusEl) {
        let statusText = `Data loaded successfully. Price updated: ${new Date().toLocaleTimeString()}`;
        
        if (historicalData) {
            statusText += ` | Historical data: ${historicalData.totalDays} days (${historicalData.start} to ${historicalData.endDate.toISOString().split('T')[0]})`;
        }
        
        statusEl.textContent = statusText;
    }
}

/**
 * Handle time window button clicks
 * @param {Event} event - Click event
 */
function handleTimeWindowClick(event) {
    if (event.target.classList.contains('time-window-btn')) {
        const newTimeWindow = event.target.dataset.window;
        
        if (newTimeWindow && !event.target.disabled) {
            currentTimeWindow = newTimeWindow;
            updateTimeWindowButtons(currentTimeWindow);
            updatePortfolioMetricsForTimeWindow(currentTimeWindow);
            updateChartForTimeWindow(currentTimeWindow);
            
            // Update URL with new time window
            updateUrl(globalBtcAmount, currentTimeWindow);
        }
    }
}

/**
 * Handle BTC amount input changes
 * @param {Event} event - Input event
 */
function handleBtcAmountChange(event) {
    const input = event.target;
    let newAmount = parseFloat(input.value);
    
    // Validate input
    if (isNaN(newAmount) || newAmount < 0) {
        // If invalid, revert to previous value
        input.value = globalBtcAmount;
        return;
    }
    
    // Limit to 8 decimal places (satoshi precision)
    newAmount = Math.round(newAmount * 100000000) / 100000000;
    
    // Update input to show rounded value
    if (newAmount !== parseFloat(input.value)) {
        input.value = newAmount;
    }
    
    // Update global state
    globalBtcAmount = newAmount;
    
    // Update portfolio value display immediately
    if (globalCurrentPrice) {
        const portfolioValueEl = document.getElementById('portfolio-value-display');
        if (portfolioValueEl) {
            const portfolioValue = newAmount * globalCurrentPrice;
            portfolioValueEl.textContent = formatCurrency(portfolioValue);
        }
    }
    
    // Recalculate metrics for current time window
    if (globalHistoricalData) {
        updatePortfolioMetricsForTimeWindow(currentTimeWindow);
        updateChartForTimeWindow(currentTimeWindow);
    }
    
    // Update URL with new BTC amount
    updateUrl(newAmount, currentTimeWindow);
}

/**
 * Show error state in UI
 * @param {string} message - Error message to display
 */
function showError(message) {
    const statusEl = document.getElementById('status-display');
    if (statusEl) {
        statusEl.textContent = `Error: ${message}`;
        statusEl.className = 'error';
    }
    
    const currentPriceEl = document.getElementById('current-price-display');
    if (currentPriceEl) {
        currentPriceEl.textContent = 'Unable to load price';
    }
}

/**
 * Initialize the application
 */
async function init() {
    try {
        // Get BTC amount and time window from URL parameters
        const btcAmount = getBtcAmountFromUrl();
        currentTimeWindow = getTimeWindowFromUrl();
        
        // Show loading state
        const statusEl = document.getElementById('status-display');
        if (statusEl) {
            statusEl.textContent = 'Loading Bitcoin data...';
        }
        
        // Load historical data and current price in parallel
        const [historicalData, currentPrice] = await Promise.allSettled([
            loadHistoricalData(),
            getCurrentPrice()
        ]);
        
        let finalCurrentPrice;
        let finalHistoricalData = null;
        
        // Handle current price result
        if (currentPrice.status === 'fulfilled') {
            finalCurrentPrice = currentPrice.value;
        } else {
            console.warn('Failed to fetch current price, will try historical fallback');
            
            // Try to use latest historical price as fallback
            if (historicalData.status === 'fulfilled') {
                const latestHistorical = getLatestPrice(historicalData.value);
                finalCurrentPrice = latestHistorical.price;
                
                // Check if latest historical data is stale (more than 1 day old)
                const latestDate = new Date(latestHistorical.date);
                const now = new Date();
                const daysSinceLatest = (now - latestDate) / (1000 * 60 * 60 * 24);
                
                if (daysSinceLatest > 1) {
                    console.warn(`⚠️  Historical data is ${Math.round(daysSinceLatest)} days old. Current price may be inaccurate.`);
                }
                
                console.log(`📊 Using latest historical price as fallback: $${finalCurrentPrice.toLocaleString()} (${latestHistorical.date})`);
            } else {
                throw new Error('Failed to load both current and historical price data');
            }
        }
        
        // Handle historical data result
        if (historicalData.status === 'fulfilled') {
            finalHistoricalData = historicalData.value;
        } else {
            console.warn('Failed to load historical data:', historicalData.reason);
        }
        
        // Update display
        updateDisplay(btcAmount, finalCurrentPrice, finalHistoricalData);
        
        // Initialize chart
        try {
            chartInstance = initChart('price-chart');
            // Update chart with data after initialization
            if (finalHistoricalData) {
                updateChartForTimeWindow(currentTimeWindow);
            }
        } catch (error) {
            console.warn('Failed to initialize chart:', error);
        }
        
        // Setup time window button event listeners
        const timeWindowButtons = document.querySelector('.time-window-buttons');
        if (timeWindowButtons) {
            timeWindowButtons.addEventListener('click', handleTimeWindowClick);
        }
        
        // Setup BTC amount input handlers
        const btcInput = document.getElementById('btc-amount-input');
        if (btcInput) {
            // Update on input change (real-time)
            btcInput.addEventListener('input', handleBtcAmountChange);
            
            // Also handle enter key and blur for better UX
            btcInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    btcInput.blur();
                }
            });
        }
        
        // Add window resize listener for chart responsiveness
        window.addEventListener('resize', () => {
            if (chartInstance) {
                resizeChart();
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load Bitcoin data');
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}