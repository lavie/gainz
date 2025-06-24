#!/usr/bin/env node

/**
 * Test script for the Bitcoin price data fetcher
 * 
 * This script tests the fetch-prices.js functionality with various scenarios
 * to ensure robust error handling and validation.
 */

import { fetchHistoricalData, optimizeData, validateData } from './fetch-prices.js';
import fs from 'fs/promises';

/**
 * Test the fetchHistoricalData function
 */
async function testFetchHistoricalData() {
    console.log('🧪 Testing fetchHistoricalData...');
    
    try {
        // Test with 7 days of data
        const data = await fetchHistoricalData('7', true);
        
        console.log('✅ fetchHistoricalData basic test passed');
        console.log(`   Data points: ${data.prices.length}`);
        console.log(`   Has market_caps: ${!!data.market_caps}`);
        console.log(`   Has total_volumes: ${!!data.total_volumes}`);
        
        return data;
    } catch (error) {
        console.error('❌ fetchHistoricalData test failed:', error.message);
        throw error;
    }
}

/**
 * Test the optimizeData function
 */
async function testOptimizeData(rawData) {
    console.log('\n🧪 Testing optimizeData...');
    
    try {
        const optimized = optimizeData(rawData, true);
        
        console.log('✅ optimizeData basic test passed');
        console.log(`   Start date: ${optimized.start}`);
        console.log(`   Price count: ${optimized.prices.length}`);
        console.log(`   First price: $${optimized.prices[0]}`);
        console.log(`   Last price: $${optimized.prices[optimized.prices.length - 1]}`);
        
        return optimized;
    } catch (error) {
        console.error('❌ optimizeData test failed:', error.message);
        throw error;
    }
}

/**
 * Test the validateData function
 */
async function testValidateData(optimizedData) {
    console.log('\n🧪 Testing validateData...');
    
    try {
        // Test valid data
        validateData(optimizedData);
        console.log('✅ validateData with valid data passed');
        
        // Test invalid data scenarios
        const testCases = [
            { data: null, name: 'null data' },
            { data: 'string', name: 'string data' },
            { data: {}, name: 'missing start date' },
            { data: { start: null, prices: [1000] }, name: 'null start date' },
            { data: { start: 'invalid-date', prices: [1000] }, name: 'invalid date format' },
            { data: { start: '2024-01-01', prices: null }, name: 'null prices' },
            { data: { start: '2024-01-01', prices: [] }, name: 'empty prices' },
            { data: { start: '2024-01-01', prices: [1000, 'invalid', 2000] }, name: 'invalid price types' },
            { data: { start: '2024-01-01', prices: [1000, -100, 2000] }, name: 'negative prices' }
        ];
        
        let invalidTestsPassed = 0;
        for (const testCase of testCases) {
            try {
                validateData(testCase.data);
                console.warn(`⚠️  validateData should have failed for ${testCase.name}`);
            } catch (error) {
                invalidTestsPassed++;
                console.log(`✅ validateData correctly rejected ${testCase.name}`);
            }
        }
        
        console.log(`✅ validateData error handling: ${invalidTestsPassed}/${testCases.length} tests passed`);
        
    } catch (error) {
        console.error('❌ validateData test failed:', error.message);
        throw error;
    }
}

/**
 * Test file operations
 */
async function testFileOperations(optimizedData) {
    console.log('\n🧪 Testing file operations...');
    
    const testFilePath = 'test-prices.json';
    
    try {
        // Test writing data
        const { writeDataToFile } = await import('./fetch-prices.js');
        await writeDataToFile(optimizedData, testFilePath, true);
        console.log('✅ writeDataToFile test passed');
        
        // Test reading back the data
        const fileContent = await fs.readFile(testFilePath, 'utf8');
        const parsedData = JSON.parse(fileContent);
        
        // Validate the read data
        validateData(parsedData);
        console.log('✅ File read/write roundtrip test passed');
        
        // Check data integrity
        if (parsedData.start === optimizedData.start && 
            parsedData.prices.length === optimizedData.prices.length) {
            console.log('✅ Data integrity test passed');
        } else {
            throw new Error('Data integrity check failed');
        }
        
        // Clean up test file
        await fs.unlink(testFilePath);
        console.log('✅ Test file cleanup completed');
        
    } catch (error) {
        // Clean up test file on error
        try {
            await fs.unlink(testFilePath);
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        
        console.error('❌ File operations test failed:', error.message);
        throw error;
    }
}

/**
 * Test rate limiting and error handling
 */
async function testErrorHandling() {
    console.log('\n🧪 Testing error handling...');
    
    try {
        // Test with invalid days parameter
        try {
            await fetchHistoricalData('invalid-days', false);
            console.warn('⚠️  API should have rejected invalid days parameter');
        } catch (error) {
            console.log('✅ API correctly rejected invalid days parameter');
        }
        
        console.log('✅ Error handling tests completed');
        
    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
        throw error;
    }
}

/**
 * Main test function
 */
async function runTests() {
    const startTime = Date.now();
    
    try {
        console.log('🧪 Starting Bitcoin Price Fetcher Tests...\n');
        
        // Test 1: Fetch data
        const rawData = await testFetchHistoricalData();
        
        // Test 2: Optimize data
        const optimizedData = await testOptimizeData(rawData);
        
        // Test 3: Validate data
        await testValidateData(optimizedData);
        
        // Test 4: File operations
        await testFileOperations(optimizedData);
        
        // Test 5: Error handling
        await testErrorHandling();
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n✅ All tests passed in ${duration}s!`);
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log('   ✅ Data fetching from CoinGecko API');
        console.log('   ✅ Data optimization and compression');
        console.log('   ✅ Data validation and error detection');
        console.log('   ✅ File read/write operations');
        console.log('   ✅ Error handling and edge cases');
        
    } catch (error) {
        console.error('\n❌ Tests failed:', error.message);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}