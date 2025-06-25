#!/usr/bin/env node

/**
 * Bitcoin Price Data Update Script
 * 
 * Checks the current btc-prices.json file for missing dates and fetches
 * only the missing data from CoinGecko API to keep the file up to date.
 * 
 * Usage:
 *   node scripts/update-prices.js [--dry-run] [--verbose]
 *   npm run update-prices
 *   make update-prices
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range';
const CURRENT_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
const DEFAULT_CACHE_FILE = 'btc-prices.json';
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        dryRun: false,
        verbose: false,
        cacheFile: DEFAULT_CACHE_FILE
    };
    
    args.forEach(arg => {
        if (arg === '--dry-run') {
            config.dryRun = true;
        } else if (arg === '--verbose' || arg === '-v') {
            config.verbose = true;
        } else if (arg.startsWith('--cache-file=')) {
            config.cacheFile = arg.split('=')[1];
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Bitcoin Price Data Update Script

Usage:
  node scripts/update-prices.js [options]

Options:
  --dry-run           Show what would be updated without making changes
  --verbose, -v       Enable verbose logging
  --cache-file=<file> Specify cache file path (default: btc-prices.json)
  --help, -h          Show this help message

Examples:
  node scripts/update-prices.js
  node scripts/update-prices.js --dry-run --verbose
  node scripts/update-prices.js --cache-file=custom-prices.json
            `);
            process.exit(0);
        }
    });
    
    return config;
}

/**
 * Add delay to respect API rate limits
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert date string to Unix timestamp in milliseconds
 */
function dateToTimestamp(dateString) {
    return new Date(dateString + 'T00:00:00.000Z').getTime();
}

/**
 * Convert timestamp to YYYY-MM-DD format in UTC
 */
function timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Get date N days from a given date
 */
