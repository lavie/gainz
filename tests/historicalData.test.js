// Unit tests for historical data parser
import { 
    parseDate, 
    formatDate, 
    calculateDate, 
    parseHistoricalData, 
    getPriceForDate, 
    getLatestPrice, 
    getPriceRange 
} from '../js/data/historicalData.js';

// Mock console methods for cleaner test output
const originalLog = console.log;
const originalError = console.error;
beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});
afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
});

describe('Date utilities', () => {
    test('parseDate converts string to Date object', () => {
        const date = parseDate('2024-01-15');
        expect(date).toBeInstanceOf(Date);
        expect(date.getUTCFullYear()).toBe(2024);
        expect(date.getUTCMonth()).toBe(0); // January is 0
        expect(date.getUTCDate()).toBe(15);
    });

    test('parseDate throws error for invalid date', () => {
        expect(() => parseDate('invalid-date')).toThrow('Invalid date format');
        expect(() => parseDate('2024-13-01')).toThrow('Invalid date format');
    });

    test('formatDate converts Date to string', () => {
        const date = new Date('2024-01-15T00:00:00.000Z');
        expect(formatDate(date)).toBe('2024-01-15');
    });

    test('calculateDate adds days correctly', () => {
        expect(calculateDate('2024-01-15', 0)).toBe('2024-01-15');
        expect(calculateDate('2024-01-15', 1)).toBe('2024-01-16');
        expect(calculateDate('2024-01-15', 10)).toBe('2024-01-25');
        expect(calculateDate('2024-01-31', 1)).toBe('2024-02-01'); // Month boundary
    });
});

describe('parseHistoricalData', () => {
    const validData = {
        start: '2024-01-01',
        prices: [50000, 51000, 52000]
    };

    test('parses valid data correctly', () => {
        const result = parseHistoricalData(validData);
        
        expect(result.start).toBe('2024-01-01');
        expect(result.prices).toEqual([50000, 51000, 52000]);
        expect(result.totalDays).toBe(3);
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
    });

    test('throws error for invalid input', () => {
        expect(() => parseHistoricalData(null)).toThrow('Invalid historical data: must be an object');
        expect(() => parseHistoricalData('string')).toThrow('Invalid historical data: must be an object');
        expect(() => parseHistoricalData({})).toThrow('Invalid historical data: missing or invalid start date');
    });

    test('throws error for invalid start date', () => {
        expect(() => parseHistoricalData({ start: null, prices: [1000] })).toThrow('missing or invalid start date');
        expect(() => parseHistoricalData({ start: 'invalid-date', prices: [1000] })).toThrow('Invalid date format');
    });

    test('throws error for invalid prices', () => {
        expect(() => parseHistoricalData({ start: '2024-01-01', prices: null })).toThrow('prices must be an array');
        expect(() => parseHistoricalData({ start: '2024-01-01', prices: [] })).toThrow('prices array is empty');
        expect(() => parseHistoricalData({ start: '2024-01-01', prices: [1000, 'invalid', 2000] })).toThrow('invalid prices');
        expect(() => parseHistoricalData({ start: '2024-01-01', prices: [1000, -100, 2000] })).toThrow('invalid prices');
    });
});

describe('getPriceForDate', () => {
    const testData = parseHistoricalData({
        start: '2024-01-01',
        prices: [50000, 51000, 52000, 53000, 54000]
    });

    test('returns correct price for valid dates', () => {
        expect(getPriceForDate(testData, '2024-01-01')).toEqual({ date: '2024-01-01', price: 50000 });
        expect(getPriceForDate(testData, '2024-01-03')).toEqual({ date: '2024-01-03', price: 52000 });
        expect(getPriceForDate(testData, '2024-01-05')).toEqual({ date: '2024-01-05', price: 54000 });
    });

    test('returns null for dates outside range', () => {
        expect(getPriceForDate(testData, '2023-12-31')).toBeNull();
        expect(getPriceForDate(testData, '2024-01-06')).toBeNull();
        expect(getPriceForDate(testData, '2024-02-01')).toBeNull();
    });

    test('handles Date objects correctly', () => {
        const dateObj = new Date('2024-01-03T00:00:00.000Z');
        expect(getPriceForDate(testData, dateObj)).toEqual({ date: '2024-01-03', price: 52000 });
    });

    test('throws error for invalid date types', () => {
        expect(() => getPriceForDate(testData, 123)).toThrow('Target date must be a string (YYYY-MM-DD) or Date object');
        expect(() => getPriceForDate(testData, null)).toThrow('Target date must be a string (YYYY-MM-DD) or Date object');
    });
});

describe('getLatestPrice', () => {
    test('returns latest price and date', () => {
        const testData = parseHistoricalData({
            start: '2024-01-01',
            prices: [50000, 51000, 52000]
        });

        const latest = getLatestPrice(testData);
        expect(latest.price).toBe(52000);
        expect(latest.date).toBe('2024-01-03');
    });
});

describe('getPriceRange', () => {
    const testData = parseHistoricalData({
        start: '2024-01-01',
        prices: [50000, 51000, 52000, 53000, 54000] // 5 days: Jan 1-5
    });

    test('returns correct range within data bounds', () => {
        const range = getPriceRange(testData, '2024-01-02', '2024-01-04');
        
        expect(range).toHaveLength(3);
        expect(range[0]).toEqual({ date: '2024-01-02', price: 51000 });
        expect(range[1]).toEqual({ date: '2024-01-03', price: 52000 });
        expect(range[2]).toEqual({ date: '2024-01-04', price: 53000 });
    });

    test('handles partial overlap with data bounds', () => {
        const range = getPriceRange(testData, '2023-12-30', '2024-01-02');
        
        expect(range).toHaveLength(2);
        expect(range[0]).toEqual({ date: '2024-01-01', price: 50000 });
        expect(range[1]).toEqual({ date: '2024-01-02', price: 51000 });
    });

    test('returns empty array for range outside data bounds', () => {
        const range = getPriceRange(testData, '2023-12-01', '2023-12-31');
        expect(range).toHaveLength(0);
    });

    test('throws error for invalid date range', () => {
        expect(() => getPriceRange(testData, '2024-01-05', '2024-01-01')).toThrow('Start date must be before end date');
    });
});