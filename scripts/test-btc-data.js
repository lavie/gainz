#!/usr/bin/env node

/**
 * Test script to validate and analyze btc-prices.json data
 * 
 * This script helps diagnose issues with the historical price data
 * and validates the format matches what the application expects.
 */

import fs from 'fs/promises';

const DATA_FILE = 'btc-prices.json';

/**
 * Load and parse the JSON data
 */
async function loadData() {
    try {
        const fileContent = await fs.readFile(DATA_FILE, 'utf8');
        const data = JSON.parse(fileContent);
        return data;
    } catch (error) {
        throw new Error(`Failed to load ${DATA_FILE}: ${error.message}`);
    }
}

/**
 * Analyze the price data for issues
 */
function analyzeData(data) {
    console.log('📊 Data Analysis:');
    console.log(`   Start date: ${data.start}`);
    console.log(`   Total prices: ${data.prices.length}`);
    console.log(`   First price: $${data.prices[0]}`);
    console.log(`   Last price: $${data.prices[data.prices.length - 1]}`);
    
    // Count different types of values
    let zeroCount = 0;
    let negativeCount = 0;
    let invalidCount = 0;
    let validCount = 0;
    
    const invalidPrices = [];
    
    for (let i = 0; i < data.prices.length; i++) {
        const price = data.prices[i];
        
        if (typeof price !== 'number') {
            invalidCount++;
            invalidPrices.push({ index: i, value: price, type: typeof price });
        } else if (price < 0) {
            negativeCount++;
            invalidPrices.push({ index: i, value: price, type: 'negative' });
        } else if (price === 0) {
            zeroCount++;
        } else {
            validCount++;
        }
    }
    
    console.log('\n📈 Price Analysis:');
    console.log(`   Valid prices (> 0): ${validCount}`);
    console.log(`   Zero prices: ${zeroCount}`);
    console.log(`   Negative prices: ${negativeCount}`);
    console.log(`   Invalid types: ${invalidCount}`);
    
    if (invalidPrices.length > 0) {
        console.log('\n❌ Invalid Price Details:');
        invalidPrices.slice(0, 10).forEach(item => {
            const date = new Date(data.start);
            date.setDate(date.getDate() + item.index);
            console.log(`   Index ${item.index} (${date.toISOString().split('T')[0]}): ${item.value} (${item.type})`);
        });
        if (invalidPrices.length > 10) {
            console.log(`   ... and ${invalidPrices.length - 10} more`);
        }
    }
    
    // Find the first and last non-zero prices
    let firstNonZeroIndex = -1;
    let lastNonZeroIndex = -1;
    
    for (let i = 0; i < data.prices.length; i++) {
        if (data.prices[i] > 0) {
            if (firstNonZeroIndex === -1) firstNonZeroIndex = i;
            lastNonZeroIndex = i;
        }
    }
    
    if (firstNonZeroIndex !== -1) {
        const firstNonZeroDate = new Date(data.start);
        firstNonZeroDate.setDate(firstNonZeroDate.getDate() + firstNonZeroIndex);
        
        const lastNonZeroDate = new Date(data.start);
        lastNonZeroDate.setDate(lastNonZeroDate.getDate() + lastNonZeroIndex);
        
        console.log('\n💰 Non-Zero Price Range:');
        console.log(`   First non-zero: $${data.prices[firstNonZeroIndex]} on ${firstNonZeroDate.toISOString().split('T')[0]} (index ${firstNonZeroIndex})`);
        console.log(`   Last non-zero: $${data.prices[lastNonZeroIndex]} on ${lastNonZeroDate.toISOString().split('T')[0]} (index ${lastNonZeroIndex})`);
        console.log(`   Zero prices before first non-zero: ${firstNonZeroIndex}`);
        console.log(`   Zero prices after last non-zero: ${data.prices.length - lastNonZeroIndex - 1}`);
    }
    
    return {
        totalPrices: data.prices.length,
        validCount,
        zeroCount,
        negativeCount,
        invalidCount,
        invalidPrices,
        firstNonZeroIndex,
        lastNonZeroIndex
    };
}

/**
 * Test the data against application validation logic
 */
function testApplicationValidation(data) {
    console.log('\n🧪 Testing Application Validation Logic:');
    
    // Simulate the validation from historicalData.js
    let invalidPriceCount = 0;
    
    for (const price of data.prices) {
        if (typeof price !== 'number' || price < 0 || !isFinite(price)) {
            invalidPriceCount++;
        }
    }
    
    console.log(`   Invalid prices by app logic: ${invalidPriceCount}`);
    
    if (invalidPriceCount > 0) {
        console.log('   ❌ Application validation would fail');
        console.log('   💡 Issue: Application rejects zero prices, but Bitcoin had zero value in early days');
    } else {
        console.log('   ✅ Application validation would pass');
    }
    
    return invalidPriceCount === 0;
}

/**
 * Suggest fixes for the data
 */
function suggestFixes(analysis) {
    console.log('\n🔧 Suggested Fixes:');
    
    if (analysis.invalidCount > 0) {
        console.log('   1. Remove non-numeric price values');
    }
    
    if (analysis.negativeCount > 0) {
        console.log('   2. Remove negative price values');
    }
    
    if (analysis.zeroCount > 0) {
        console.log('   3. Update application validation to allow zero prices for historical accuracy');
        console.log('      OR filter out zero prices if not needed for historical analysis');
    }
    
    console.log('\n💡 Recommendation:');
    console.log('   The data contains early Bitcoin history when BTC had no established price.');
    console.log('   This is historically accurate, but the application should handle zero prices gracefully.');
}

/**
 * Main test function
 */
async function testBtcData() {
    try {
        console.log('🧪 Testing btc-prices.json data...\n');
        
        // Load the data
        const data = await loadData();
        console.log('✅ Data loaded successfully');
        
        // Analyze the data
        const analysis = analyzeData(data);
        
        // Test application validation
        const validForApp = testApplicationValidation(data);
        
        // Suggest fixes
        suggestFixes(analysis);
        
        console.log('\n📋 Summary:');
        console.log(`   File: ${DATA_FILE}`);
        console.log(`   Total data points: ${analysis.totalPrices}`);
        console.log(`   Date range: ${data.start} to ${new Date(new Date(data.start).getTime() + (analysis.totalPrices - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);
        console.log(`   Application compatible: ${validForApp ? '✅' : '❌'}`);
        
        if (!validForApp) {
            console.log('\n🚨 Action Required:');
            console.log('   The application validation logic needs to be updated to handle zero prices,');
            console.log('   or the data needs to be filtered to remove zero prices.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testBtcData();
}

export { testBtcData, loadData, analyzeData, testApplicationValidation };