#!/usr/bin/env node

/**
 * Bitcoin Historical Price Data Fetcher
 * 
 * Fetches historical Bitcoin price data from CoinGecko API and optimizes it
 * for the Bitcoin Portfolio Tracker application.
 * 
 * Usage:
 *   node scripts/fetch-prices.js [--days=max] [--output=btc-prices.json]
 *   npm run fetch-prices
 *   make fetch-prices
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const DEFAULT_OUTPUT_FILE = 'btc-prices.json';
const DEFAULT_DAYS = 'max'; // Fetch maximum available historical data
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests to respect rate limits

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        days: DEFAULT_DAYS,
        output: DEFAULT_OUTPUT_FILE,
        verbose: false
    };
    
    args.forEach(arg => {
        if (arg.startsWith('--days=')) {
            config.days = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            config.output = arg.split('=')[1];
        } else if (arg === '--verbose' || arg === '-v') {
            config.verbose = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Bitcoin Historical Price Data Fetcher

Usage:
  node scripts/fetch-prices.js [options]

Options:
  --days=<value>    Number of days to fetch (default: max)
                    Options: 1, 7, 14, 30, 90, 180, 365, max
  --output=<file>   Output file path (default: btc-prices.json)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

Examples:
  node scripts/fetch-prices.js
  node scripts/fetch-prices.js --days=365 --output=btc-2024.json
  node scripts/fetch-prices.js --verbose
            `);
            process.exit(0);
        }
    });
    
    return config;
}

/**
 * Add delay to respect API rate limits
 * @param {number} ms - Milliseconds to delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch Bitcoin historical price data from CoinGecko API
 * @param {string} days - Number of days to fetch ('max' for all available)
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Promise<Object>} Raw API response data
 */
async function fetchHistoricalData(days = 'max', verbose = false) {
    const url = `${COINGECKO_API_URL}?vs_currency=usd&days=${days}`;
    
    if (verbose) {
        console.log(`🌐 Fetching Bitcoin price data from CoinGecko API...`);
        console.log(`📊 URL: ${url}`);
        console.log(`⏱️  Days: ${days}`);
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.prices || !Array.isArray(data.prices)) {
            throw new Error('Invalid API response: missing prices array');
        }
        
        if (verbose) {
            console.log(`✅ Successfully fetched ${data.prices.length} price data points`);
            const firstPrice = data.prices[0];
            const lastPrice = data.prices[data.prices.length - 1];
            
            if (firstPrice && lastPrice) {
                const firstDate = new Date(firstPrice[0]).toISOString().split('T')[0];
                const lastDate = new Date(lastPrice[0]).toISOString().split('T')[0];
                console.log(`📅 Date range: ${firstDate} to ${lastDate}`);
                console.log(`💰 Price range: $${firstPrice[1].toFixed(2)} to $${lastPrice[1].toFixed(2)}`);
            }
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ Failed to fetch historical data:', error.message);
        throw error;
    }
}

/**
 * Convert timestamp to YYYY-MM-DD format in UTC
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Date in YYYY-MM-DD format
 */
function timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Optimize raw API data into compact format for the application
 * @param {Object} rawData - Raw API response data
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Object} Optimized data in format {start: "date", prices: [...]}
 */
function optimizeData(rawData, verbose = false) {
    if (verbose) {
        console.log('🔧 Optimizing data format...');
    }
    
    const prices = rawData.prices;
    
    if (!prices || prices.length === 0) {
        throw new Error('No price data to optimize');
    }
    
    // Extract prices and determine start date
    const optimizedPrices = [];
    let startDate = null;
    let previousDate = null;
    
    for (const [timestamp, price] of prices) {
        const date = timestampToDate(timestamp);
        
        // Skip duplicate dates (CoinGecko sometimes returns multiple entries per day)
        if (date === previousDate) {
            continue;
        }
        
        if (!startDate) {
            startDate = date;
        }
        
        optimizedPrices.push(Math.round(price * 100) / 100); // Round to 2 decimal places
        previousDate = date;
    }
    
    const optimizedData = {
        start: startDate,
        prices: optimizedPrices
    };
    
    if (verbose) {
        const endDate = timestampToDate(prices[prices.length - 1][0]);
        const originalSize = JSON.stringify(rawData).length;
        const optimizedSize = JSON.stringify(optimizedData).length;
        const savings = Math.round((1 - optimizedSize / originalSize) * 100);
        
        console.log(`✅ Data optimization complete:`);
        console.log(`   📊 Price points: ${optimizedPrices.length}`);
        console.log(`   📅 Date range: ${startDate} to ${endDate}`);
        console.log(`   💾 Size reduction: ${originalSize.toLocaleString()} → ${optimizedSize.toLocaleString()} bytes (${savings}% savings)`);
        console.log(`   💰 Price range: $${Math.min(...optimizedPrices).toLocaleString()} - $${Math.max(...optimizedPrices).toLocaleString()}`);
    }
    
    return optimizedData;
}

