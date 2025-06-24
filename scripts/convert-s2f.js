#!/usr/bin/env node

/**
 * Convert s2f.js historical Bitcoin price data to our project's format
 * 
 * Reads the s2f.js file containing:
 * - var axis_x = ["2010-01-01","2010-01-02",...] (dates)
 * - var price_c = [0,0,0,0,0.004,...] (prices)
 * 
 * Converts to our optimized format:
 * {"start": "2010-01-01", "prices": [0,0,0,0,0.004,...]}
 */

import fs from 'fs/promises';
import path from 'path';

const S2F_FILE = 's2f.js';
const OUTPUT_FILE = 'btc-prices.json';

/**
 * Parse JavaScript array from string
 */
function parseJSArray(line, variableName) {
    const regex = new RegExp(`var\\s+${variableName}\\s*=\\s*\\[([^\\]]+)\\]`);
    const match = line.match(regex);
    
    if (!match) {
        throw new Error(`Could not find ${variableName} variable in the file`);
    }
    
    // Parse the array content
    const arrayContent = match[1];
    
    // For dates (strings), we need to handle quoted values
    if (variableName === 'axis_x') {
        return arrayContent
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(item => item.length > 0);
    }
    
    // For prices (numbers), parse as floats
    if (variableName === 'price_c') {
        return arrayContent
            .split(',')
            .map(item => {
                const num = parseFloat(item.trim());
                return isNaN(num) ? 0 : num;
            })
            .filter(item => item !== undefined);
    }
    
    return [];
}

/**
 * Convert s2f data to our project format
 */
function convertToProjectFormat(dates, prices) {
    if (!dates || !prices || dates.length === 0 || prices.length === 0) {
        throw new Error('Invalid dates or prices data');
    }
    
    console.log(`📊 Data analysis:`);
    console.log(`   Dates count: ${dates.length}`);
    console.log(`   Prices count: ${prices.length}`);
    
    // Use the shorter array length to handle mismatched arrays
    const minLength = Math.min(dates.length, prices.length);
    const trimmedDates = dates.slice(0, minLength);
    const trimmedPrices = prices.slice(0, minLength);
    
    if (dates.length !== prices.length) {
        console.log(`⚠️  Array length mismatch - using first ${minLength} entries`);
    }
    
    // Get today's date for filtering future dates
    const today = new Date('2025-06-24');
    
    // Create pairs and filter in one pass
    const validPairs = [];
    let firstNonZeroFound = false;
    
    for (let i = 0; i < minLength; i++) {
        const dateStr = trimmedDates[i];
        const price = trimmedPrices[i];
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            console.log(`⚠️  Skipping invalid date format: ${dateStr}`);
            continue;
        }
        
        const date = new Date(dateStr);
        
        // Skip future dates
        if (date > today) {
            continue;
        }
        
        // Skip zero prices before first non-zero price
        if (!firstNonZeroFound && price <= 0) {
            continue;
        }
        
        // Once we find the first non-zero price, include all subsequent prices
        if (!firstNonZeroFound && price > 0) {
            firstNonZeroFound = true;
        }
        
        validPairs.push({ date: dateStr, price: price });
    }
    
    if (validPairs.length === 0) {
        throw new Error('No valid price data found after filtering');
    }
    
    return {
        start: validPairs[0].date,
        prices: validPairs.map(pair => pair.price)
    };
}

/**
 * Format data as compact JSON
 */
function formatAsCompactJSON(data) {
    return JSON.stringify(data);
}

/**
 * Main conversion function
 */
async function convertS2FData() {
    try {
        console.log('🔄 Converting s2f.js to project format...');
        
        // Check if s2f.js exists
        try {
            await fs.access(S2F_FILE);
        } catch (error) {
            throw new Error(`File ${S2F_FILE} not found. Please ensure the file exists in the current directory.`);
        }
        
        // Read the s2f.js file
        console.log('📖 Reading s2f.js file...');
        const fileContent = await fs.readFile(S2F_FILE, 'utf8');
        
        // Find the lines containing the variables
        const lines = fileContent.split('\n');
        let datesLine = '';
        let pricesLine = '';
        
        for (const line of lines) {
            if (line.includes('var axis_x =')) {
                datesLine = line;
            }
            if (line.includes('var price_c =')) {
                pricesLine = line;
            }
        }
        
        if (!datesLine || !pricesLine) {
            throw new Error('Could not find axis_x or price_c variables in the file');
        }
        
        console.log('📅 Parsing dates array...');
        const dates = parseJSArray(datesLine, 'axis_x');
        console.log(`   Found ${dates.length} dates`);
        console.log(`   First date: ${dates[0]}`);
        console.log(`   Last date: ${dates[dates.length - 1]}`);
        
        console.log('💰 Parsing prices array...');
        const prices = parseJSArray(pricesLine, 'price_c');
        console.log(`   Found ${prices.length} prices`);
        console.log(`   First price: $${prices[0]}`);
        console.log(`   Last price: $${prices[prices.length - 1]}`);
        
        // Convert to project format
        console.log('🔄 Converting to project format...');
        const convertedData = convertToProjectFormat(dates, prices);
        
        console.log(`✅ Conversion complete:`);
        console.log(`   Start date: ${convertedData.start}`);
        console.log(`   Price count: ${convertedData.prices.length}`);
        console.log(`   First valid price: $${convertedData.prices[0]}`);
        console.log(`   Last price: $${convertedData.prices[convertedData.prices.length - 1]}`);
        
        // Calculate file size before writing
        const jsonString = formatAsCompactJSON(convertedData);
        const estimatedSize = Buffer.byteLength(jsonString, 'utf8');
        console.log(`   Estimated file size: ${(estimatedSize / 1024).toFixed(1)} KB`);
        
        // Write to output file as compact JSON
        console.log(`💾 Writing to ${OUTPUT_FILE}...`);
        await fs.writeFile(OUTPUT_FILE, jsonString, 'utf8');
        
        // Verify the written file
        const stats = await fs.stat(OUTPUT_FILE);
        console.log(`✅ File written successfully: ${(stats.size / 1024).toFixed(1)} KB`);
        
        console.log('\n🎉 Conversion completed successfully!');
        console.log(`   Input: ${S2F_FILE}`);
        console.log(`   Output: ${OUTPUT_FILE}`);
        console.log(`   Original data points: ${dates.length}`);
        console.log(`   Filtered data points: ${convertedData.prices.length}`);
        console.log(`   Date range: ${convertedData.start} to ${dates[dates.length - 1]}`);
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    }
}

// Run conversion if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    convertS2FData();
}

export { convertS2FData, parseJSArray, convertToProjectFormat, formatAsCompactJSON };