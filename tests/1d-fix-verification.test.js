/**
 * Test to verify the 1D gain calculation fix
 */

import { getPriceForDate, parseHistoricalData, getLatestPrice } from '../js/data/historicalData.js';
import { getStartOfYesterday } from '../js/business/timeWindows.js';

describe('1D Fix Verification', () => {
    
    test('should detect stale data scenario correctly', () => {
        console.log('=== STALE DATA DETECTION TEST ===');
        
        // Scenario: Historical data ends yesterday, API failed
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-14",
            prices: [
                52000,  // 2024-12-14
                50000   // 2024-12-15 (latest = yesterday)
            ]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z'); // Today
        const startOfYesterday = getStartOfYesterday(currentDate);
        
        console.log('Current date:', currentDate.toISOString().split('T')[0]);
        console.log('Start of yesterday:', startOfYesterday.toISOString().split('T')[0]);
        
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        const latestHistorical = getLatestPrice(mockHistoricalData);
        
        console.log('Start price data:', startPriceData);
        console.log('Latest historical:', latestHistorical);
        
        // The bug condition: start date equals latest historical date
        const isBuggyScenario = startPriceData && startPriceData.date === latestHistorical.date;
        
        console.log('Is buggy scenario (start = latest):', isBuggyScenario);
        
        if (isBuggyScenario) {
            console.log('✅ Fix should trigger: Show N/A* instead of 0% gain');
            console.log('Both prices would be $50,000, showing 0% gain incorrectly');
        } else {
            console.log('❌ Bug scenario not detected');
        }
        
        expect(isBuggyScenario).toBe(true);
        expect(startPriceData.date).toBe('2024-12-15');
        expect(latestHistorical.date).toBe('2024-12-15');
    });
    
    test('should not trigger fix for valid 1D scenario', () => {
        console.log('=== VALID 1D SCENARIO TEST ===');
        
        // Scenario: Up-to-date data, API working
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-14",
            prices: [
                52000,  // 2024-12-14
                50000,  // 2024-12-15 (yesterday)
                47000   // 2024-12-16 (today/latest)
            ]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const startOfYesterday = getStartOfYesterday(currentDate);
        
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        const latestHistorical = getLatestPrice(mockHistoricalData);
        
        console.log('Start price data:', startPriceData);
        console.log('Latest historical:', latestHistorical);
        
        // Valid scenario: start date != latest historical date
        const isBuggyScenario = startPriceData && startPriceData.date === latestHistorical.date;
        
        console.log('Is buggy scenario:', isBuggyScenario);
        
        if (!isBuggyScenario) {
            console.log('✅ Valid scenario: Normal 1D calculation should proceed');
            console.log('Start price: $50,000, Latest: $47,000');
            console.log('This allows proper gain calculation with current API price');
        } else {
            console.log('❌ Incorrectly flagged as buggy scenario');
        }
        
        expect(isBuggyScenario).toBe(false);
        expect(startPriceData.date).toBe('2024-12-15');
        expect(latestHistorical.date).toBe('2024-12-16');
    });
    
    test('should handle edge case: no historical data for yesterday', () => {
        console.log('=== NO YESTERDAY DATA TEST ===');
        
        // Scenario: Historical data is too old
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-13",
            prices: [
                55000,  // 2024-12-13
                52000   // 2024-12-14 (no 2024-12-15 data)
            ]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const startOfYesterday = getStartOfYesterday(currentDate); // 2024-12-15
        
        const startPriceData = getPriceForDate(mockHistoricalData, startOfYesterday);
        
        console.log('Looking for:', startOfYesterday.toISOString().split('T')[0]);
        console.log('Found price data:', startPriceData);
        
        if (!startPriceData) {
            console.log('✅ Correctly returns null for missing data');
            console.log('App should show error or disable 1D period');
        } else {
            console.log('❌ Unexpectedly found data');
        }
        
        expect(startPriceData).toBeNull();
    });
});