/**
 * Validate optimized data structure
 * @param {Object} data - Optimized data to validate
 * @throws {Error} If data is invalid
 */
function validateData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data: must be an object');
    }
    
    if (!data.start || typeof data.start !== 'string') {
        throw new Error('Invalid data: missing or invalid start date');
    }
    
    if (!Array.isArray(data.prices)) {
        throw new Error('Invalid data: prices must be an array');
    }
    
    if (data.prices.length === 0) {
        throw new Error('Invalid data: prices array is empty');
    }
    
    // Validate start date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.start)) {
        throw new Error('Invalid data: start date must be in YYYY-MM-DD format');
    }
    
    // Validate all prices are positive numbers
    const invalidPrices = data.prices.filter(price => 
        typeof price !== 'number' || isNaN(price) || price <= 0
    );
    
    if (invalidPrices.length > 0) {
        throw new Error(`Invalid data: found ${invalidPrices.length} invalid prices`);
    }
}

/**
 * Write optimized data to JSON file
 * @param {Object} data - Optimized data to write
 * @param {string} outputPath - Output file path
 * @param {boolean} verbose - Enable verbose logging
 */
async function writeDataToFile(data, outputPath, verbose = false) {
    try {
        // Validate data before writing
        validateData(data);
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Write data to file with pretty formatting
        const jsonContent = JSON.stringify(data, null, 4);
        await fs.writeFile(outputPath, jsonContent, 'utf8');
        
        if (verbose) {
            const stats = await fs.stat(outputPath);
            console.log(`💾 Data written to: ${outputPath}`);
            console.log(`📏 File size: ${stats.size.toLocaleString()} bytes`);
        }
        
    } catch (error) {
        console.error('❌ Failed to write data to file:', error.message);
        throw error;
    }
}

/**
 * Add metadata comment to the JSON file
 * @param {string} outputPath - Path to the JSON file
 * @param {Object} config - Configuration used for fetching
 */
async function addMetadataComment(outputPath, config) {
    try {
        const content = await fs.readFile(outputPath, 'utf8');
        const data = JSON.parse(content);
        
        // Add metadata as a comment at the top
        const timestamp = new Date().toISOString();
        const comment = `// Bitcoin Historical Price Data
// Generated: ${timestamp}
// Source: CoinGecko API
// Days requested: ${config.days}
// Data points: ${data.prices.length}
// Date range: ${data.start} to ${new Date(Date.parse(data.start) + (data.prices.length - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
//
`;
        
        await fs.writeFile(outputPath, comment + JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        // Non-critical error, just log it
        console.warn('⚠️ Failed to add metadata comment:', error.message);
    }
}

/**
 * Main function to orchestrate the data fetching and optimization process
 */
async function main() {
    const config = parseArgs();
    const startTime = Date.now();
    
    try {
        console.log('🚀 Bitcoin Historical Price Data Fetcher Starting...');
        
        if (config.verbose) {
            console.log('⚙️  Configuration:');
            console.log(`   Days: ${config.days}`);
            console.log(`   Output: ${config.output}`);
            console.log(`   Verbose: ${config.verbose}`);
        }
        
        // Resolve output path relative to project root
        const projectRoot = path.dirname(__dirname);
        const outputPath = path.resolve(projectRoot, config.output);
        
        // Add delay to respect rate limits if this isn't the first run
        if (config.verbose) {
            console.log(`⏱️  Waiting ${RATE_LIMIT_DELAY}ms to respect API rate limits...`);
        }
        await delay(RATE_LIMIT_DELAY);
        
        // Fetch raw data from CoinGecko API
        const rawData = await fetchHistoricalData(config.days, config.verbose);
        
        // Optimize data format
        const optimizedData = optimizeData(rawData, config.verbose);
        
        // Write optimized data to file
        await writeDataToFile(optimizedData, outputPath, config.verbose);
        
        // Add metadata comment (optional, non-critical)
        await addMetadataComment(outputPath, config);
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Successfully updated Bitcoin price data in ${duration}s`);
        console.log(`📄 Output: ${outputPath}`);
        
        // Print summary
        console.log('\n📊 Summary:');
        console.log(`   Data points: ${optimizedData.prices.length.toLocaleString()}`);
        console.log(`   Date range: ${optimizedData.start} to ${timestampToDate(rawData.prices[rawData.prices.length - 1][0])}`);
        console.log(`   Latest price: $${optimizedData.prices[optimizedData.prices.length - 1].toLocaleString()}`);
        
    } catch (error) {
        console.error('\n❌ Failed to fetch Bitcoin price data:');
        console.error(`   ${error.message}`);
        
        if (config.verbose && error.stack) {
            console.error('\n🔍 Stack trace:');
            console.error(error.stack);
        }
        
        process.exit(1);
    }
}

// Run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { fetchHistoricalData, optimizeData, validateData, writeDataToFile };