function addDays(dateString, days) {
    const date = new Date(dateString + 'T00:00:00.000Z');
    date.setUTCDate(date.getUTCDate() + days);
    return timestampToDate(date.getTime());
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate() {
    return timestampToDate(Date.now());
}

/**
 * Read and parse existing price data
 */
async function readExistingData(cacheFilePath, verbose = false) {
    try {
        const data = await fs.readFile(cacheFilePath, 'utf8');
        const parsed = JSON.parse(data);
        
        if (verbose) {
            console.log(`📖 Loaded existing data from ${cacheFilePath}`);
            console.log(`   Start date: ${parsed.start}`);
            console.log(`   Price points: ${parsed.prices.length}`);
            
            if (parsed.prices.length > 0) {
                const lastDate = addDays(parsed.start, parsed.prices.length - 1);
                console.log(`   Last date: ${lastDate}`);
                console.log(`   Latest price: $${parsed.prices[parsed.prices.length - 1].toLocaleString()}`);
            }
        }
        
        return parsed;
    } catch (error) {
        if (error.code === 'ENOENT') {
            if (verbose) {
                console.log(`📝 Cache file ${cacheFilePath} not found, will create new one`);
            }
            return null;
        }
        throw new Error(`Failed to read cache file: ${error.message}`);
    }
}

/**
 * Calculate missing date ranges
 */
function calculateMissingDates(existingData, verbose = false) {
    const currentDate = getCurrentDate();
    
    if (!existingData) {
        if (verbose) {
            console.log('🔍 No existing data, need to fetch all historical data');
        }
        return [{
            start: '2010-01-01', // Bitcoin's earliest meaningful date
            end: currentDate,
            reason: 'No existing data'
        }];
    }
    
    const { start, prices } = existingData;
    const lastDate = addDays(start, prices.length - 1);
    
    if (verbose) {
        console.log(`🔍 Analyzing existing data:`);
        console.log(`   Data starts: ${start}`);
        console.log(`   Data ends: ${lastDate}`);
        console.log(`   Current date: ${currentDate}`);
    }
    
    const missingRanges = [];
    
    // Check if we need to update to current date
    if (lastDate < currentDate) {
        const nextDate = addDays(lastDate, 1);
        missingRanges.push({
            start: nextDate,
            end: currentDate,
            reason: `Gap from ${lastDate} to ${currentDate}`
        });
    }
    
    if (verbose) {
        if (missingRanges.length === 0) {
            console.log('✅ No missing dates found, data is up to date');
        } else {
            console.log(`📊 Found ${missingRanges.length} missing date range(s):`);
            missingRanges.forEach((range, i) => {
                const days = Math.ceil((dateToTimestamp(range.end) - dateToTimestamp(range.start)) / MS_PER_DAY) + 1;
                console.log(`   ${i + 1}. ${range.start} to ${range.end} (${days} days) - ${range.reason}`);
            });
        }
    }
    
    return missingRanges;
}

/**
 * Fetch price data for a specific date range
 */
async function fetchDateRange(startDate, endDate, verbose = false) {
    const fromTimestamp = Math.floor(dateToTimestamp(startDate) / 1000);
    const toTimestamp = Math.floor(dateToTimestamp(endDate) / 1000);
    
    const url = `${COINGECKO_API_URL}?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
    
    if (verbose) {
        console.log(`🌐 Fetching data from ${startDate} to ${endDate}`);
        console.log(`   URL: ${url}`);
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
            console.log(`✅ Fetched ${data.prices.length} price points`);
        }
        
        return data.prices;
    } catch (error) {
        console.error(`❌ Failed to fetch data for ${startDate} to ${endDate}:`, error.message);
        throw error;
    }
}

/**
 * Process and normalize price data
 */
function processPriceData(rawPrices, verbose = false) {
    const processedData = [];
    let previousDate = null;
    
    for (const [timestamp, price] of rawPrices) {
        const date = timestampToDate(timestamp);
        
        // Skip duplicate dates
        if (date === previousDate) {
            continue;
        }
        
        processedData.push({
            date,
            price: Math.round(price * 100) / 100 // Round to 2 decimal places
        });
        
        previousDate = date;
    }
    
    // Sort by date to ensure correct order
    processedData.sort((a, b) => a.date.localeCompare(b.date));
    
    if (verbose && processedData.length > 0) {
        console.log(`🔧 Processed ${processedData.length} unique price points`);
        console.log(`   Date range: ${processedData[0].date} to ${processedData[processedData.length - 1].date}`);
    }
    
    return processedData;
}

/**
 * Merge new data with existing data
 */
function mergeData(existingData, newDataPoints, verbose = false) {
    if (!existingData) {
        // No existing data, create new structure
        if (newDataPoints.length === 0) {
            throw new Error('No data to create new cache file');
        }
        
        const startDate = newDataPoints[0].date;
        const prices = newDataPoints.map(point => point.price);
        
        if (verbose) {
            console.log(`🆕 Creating new data structure starting from ${startDate}`);
        }
        
        return {
            start: startDate,
            prices
        };
    }
    
    if (newDataPoints.length === 0) {
        if (verbose) {
            console.log('🔄 No new data to merge, returning existing data');
        }
        return existingData;
    }
    
    // Find where new data should be inserted
    const { start, prices } = existingData;
    const lastExistingDate = addDays(start, prices.length - 1);
    
    // Filter new data to only include dates after last existing date
    const newPrices = newDataPoints
        .filter(point => point.date > lastExistingDate)
        .map(point => point.price);
    
    if (verbose) {
        console.log(`🔄 Merging ${newPrices.length} new price points`);
        console.log(`   Existing data: ${prices.length} points ending on ${lastExistingDate}`);
        if (newPrices.length > 0) {
            console.log(`   New data: ${newPrices.length} points starting from ${addDays(lastExistingDate, 1)}`);
        }
    }
    
    return {
        start,
        prices: [...prices, ...newPrices]
    };
}

/**
 * Write updated data to cache file
 */
async function writeUpdatedData(data, cacheFilePath, verbose = false) {
    try {
        // Validate data structure
        if (!data.start || !Array.isArray(data.prices) || data.prices.length === 0) {
            throw new Error('Invalid data structure');
        }
        
        // Create backup of existing file
        const backupPath = cacheFilePath + '.backup';
        try {
            await fs.copyFile(cacheFilePath, backupPath);
            if (verbose) {
                console.log(`💾 Created backup: ${backupPath}`);
            }
        } catch (error) {
            // Backup failed, but continue (might be first run)
            if (verbose) {
                console.log(`⚠️ Could not create backup: ${error.message}`);
            }
        }
        
        // Write updated data
        const jsonContent = JSON.stringify(data);
        await fs.writeFile(cacheFilePath, jsonContent, 'utf8');
        
        if (verbose) {
            const stats = await fs.stat(cacheFilePath);
            console.log(`💾 Updated cache file: ${cacheFilePath}`);
            console.log(`   File size: ${stats.size.toLocaleString()} bytes`);
            console.log(`   Data points: ${data.prices.length.toLocaleString()}`);
            
            if (data.prices.length > 0) {
                const lastDate = addDays(data.start, data.prices.length - 1);
                console.log(`   Date range: ${data.start} to ${lastDate}`);
                console.log(`   Latest price: $${data.prices[data.prices.length - 1].toLocaleString()}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to write updated data:', error.message);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    const config = parseArgs();
    const startTime = Date.now();
    
    try {
        console.log('🚀 Bitcoin Price Data Update Starting...');
        
        if (config.verbose) {
            console.log('⚙️  Configuration:');
            console.log(`   Cache file: ${config.cacheFile}`);
            console.log(`   Dry run: ${config.dryRun}`);
            console.log(`   Verbose: ${config.verbose}`);
        }
        
        // Resolve cache file path
        const projectRoot = path.dirname(__dirname);
        const cacheFilePath = path.resolve(projectRoot, config.cacheFile);
        
        // Read existing data
        const existingData = await readExistingData(cacheFilePath, config.verbose);
        
        // Calculate missing dates
        const missingRanges = calculateMissingDates(existingData, config.verbose);
        
        if (missingRanges.length === 0) {
            console.log('✅ No updates needed, data is current');
            return;
        }
        
        if (config.dryRun) {
            console.log('🔍 DRY RUN - Would fetch the following data:');
            missingRanges.forEach((range, i) => {
                const days = Math.ceil((dateToTimestamp(range.end) - dateToTimestamp(range.start)) / MS_PER_DAY) + 1;
                console.log(`   ${i + 1}. ${range.start} to ${range.end} (${days} days)`);
            });
            console.log('🔍 DRY RUN - No changes made');
            return;
        }
        
        // Fetch missing data
        let allNewData = [];
        
        for (let i = 0; i < missingRanges.length; i++) {
            const range = missingRanges[i];
            
            if (i > 0) {
                if (config.verbose) {
                    console.log(`⏱️  Waiting ${RATE_LIMIT_DELAY}ms to respect API rate limits...`);
                }
                await delay(RATE_LIMIT_DELAY);
            }
            
            const rawPrices = await fetchDateRange(range.start, range.end, config.verbose);
            const processedData = processPriceData(rawPrices, config.verbose);
            allNewData = allNewData.concat(processedData);
        }
        
        // Merge with existing data
        const updatedData = mergeData(existingData, allNewData, config.verbose);
        
        // Write updated data
        await writeUpdatedData(updatedData, cacheFilePath, config.verbose);
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Successfully updated Bitcoin price data in ${duration}s`);
        
        // Print summary
        const newPointsAdded = allNewData.length;
        if (newPointsAdded > 0) {
            console.log('\n📊 Update Summary:');
            console.log(`   New data points added: ${newPointsAdded.toLocaleString()}`);
            console.log(`   Total data points: ${updatedData.prices.length.toLocaleString()}`);
            console.log(`   Date range: ${updatedData.start} to ${addDays(updatedData.start, updatedData.prices.length - 1)}`);
            console.log(`   Latest price: $${updatedData.prices[updatedData.prices.length - 1].toLocaleString()}`);
        }
        
    } catch (error) {
        console.error('\n❌ Failed to update Bitcoin price data:');
        console.error(`   ${error.message}`);
        
        if (config.verbose && error.stack) {
            console.error('\n🔍 Stack trace:');
            console.error(error.stack);
        }
        
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { calculateMissingDates, fetchDateRange, mergeData, readExistingData };