/**
 * Test to reproduce the real 1D gain calculation bug using actual data flow
 */

import { getPriceForDate, parseHistoricalData } from '../js/data/historicalData.js';
import { getStartOfYesterday } from '../js/business/timeWindows.js';
import { calculatePortfolioMetrics } from '../js/business/portfolio.js';

describe('Real 1D Bug with Data Flow', () => {
    
    // Mock historical data that simulates the actual scenario
    const mockHistoricalData = parseHistoricalData({
        start: "2024-12-14",
        prices: [
            52000,  // 2024-12-14 (2 days ago)
            50000,  // 2024-12-15 (yesterday) 
            45000   // 2024-12-16 (today)
        ]
    });
    
    test('should reproduce the bug: 1D period calculation with real data flow', () => {
        console.log('=== REAL 1D BUG TEST WITH DATA FLOW ===');
        
        // Simulate current time
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const currentPrice = 45000; // Current price (dropped from yesterday)
        const btcAmount = 1;
        
        console.log('Mock historical data:');
        console.log('2024-12-14: $52,000');
        console.log('2024-12-15: $50,000 (yesterday)');
        console.log('2024-12-16: $45,000 (current price)');
        console.log('');
        
        // Step 1: Calculate start of yesterday (what 1D period should use)
        const startOfYesterday = getStartOfYesterday(currentDate);
        console.log('Start of yesterday:', startOfYesterday.toISOString());
        console.log('Start of yesterday date string:', startOfYesterday.toISOString().split('T')[0]);
        
        // Step 2: Get price for that date using getPriceForDate
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        console.log('Price data found for start date:', startPriceData);
        
        if (!startPriceData) {
            console.log('🚨 No price data found for start date!');
            return;
        }
        
        // Step 3: Calculate metrics using this price as purchase price
        const metrics = calculatePortfolioMetrics(
            btcAmount,
            currentPrice,
            startPriceData.price,  // This is the key - what price is being used?
            new Date(startPriceData.date),
            currentDate
        );
        
        console.log('');
        console.log('Portfolio calculation results:');
        console.log('- Purchase price (from data):', startPriceData.price);
        console.log('- Current price:', currentPrice);
        console.log('- Absolute gain:', metrics.absoluteGain);
        console.log('- Percentage gain:', (metrics.percentageGain * 100).toFixed(2) + '%');
        console.log('');
        
        // Expected: Should show negative gain since price dropped from 50k to 45k
        const expectedGain = currentPrice - startPriceData.price;
        console.log('Expected gain (45000 - ' + startPriceData.price + '):', expectedGain);
        
        if (expectedGain < 0 && metrics.absoluteGain > 0) {
            console.log('🚨 BUG CONFIRMED: Showing positive gain when price dropped!');
        } else if (expectedGain > 0 && metrics.absoluteGain < 0) {
            console.log('🚨 BUG CONFIRMED: Showing negative gain when price rose!');
        } else {
            console.log('✅ Gain calculation appears correct');
        }
        
        // The calculation should be correct
        expect(metrics.absoluteGain).toBe(expectedGain);
    });
    
    test('should check if getPriceForDate is returning wrong date', () => {
        console.log('=== GETPRICEFORDATE DEBUG ===');
        
        const testDates = [
            '2024-12-14',
            '2024-12-15', 
            '2024-12-16'
        ];
        
        console.log('Historical data start:', mockHistoricalData.start);
        console.log('Historical data prices:', mockHistoricalData.prices);
        console.log('');
        
        testDates.forEach(dateString => {
            const priceData = getPriceForDate(mockHistoricalData, dateString);
            console.log(`Date ${dateString}: ${priceData ? '$' + priceData.price : 'Not found'}`);
        });
        
        // Test with Date objects (as used in real app)
        console.log('');
        console.log('Testing with Date objects:');
        testDates.forEach(dateString => {
            const date = new Date(dateString + 'T00:00:00Z');
            const priceData = getPriceForDate(mockHistoricalData, date);
            console.log(`Date object ${date.toISOString()}: ${priceData ? '$' + priceData.price : 'Not found'}`);
        });
    });
    
    test('should verify start of yesterday calculation', () => {
        console.log('=== START OF YESTERDAY DEBUG ===');
        
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const startOfYesterday = getStartOfYesterday(currentDate);
        
        console.log('Current date:', currentDate.toISOString());
        console.log('Start of yesterday:', startOfYesterday.toISOString());
        console.log('Start of yesterday date string:', startOfYesterday.toISOString().split('T')[0]);
        
        // This should be 2024-12-15
        expect(startOfYesterday.toISOString().split('T')[0]).toBe('2024-12-15');
        
        // Check what price we get for this date
        const priceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        console.log('Price for start of yesterday:', priceData);
        
        // Should get yesterday's price (50000)
        expect(priceData).not.toBeNull();
        expect(priceData.price).toBe(50000);
    });
});