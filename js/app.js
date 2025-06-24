// Main application coordinator
import { getCurrentPrice } from './data/priceService.js';
import { loadHistoricalData, getLatestPrice, getPriceForDate } from './data/historicalData.js';
import { calculatePortfolioMetrics } from './business/portfolio.js';
import { TIME_WINDOWS, filterByTimeWindow, getAvailableTimeWindows, getCalendarStartDate } from './business/timeWindows.js';
import { 
    updateTimeWindowButtons, 
    showMetricsLoading, 
    showMetricsError,
    updateTimeWindowTitle,
    updateTimeWindowAvailability,
    updateStatusWithTimeWindow
} from './ui/display.js';

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
        'cagr': formatPercentage(metrics.cagr),
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
                const numericValue = id === 'total-gain-usd' ? metrics.absoluteGain : metrics.percentageGain;
                element.className = `metric-value ${numericValue >= 0 ? 'positive' : 'negative'}`;
            }
        }
    });
}

// Global variables for state management
let globalCurrentPrice = 0;
let globalBtcAmount = 1;
let globalHistoricalData = null;
let currentTimeWindow = 'all';

function getCurrentPriceForDisplay() {
    return globalCurrentPrice;
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
            
            if (windowConfig.type === 'calendar') {
                // Calendar-based time windows (WTD, MTD, YTD)
                startDate = getCalendarStartDate(timeWindow, currentDate);
            } else {
                // Fixed day windows (7d, 30d, etc.)
                startDate = new Date(currentDate);
                startDate.setDate(startDate.getDate() - windowConfig.days);
            }
            
            // Find the closest available price to the start date
            const startPriceData = getPriceForDate(globalHistoricalData, startDate);
            
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
    
    const btcAmountEl = document.getElementById('btc-amount-display');
    const currentPriceEl = document.getElementById('current-price-display');
    const portfolioValueEl = document.getElementById('portfolio-value-display');
    const statusEl = document.getElementById('status-display');
    
    if (btcAmountEl) {
        btcAmountEl.textContent = formatBtc(btcAmount);
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
            
            // Update URL with new time window
            updateUrl(globalBtcAmount, currentTimeWindow);
        }
    }
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
        
        // Setup time window button event listeners
        const timeWindowButtons = document.querySelector('.time-window-buttons');
        if (timeWindowButtons) {
            timeWindowButtons.addEventListener('click', handleTimeWindowClick);
        }
        
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