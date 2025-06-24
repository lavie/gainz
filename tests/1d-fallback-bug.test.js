/**
 * Test to reproduce the 1D bug when current price API fails 
 * and app falls back to latest historical price
 */

import { getPriceForDate, parseHistoricalData, getLatestPrice } from '../js/data/historicalData.js';
import { getStartOfYesterday } from '../js/business/timeWindows.js';
import { calculatePortfolioMetrics } from '../js/business/portfolio.js';

describe('1D Bug with API Fallback Scenario', () => {
    
    test('should reproduce bug when historical data ends yesterday', () => {
        console.log('=== BUG SCENARIO: HISTORICAL DATA ENDS YESTERDAY ===');
        
        // Historical data that ends yesterday (no today's price)
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-14",
            prices: [
                52000,  // 2024-12-14 (2 days ago)
                50000   // 2024-12-15 (yesterday) - this is the latest!
            ]
        });
        
        console.log('Historical data:');
        console.log('2024-12-14: $52,000');
        console.log('2024-12-15: $50,000 (yesterday & latest)');
        console.log('2024-12-16: NO DATA (today)');
        console.log('');
        
        // Simulate current time
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const btcAmount = 1;
        
        // Simulate API failure - app uses latest historical as "current price"
        const latestHistoricalPrice = getLatestPrice(mockHistoricalData);
        const fallbackCurrentPrice = latestHistoricalPrice.price; // This would be $50,000
        
        console.log('API failure simulation:');
        console.log('Latest historical price used as current:', fallbackCurrentPrice);
        console.log('Latest historical date:', latestHistoricalPrice.date);
        console.log('');
        
        // Get 1D start price (yesterday's price)
        const startOfYesterday = getStartOfYesterday(currentDate);
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        
        console.log('1D calculation:');
        console.log('Start date (yesterday):', startOfYesterday.toISOString().split('T')[0]);
        console.log('Start price:', startPriceData?.price);
        console.log('Current price (fallback):', fallbackCurrentPrice);
        console.log('');
        
        // Calculate metrics
        if (startPriceData) {
            const metrics = calculatePortfolioMetrics(
                btcAmount,
                fallbackCurrentPrice,
                startPriceData.price,
                new Date(startPriceData.date),
                currentDate
            );
            
            console.log('Results:');
            console.log('- Absolute gain:', metrics.absoluteGain);
            console.log('- Percentage gain:', (metrics.percentageGain * 100).toFixed(2) + '%');
            console.log('');
            
            // BUG: This would show 0% gain when it should show actual market movement
            if (startPriceData.price === fallbackCurrentPrice) {
                console.log('🚨 BUG CONFIRMED: Start price equals current price!');
                console.log('Start price:', startPriceData.price);
                console.log('Current price:', fallbackCurrentPrice);
                console.log('This shows 0% gain when actual market may have moved');
                
                expect(metrics.absoluteGain).toBe(0);
                expect(metrics.percentageGain).toBe(0);
            } else {
                console.log('✅ Different prices - calculation would be correct');
            }
        }
    });
    
    test('should reproduce bug when historical data is stale', () => {
        console.log('=== BUG SCENARIO: STALE HISTORICAL DATA ===');
        
        // Historical data that's 2 days old
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-13",
            prices: [
                55000,  // 2024-12-13 (3 days ago)
                52000,  // 2024-12-14 (2 days ago) - this is the latest!
            ]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z'); // Today
        const startOfYesterday = getStartOfYesterday(currentDate); // 2024-12-15
        
        console.log('Stale historical data ends: 2024-12-14');
        console.log('Looking for yesterday price: 2024-12-15');
        console.log('');
        
        // Try to get yesterday's price
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        
        if (!startPriceData) {
            console.log('🚨 BUG CONFIRMED: No price data for yesterday!');
            console.log('This would cause the 1D calculation to fail');
            console.log('The app might fall back to an older price or show error');
        } else {
            console.log('✅ Found price for yesterday (unexpected):', startPriceData);
        }
        
        expect(startPriceData).toBeNull();
    });
    
    test('should show correct behavior when data is current', () => {
        console.log('=== CORRECT SCENARIO: UP-TO-DATE DATA ===');
        
        // Up-to-date historical data including today
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-14",
            prices: [
                52000,  // 2024-12-14 (2 days ago)
                50000,  // 2024-12-15 (yesterday)
                47000   // 2024-12-16 (today)
            ]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const actualCurrentPrice = 45000; // Real API price (different from historical)
        const btcAmount = 1;
        
        // Get 1D start price
        const startOfYesterday = getStartOfYesterday(currentDate);
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        
        console.log('With current data:');
        console.log('Yesterday price:', startPriceData?.price);
        console.log('Current price (API):', actualCurrentPrice);
        console.log('');
        
        if (startPriceData) {
            const metrics = calculatePortfolioMetrics(
                btcAmount,
                actualCurrentPrice,
                startPriceData.price,
                new Date(startPriceData.date),
                currentDate
            );
            
            console.log('Results:');
            console.log('- Absolute gain:', metrics.absoluteGain);
            console.log('- Percentage gain:', (metrics.percentageGain * 100).toFixed(2) + '%');
            
            // Should show proper negative gain
            const expectedGain = actualCurrentPrice - startPriceData.price; // 45000 - 50000 = -5000
            expect(metrics.absoluteGain).toBe(expectedGain);
            console.log('✅ Shows correct negative gain for price drop');
        }
    });
});