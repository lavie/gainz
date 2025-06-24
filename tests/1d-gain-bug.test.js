/**
 * Test to reproduce the 1D/7D gain calculation bug
 * Where positive gains are shown even when price has dropped
 */

import { calculatePortfolioMetrics } from '../js/business/portfolio.js';
import { getStartOfYesterday } from '../js/business/timeWindows.js';

describe('1D/7D Gain Calculation Bug', () => {
    
    test('should reproduce bug: shows positive gain when price dropped', () => {
        // Scenario: Bitcoin price dropped from yesterday to today
        const currentPrice = 45000;    // Current price (lower)
        const yesterdayPrice = 50000;  // Yesterday's price (higher)
        const btcAmount = 1;
        
        const yesterdayDate = new Date('2024-12-15T00:00:00Z');
        const currentDate = new Date('2024-12-16T12:00:00Z');
        
        console.log('=== 1D GAIN BUG TEST ===');
        console.log('Yesterday price:', yesterdayPrice);
        console.log('Current price:', currentPrice);
        console.log('Expected: NEGATIVE gain (price dropped $5,000)');
        console.log('');
        
        const metrics = calculatePortfolioMetrics(
            btcAmount,
            currentPrice,
            yesterdayPrice,  // This is the purchase price for 1D calculation
            yesterdayDate,
            currentDate
        );
        
        console.log('Results:');
        console.log('- Total Value:', metrics.totalValue);
        console.log('- Initial Value:', metrics.initialValue);
        console.log('- Absolute Gain:', metrics.absoluteGain);
        console.log('- Percentage Gain:', (metrics.percentageGain * 100).toFixed(2) + '%');
        console.log('');
        
        // The bug: this might show positive gain when it should be negative
        const expectedAbsoluteGain = (currentPrice - yesterdayPrice) * btcAmount;
        const expectedPercentageGain = (currentPrice - yesterdayPrice) / yesterdayPrice;
        
        console.log('Expected calculations:');
        console.log('- Expected Absolute Gain:', expectedAbsoluteGain);
        console.log('- Expected Percentage Gain:', (expectedPercentageGain * 100).toFixed(2) + '%');
        console.log('');
        
        if (metrics.absoluteGain > 0) {
            console.log('🚨 BUG DETECTED: Showing positive gain when price dropped!');
            console.log('Actual gain:', metrics.absoluteGain);
            console.log('Expected gain:', expectedAbsoluteGain);
        } else {
            console.log('✅ Gain calculation is correct');
        }
        
        // These should match expected values
        expect(metrics.absoluteGain).toBe(expectedAbsoluteGain);
        expect(metrics.percentageGain).toBeCloseTo(expectedPercentageGain, 4);
    });
    
    test('should verify the issue with different price scenarios', () => {
        const scenarios = [
            { 
                name: '10% drop',
                yesterday: 50000, 
                current: 45000,
                expectedGain: -5000,
                expectedPercent: -0.10
            },
            { 
                name: '5% gain',
                yesterday: 50000, 
                current: 52500,
                expectedGain: 2500,
                expectedPercent: 0.05
            },
            { 
                name: '20% drop',
                yesterday: 60000, 
                current: 48000,
                expectedGain: -12000,
                expectedPercent: -0.20
            }
        ];
        
        const btcAmount = 1;
        const yesterdayDate = new Date('2024-12-15T00:00:00Z');
        const currentDate = new Date('2024-12-16T12:00:00Z');
        
        console.log('=== MULTIPLE SCENARIO TEST ===');
        
        scenarios.forEach(scenario => {
            console.log(`\n--- ${scenario.name} ---`);
            console.log(`Yesterday: $${scenario.yesterday}, Current: $${scenario.current}`);
            
            const metrics = calculatePortfolioMetrics(
                btcAmount,
                scenario.current,
                scenario.yesterday,
                yesterdayDate,
                currentDate
            );
            
            console.log(`Actual gain: $${metrics.absoluteGain} (${(metrics.percentageGain * 100).toFixed(2)}%)`);
            console.log(`Expected gain: $${scenario.expectedGain} (${(scenario.expectedPercent * 100).toFixed(2)}%)`);
            
            const isCorrect = Math.abs(metrics.absoluteGain - scenario.expectedGain) < 0.01;
            console.log(isCorrect ? '✅ Correct' : '🚨 Bug detected!');
            
            expect(metrics.absoluteGain).toBeCloseTo(scenario.expectedGain, 2);
            expect(metrics.percentageGain).toBeCloseTo(scenario.expectedPercent, 4);
        });
    });
    
    test('should investigate how 1D period gets its start price', () => {
        // Let's trace through how the 1D calculation gets its starting price
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const startOfYesterday = getStartOfYesterday(currentDate);
        
        console.log('=== 1D PERIOD START PRICE INVESTIGATION ===');
        console.log('Current date:', currentDate.toISOString());
        console.log('Start of yesterday:', startOfYesterday.toISOString());
        console.log('Days difference:', (currentDate - startOfYesterday) / (1000 * 60 * 60 * 24));
        
        // This should help us understand if the time window logic is correct
        expect(startOfYesterday.getDate()).toBe(currentDate.getDate() - 1);
    });
});