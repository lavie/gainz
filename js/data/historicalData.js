// Historical Bitcoin price data parser
let cachedHistoricalData = null;

/**
 * Parse date string in YYYY-MM-DD format to Date object
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date} Date object
 */
export function parseDate(dateString) {
    const date = new Date(dateString + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
    }
    return date;
}

/**
 * Format Date object to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Calculate date by adding days to start date
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {number} daysToAdd - Number of days to add
 * @returns {string} Calculated date in YYYY-MM-DD format
 */
export function calculateDate(startDate, daysToAdd) {
    const date = parseDate(startDate);
    date.setUTCDate(date.getUTCDate() + daysToAdd);
    return formatDate(date);
}

/**
 * Parse historical data from optimized JSON format
 * @param {Object} data - Historical data object {start: "date", prices: [...]}
 * @returns {Object} Parsed data with validation
 */
export function parseHistoricalData(data) {
    console.log('📊 Parsing historical Bitcoin price data...');
    
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid historical data: must be an object');
    }
    
    if (!data.start || typeof data.start !== 'string') {
        throw new Error('Invalid historical data: missing or invalid start date');
    }
    
    if (!Array.isArray(data.prices)) {
        throw new Error('Invalid historical data: prices must be an array');
    }
    
    if (data.prices.length === 0) {
        throw new Error('Invalid historical data: prices array is empty');
    }
    
    // Validate start date format
    const startDate = parseDate(data.start);
    
    // Validate all prices are numbers and not negative (allow zero for historical accuracy)
    const invalidPrices = data.prices.filter((price, index) => {
        return typeof price !== 'number' || isNaN(price) || price < 0;
    });
    
    if (invalidPrices.length > 0) {
        throw new Error(`Invalid historical data: found ${invalidPrices.length} invalid prices`);
    }
    
    const endDate = calculateDate(data.start, data.prices.length - 1);
    
    console.log(`✅ Historical data parsed: ${data.prices.length} days from ${data.start} to ${endDate}`);
    console.log(`📈 Price range: $${Math.min(...data.prices).toLocaleString()} - $${Math.max(...data.prices).toLocaleString()}`);
    
    return {
        start: data.start,
        startDate: startDate,
        endDate: parseDate(endDate),
        prices: data.prices,
        totalDays: data.prices.length
    };
}

/**
 * Get price for a specific date
 * @param {Object} historicalData - Parsed historical data
 * @param {string|Date} targetDate - Target date in YYYY-MM-DD format or Date object
 * @returns {Object|null} Price info {date: string, price: number} for the date, or null if not found
 */
export function getPriceForDate(historicalData, targetDate) {
    let target;
    
    if (targetDate instanceof Date) {
        target = targetDate;
    } else if (typeof targetDate === 'string') {
        target = parseDate(targetDate);
    } else {
        throw new Error('Target date must be a string (YYYY-MM-DD) or Date object');
    }
    
    const daysDiff = Math.floor((target - historicalData.startDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0 || daysDiff >= historicalData.prices.length) {
        return null;
    }
    
    const dateString = formatDate(target);
    return {
        date: dateString,
        price: historicalData.prices[daysDiff]
    };
}

/**
 * Get the latest available price from historical data
 * @param {Object} historicalData - Parsed historical data
 * @returns {Object} Latest price info {date: string, price: number}
 */
export function getLatestPrice(historicalData) {
    const latestIndex = historicalData.prices.length - 1;
    const latestDate = calculateDate(historicalData.start, latestIndex);
    
    return {
        date: latestDate,
        price: historicalData.prices[latestIndex]
    };
}

/**
 * Get price data for a date range
 * @param {Object} historicalData - Parsed historical data
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} Array of {date: string, price: number} objects
 */
export function getPriceRange(historicalData, startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    if (start > end) {
        throw new Error('Start date must be before end date');
    }
    
    const result = [];
    const startDiff = Math.floor((start - historicalData.startDate) / (1000 * 60 * 60 * 24));
    const endDiff = Math.floor((end - historicalData.startDate) / (1000 * 60 * 60 * 24));
    
    const actualStart = Math.max(0, startDiff);
    const actualEnd = Math.min(historicalData.prices.length - 1, endDiff);
    
    for (let i = actualStart; i <= actualEnd; i++) {
        const date = calculateDate(historicalData.start, i);
        result.push({
            date: date,
            price: historicalData.prices[i]
        });
    }
    
    return result;
}

/**
 * Load and parse historical data from JSON file
 * @param {string} url - URL to the JSON file (default: btc-prices.json)
 * @returns {Promise<Object>} Parsed historical data
 */
export async function loadHistoricalData(url = 'btc-prices.json') {
    if (cachedHistoricalData) {
        console.log('🔄 Using cached historical data');
        return cachedHistoricalData;
    }
    
    console.log(`🌐 Loading historical data from ${url}...`);
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to load historical data: ${response.status} ${response.statusText}`);
        }
        
        const rawData = await response.json();
        const parsedData = parseHistoricalData(rawData);
        
        // Cache the parsed data
        cachedHistoricalData = parsedData;
        
        return parsedData;
    } catch (error) {
        console.error('❌ Failed to load historical data:', error);
        throw error;
    }
}

/**
 * Clear cached historical data (useful for testing)
 */
export function clearCache() {
    cachedHistoricalData = null;
    console.log('🗑️  Historical data cache cleared');
}