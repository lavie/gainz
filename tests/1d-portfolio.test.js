/**
 * Unit tests for 1D portfolio calculation issues
 * Testing CAGR and gain calculations for very short time periods
 */

import { 
    calculatePortfolioMetrics, 
    calculateCAGR, 
    calculateDisplayCAGR,
    calculateYearsBetweenDates,
    calculatePercentageGain,
    calculateAbsoluteGain
} from '../js/business/portfolio.js';

// Test data simulating a 1-day period
const testData = {
    btcAmount: 1,
    yesterdayPrice: 50000,  // Yesterday's closing price
    currentPrice: 51000,    // Current price (2% gain)
    yesterdayDate: new Date('2024-12-15T00:00:00Z'), // Yesterday start
    currentDate: new Date('2024-12-16T12:00:00Z')    // Current time (1.5 days later)
};

describe('1D Portfolio Calculations', () => {
    
    test('should calculate correct years for 1-day period', () => {
        const years = calculateYearsBetweenDates(testData.yesterdayDate, testData.currentDate);
        
        console.log('Years calculated:', years);
        console.log('Expected years (1.5 days):', 1.5 / 365.25);
        
        // 1.5 days should be approximately 0.0041 years
        expect(years).toBeCloseTo(1.5 / 365.25, 6);
    });
    
    test('should calculate reasonable CAGR for 1-day period', () => {
        const years = calculateYearsBetweenDates(testData.yesterdayDate, testData.currentDate);
        const cagr = calculateCAGR(testData.currentPrice, testData.yesterdayPrice, years);
        
        console.log('CAGR calculated:', cagr);
        console.log('CAGR as percentage:', (cagr * 100).toFixed(2) + '%');
        
        // 2% gain over 1.5 days should result in massive annualized return
        // (1.02)^(365.25/1.5) - 1 ≈ extremely high number
        const expectedCAGR = Math.pow(1.02, 365.25 / 1.5) - 1;
        console.log('Expected CAGR:', expectedCAGR);
        console.log('Expected CAGR as percentage:', (expectedCAGR * 100).toFixed(2) + '%');
        
        expect(cagr).toBeCloseTo(expectedCAGR, 2);
    });
    
    test('should calculate correct portfolio metrics for 1D', () => {
        const metrics = calculatePortfolioMetrics(
            testData.btcAmount,
            testData.currentPrice,
            testData.yesterdayPrice,
            testData.yesterdayDate,
            testData.currentDate
        );
        
        console.log('Portfolio metrics for 1D:');
        console.log('- Total Value:', metrics.totalValue);
        console.log('- Absolute Gain:', metrics.absoluteGain);
        console.log('- Percentage Gain:', (metrics.percentageGain * 100).toFixed(2) + '%');
        console.log('- CAGR:', (metrics.cagr * 100).toFixed(2) + '%');
        console.log('- Years:', metrics.years);
        
        // Basic checks
        expect(metrics.totalValue).toBe(51000);
        expect(metrics.absoluteGain).toBe(1000);
        expect(metrics.percentageGain).toBeCloseTo(0.02, 4); // 2%
        
        // CAGR should be very high for short time periods
        expect(metrics.cagr).toBeGreaterThan(10); // Should be > 1000%
    });
    
    test('should handle edge case: exactly 1 day', () => {
        const exactlyOneDayLater = new Date('2024-12-16T00:00:00Z');
        const years = calculateYearsBetweenDates(testData.yesterdayDate, exactlyOneDayLater);
        const cagr = calculateCAGR(testData.currentPrice, testData.yesterdayPrice, years);
        
        console.log('Exactly 1 day - Years:', years);
        console.log('Exactly 1 day - CAGR:', (cagr * 100).toFixed(2) + '%');
        
        expect(years).toBeCloseTo(1 / 365.25, 6);
        expect(cagr).toBeGreaterThan(5); // Should be > 500%
    });
    
    test('should show N/A for CAGR in very short periods (FIXED)', () => {
        const metrics = calculatePortfolioMetrics(
            testData.btcAmount,
            testData.currentPrice,
            testData.yesterdayPrice,
            testData.yesterdayDate,
            testData.currentDate
        );
        
        console.log('FIXED BUG CHECK:');
        console.log('Input: 2% gain over 1.5 days');
        console.log('Raw CAGR: ' + (metrics.cagr * 100).toFixed(2) + '%');
        console.log('Display CAGR: ' + (metrics.displayCAGR === null ? 'N/A' : (metrics.displayCAGR * 100).toFixed(2) + '%'));
        
        // Raw CAGR should still be calculated correctly
        expect(metrics.cagr).toBeGreaterThan(10); // Still very high
        
        // Display CAGR should be null for short periods
        expect(metrics.displayCAGR).toBeNull();
        
        console.log('✅ BUG FIXED: Display CAGR shows N/A for short periods');
    });
    
    test('should show CAGR for longer periods (30+ days)', () => {
        // Test with a 45-day period
        const longerPeriodDate = new Date('2024-11-01T00:00:00Z'); // 45 days ago
        const currentDate = new Date('2024-12-16T00:00:00Z');
        
        const metrics = calculatePortfolioMetrics(
            testData.btcAmount,
            testData.currentPrice,
            testData.yesterdayPrice,
            longerPeriodDate,
            currentDate
        );
        
        console.log('LONGER PERIOD CHECK:');
        console.log('Time period: 45 days');
        console.log('Raw CAGR: ' + (metrics.cagr * 100).toFixed(2) + '%');
        console.log('Display CAGR: ' + (metrics.displayCAGR === null ? 'N/A' : (metrics.displayCAGR * 100).toFixed(2) + '%'));
        
        // For 45+ days, display CAGR should be shown
        expect(metrics.displayCAGR).not.toBeNull();
        expect(metrics.displayCAGR).toBe(metrics.cagr);
        
        console.log('✅ CAGR shown for periods >= 30 days');
    });
});