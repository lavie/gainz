/**
 * Unit tests for portfolio calculation functions
 */

import { 
    calculateTotalValue,
    calculateAbsoluteGain,
    calculatePercentageGain,
    calculateCAGR,
    calculateYearsBetweenDates,
    calculatePortfolioMetrics
} from '../js/business/portfolio.js';

describe('Portfolio Calculations', () => {
    describe('calculateTotalValue', () => {
        test('calculates correct total value', () => {
            expect(calculateTotalValue(1, 50000)).toBe(50000);
            expect(calculateTotalValue(2.5, 40000)).toBe(100000);
            expect(calculateTotalValue(0.1, 60000)).toBe(6000);
        });

        test('handles edge cases', () => {
            expect(calculateTotalValue(0, 50000)).toBe(0);
            expect(calculateTotalValue(1, 0)).toBe(0);
        });

        test('throws error for invalid inputs', () => {
            expect(() => calculateTotalValue('1', 50000)).toThrow('BTC amount and current price must be numbers');
            expect(() => calculateTotalValue(1, '50000')).toThrow('BTC amount and current price must be numbers');
            expect(() => calculateTotalValue(-1, 50000)).toThrow('BTC amount and current price must be non-negative');
            expect(() => calculateTotalValue(1, -50000)).toThrow('BTC amount and current price must be non-negative');
        });
    });

    describe('calculateAbsoluteGain', () => {
        test('calculates positive gains correctly', () => {
            expect(calculateAbsoluteGain(1, 60000, 50000)).toBe(10000);
            expect(calculateAbsoluteGain(2, 55000, 50000)).toBe(10000);
            expect(calculateAbsoluteGain(0.5, 40000, 30000)).toBe(5000);
        });

        test('calculates negative gains (losses) correctly', () => {
            expect(calculateAbsoluteGain(1, 40000, 50000)).toBe(-10000);
            expect(calculateAbsoluteGain(2, 45000, 50000)).toBe(-10000);
        });

        test('handles zero gain', () => {
            expect(calculateAbsoluteGain(1, 50000, 50000)).toBe(0);
        });

        test('throws error for invalid inputs', () => {
            expect(() => calculateAbsoluteGain('1', 60000, 50000)).toThrow('All parameters must be numbers');
            expect(() => calculateAbsoluteGain(-1, 60000, 50000)).toThrow('All parameters must be non-negative');
        });
    });

    describe('calculatePercentageGain', () => {
        test('calculates positive percentage gains correctly', () => {
            expect(calculatePercentageGain(60000, 50000)).toBeCloseTo(0.2); // 20%
            expect(calculatePercentageGain(75000, 50000)).toBeCloseTo(0.5); // 50%
            expect(calculatePercentageGain(100000, 50000)).toBeCloseTo(1.0); // 100%
        });

        test('calculates negative percentage gains correctly', () => {
            expect(calculatePercentageGain(40000, 50000)).toBeCloseTo(-0.2); // -20%
            expect(calculatePercentageGain(25000, 50000)).toBeCloseTo(-0.5); // -50%
        });

        test('handles zero gain', () => {
            expect(calculatePercentageGain(50000, 50000)).toBe(0);
        });

        test('throws error for invalid inputs', () => {
            expect(() => calculatePercentageGain('60000', 50000)).toThrow('Current price and purchase price must be numbers');
            expect(() => calculatePercentageGain(60000, 0)).toThrow('Prices must be positive numbers');
            expect(() => calculatePercentageGain(-60000, 50000)).toThrow('Prices must be positive numbers');
        });
    });

    describe('calculateCAGR', () => {
        test('calculates CAGR correctly for various scenarios', () => {
            // 100% gain over 1 year = 100% CAGR
            expect(calculateCAGR(100000, 50000, 1)).toBeCloseTo(1.0);
            
            // 100% gain over 2 years ≈ 41.42% CAGR
            expect(calculateCAGR(100000, 50000, 2)).toBeCloseTo(0.4142, 3);
            
            // 300% gain over 3 years ≈ 58.74% CAGR
            expect(calculateCAGR(200000, 50000, 3)).toBeCloseTo(0.5874, 3);
            
            // Loss scenario: -50% over 1 year
            expect(calculateCAGR(25000, 50000, 1)).toBeCloseTo(-0.5);
        });

        test('handles very short time periods', () => {
            // 100% gain over 0.5 years (6 months) = 300% CAGR
            expect(calculateCAGR(100000, 50000, 0.5)).toBeCloseTo(3.0);
        });

        test('throws error for invalid inputs', () => {
            expect(() => calculateCAGR('100000', 50000, 1)).toThrow('All parameters must be numbers');
            expect(() => calculateCAGR(100000, 0, 1)).toThrow('All parameters must be positive numbers');
            expect(() => calculateCAGR(100000, 50000, 0)).toThrow('All parameters must be positive numbers');
        });
    });

    describe('calculateYearsBetweenDates', () => {
        test('calculates years correctly', () => {
            const start = new Date('2023-01-01');
            const end = new Date('2024-01-01');
            expect(calculateYearsBetweenDates(start, end)).toBeCloseTo(1.0, 2);
        });

        test('calculates fractional years correctly', () => {
            const start = new Date('2023-01-01');
            const end = new Date('2023-07-01'); // Approximately 6 months
            expect(calculateYearsBetweenDates(start, end)).toBeCloseTo(0.5, 1);
        });

        test('handles leap years', () => {
            const start = new Date('2020-01-01'); // 2020 is a leap year
            const end = new Date('2021-01-01');
            expect(calculateYearsBetweenDates(start, end)).toBeCloseTo(1.0, 2);
        });

        test('throws error for invalid inputs', () => {
            const validDate = new Date('2023-01-01');
            expect(() => calculateYearsBetweenDates('2023-01-01', validDate)).toThrow('Both parameters must be Date objects');
            expect(() => calculateYearsBetweenDates(validDate, validDate)).toThrow('Start date must be before end date');
        });
    });

    describe('calculatePortfolioMetrics', () => {
        test('calculates complete portfolio metrics correctly', () => {
            const btcAmount = 1;
            const currentPrice = 60000;
            const purchasePrice = 50000;
            const purchaseDate = new Date('2023-01-01');
            const currentDate = new Date('2024-01-01');

            const metrics = calculatePortfolioMetrics(
                btcAmount,
                currentPrice,
                purchasePrice,
                purchaseDate,
                currentDate
            );

            expect(metrics.totalValue).toBe(60000);
            expect(metrics.absoluteGain).toBe(10000);
            expect(metrics.percentageGain).toBeCloseTo(0.2); // 20%
            expect(metrics.initialValue).toBe(50000);
            expect(metrics.years).toBeCloseTo(1.0, 2);
            expect(metrics.cagr).toBeCloseTo(0.2); // 20% CAGR for 1 year
        });

        test('handles losses correctly', () => {
            const btcAmount = 2;
            const currentPrice = 30000; // Loss scenario
            const purchasePrice = 50000;
            const purchaseDate = new Date('2023-01-01');
            const currentDate = new Date('2024-01-01');

            const metrics = calculatePortfolioMetrics(
                btcAmount,
                currentPrice,
                purchasePrice,
                purchaseDate,
                currentDate
            );

            expect(metrics.totalValue).toBe(60000);
            expect(metrics.absoluteGain).toBe(-40000);
            expect(metrics.percentageGain).toBeCloseTo(-0.4); // -40%
            expect(metrics.initialValue).toBe(100000);
            expect(metrics.cagr).toBeCloseTo(-0.4); // -40% CAGR for 1 year
        });

        test('uses current date when not provided', () => {
            const btcAmount = 1;
            const currentPrice = 60000;
            const purchasePrice = 50000;
            const purchaseDate = new Date('2023-01-01');

            const metrics = calculatePortfolioMetrics(
                btcAmount,
                currentPrice,
                purchasePrice,
                purchaseDate
            );

            // Should use current date, so years should be positive
            expect(metrics.years).toBeGreaterThan(0);
            expect(typeof metrics.cagr).toBe('number');
        });
    });
});