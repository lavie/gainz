/**
 * Test to reproduce chart vs metrics disagreement
 * Chart shows price going down, but metrics show positive gain
 */

import { getPriceForDate, parseHistoricalData, getLatestPrice } from '../js/data/historicalData.js';
import { getStartOfYesterday } from '../js/business/timeWindows.js';
import { calculatePortfolioMetrics } from '../js/business/portfolio.js';

describe('Chart vs Metrics Disagreement', () => {
    
    test('should reproduce the bug: chart down, metrics up', () => {
        console.log('=== CHART VS METRICS DISAGREEMENT TEST ===');
        
        // Historical data that shows price declining
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-14",
            prices: [
                55000,  // 2024-12-14 (2 days ago)
                50000,  // 2024-12-15 (yesterday) 
                47000   // 2024-12-16 (today's historical)
            ]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const apiCurrentPrice = 52500; // API price is HIGHER than latest historical
        const btcAmount = 1;
        
        console.log('Historical price data:');
        console.log('2024-12-14: $55,000');
        console.log('2024-12-15: $50,000 (yesterday)');
        console.log('2024-12-16: $47,000 (today historical)');
        console.log('');
        console.log('API current price: $52,500');
        console.log('');
        
        // === CHART DATA (what user sees in chart) ===
        const startOfYesterday = getStartOfYesterday(currentDate);
        const chartStartPrice = getPriceForDate(mockHistoricalData, startOfYesterday);
        const chartEndPrice = getLatestPrice(mockHistoricalData); // Latest historical
        
        console.log('CHART DATA:');
        console.log('Chart start (yesterday):', chartStartPrice);
        console.log('Chart end (latest historical):', chartEndPrice);
        
        const chartChange = chartEndPrice.price - chartStartPrice.price;
        const chartChangePercent = (chartChange / chartStartPrice.price) * 100;
        
        console.log('Chart shows change: $' + chartChange + ' (' + chartChangePercent.toFixed(1) + '%)');
        console.log('Chart visual: Price went DOWN from $50k to $47k');
        console.log('');
        
        // === METRICS DATA (what user sees in metrics box) ===
        const metrics = calculatePortfolioMetrics(
            btcAmount,
            apiCurrentPrice,        // Using API price (52500)
            chartStartPrice.price,  // Using same start as chart (50000)
            new Date(chartStartPrice.date),
            currentDate
        );
        
        console.log('METRICS CALCULATION:');
        console.log('Metrics start price:', chartStartPrice.price);
        console.log('Metrics current price (API):', apiCurrentPrice);
        console.log('Metrics absolute gain:', metrics.absoluteGain);
        console.log('Metrics percentage gain:', (metrics.percentageGain * 100).toFixed(1) + '%');
        console.log('');
        
        // === THE BUG ===
        const chartGoesDown = chartChange < 0;
        const metricsShowGain = metrics.absoluteGain > 0;
        
        console.log('BUG CHECK:');
        console.log('Chart shows decline:', chartGoesDown);
        console.log('Metrics show gain:', metricsShowGain);
        
        if (chartGoesDown && metricsShowGain) {
            console.log('🚨 BUG CONFIRMED: Chart and metrics disagree!');
            console.log('User sees: Chart going down, but +5% gain in metrics');
            console.log('');
            console.log('ROOT CAUSE:');
            console.log('- Chart uses historical data only: $50k → $47k');
            console.log('- Metrics use API current price: $50k → $52.5k');
            console.log('- API price ($52.5k) ≠ Latest historical ($47k)');
        } else {
            console.log('✅ Chart and metrics agree');
        }
        
        // Document the expected behavior
        expect(chartGoesDown).toBe(true);
        expect(metricsShowGain).toBe(true);
        expect(apiCurrentPrice).not.toBe(chartEndPrice.price);
    });
    
    test('should show what the fix should look like', () => {
        console.log('=== PROPOSED FIX ===');
        
        const mockHistoricalData = parseHistoricalData({
            start: "2024-12-14", 
            prices: [55000, 50000, 47000]
        });
        
        const currentDate = new Date('2024-12-16T12:00:00Z');
        const apiCurrentPrice = 52500;
        const btcAmount = 1;
        
        const startOfYesterday = getStartOfYesterday(currentDate);
        const chartStartPrice = getPriceForDate(mockHistoricalData, startOfYesterday);
        
        console.log('SOLUTION OPTIONS:');
        console.log('');
        
        console.log('Option 1: Use API price for both chart and metrics');
        console.log('- Chart: $50k → $52.5k (API current)');
        console.log('- Metrics: $50k → $52.5k (API current)');
        console.log('- Result: Both show +5% gain');
        console.log('- Problem: Chart loses historical context');
        console.log('');
        
        console.log('Option 2: Use historical data for both chart and metrics');
        console.log('- Chart: $50k → $47k (historical)');
        console.log('- Metrics: $50k → $47k (historical)');
        console.log('- Result: Both show -6% loss');
        console.log('- Problem: Metrics not using current market price');
        console.log('');
        
        console.log('Option 3: Add API current price point to chart');
        console.log('- Chart: $50k → $47k → $52.5k (show both historical and current)');
        console.log('- Metrics: $50k → $52.5k (API current)');
        console.log('- Result: Chart shows full story, metrics use current price');
        console.log('- This is probably the best solution');
        
        // The fix should ensure consistency
        expect(true).toBe(true); // Placeholder for fix verification
    });
});