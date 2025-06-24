// Bitcoin price service with caching
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
const CACHE_KEY = 'btc_current_price';
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

/**
 * Get cached price data from localStorage
 * @returns {Object|null} Cached price data or null if expired/missing
 */
export function getCachedPrice() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (less than 1 minute old)
        if (now - data.timestamp < CACHE_DURATION) {
            return data;
        }
        
        // Cache expired, remove it
        localStorage.removeItem(CACHE_KEY);
        return null;
    } catch (error) {
        console.warn('Error reading cached price:', error);
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

/**
 * Cache price data in localStorage
 * @param {number} price - Bitcoin price in USD
 */
export function cachePrice(price) {
    try {
        const data = {
            price: price,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('Error caching price:', error);
    }
}

/**
 * Fetch current Bitcoin price from CoinGecko API
 * @returns {Promise<number>} Bitcoin price in USD
 */
export async function fetchCurrentPrice() {
    const response = await fetch(COINGECKO_API_URL);
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.bitcoin || typeof data.bitcoin.usd !== 'number') {
        throw new Error('Invalid API response format');
    }
    
    return data.bitcoin.usd;
}

/**
 * Get current Bitcoin price with caching
 * @returns {Promise<number>} Bitcoin price in USD
 */
export async function getCurrentPrice() {
    // Try to get cached price first
    const cached = getCachedPrice();
    if (cached) {
        const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000);
        console.log(`🔄 Using cached Bitcoin price: $${cached.price.toLocaleString()} (cached ${cacheAge}s ago)`);
        return cached.price;
    }
    
    // Fetch fresh price from API
    try {
        console.log('🌐 Fetching fresh Bitcoin price from CoinGecko API...');
        const price = await fetchCurrentPrice();
        cachePrice(price);
        console.log(`✅ Fresh Bitcoin price fetched: $${price.toLocaleString()} (cached for 60s)`);
        return price;
    } catch (error) {
        console.error('❌ Failed to fetch current price:', error);
        
        // If we have any cached data (even expired), use it as fallback
        const fallbackCached = localStorage.getItem(CACHE_KEY);
        if (fallbackCached) {
            try {
                const data = JSON.parse(fallbackCached);
                const cacheAge = Math.round((Date.now() - data.timestamp) / 1000);
                console.warn(`⚠️  Using expired cached price as fallback: $${data.price.toLocaleString()} (${cacheAge}s old)`);
                return data.price;
            } catch (parseError) {
                console.error('❌ Failed to parse fallback cache:', parseError);
            }
        }
        
        // Re-throw the original error if no fallback available
        throw error;
    }
}