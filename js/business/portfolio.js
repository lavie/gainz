/**
 * Portfolio calculation functions for Bitcoin holdings
 * Pure functions for calculating portfolio value, gains, and CAGR
 */

/**
 * Calculate total USD value of BTC holdings
 * @param {number} btcAmount - Amount of BTC held
 * @param {number} currentPrice - Current BTC price in USD
 * @returns {number} Total portfolio value in USD
 */
export function calculateTotalValue(btcAmount, currentPrice) {
  if (typeof btcAmount !== 'number' || typeof currentPrice !== 'number') {
    throw new Error('BTC amount and current price must be numbers');
  }
  if (btcAmount < 0 || currentPrice < 0) {
    throw new Error('BTC amount and current price must be non-negative');
  }
  return btcAmount * currentPrice;
}

/**
 * Calculate absolute gain in USD
 * @param {number} btcAmount - Amount of BTC held
 * @param {number} currentPrice - Current BTC price in USD
 * @param {number} purchasePrice - Purchase price of BTC in USD
 * @returns {number} Absolute gain in USD
 */
export function calculateAbsoluteGain(btcAmount, currentPrice, purchasePrice) {
  if (typeof btcAmount !== 'number' || typeof currentPrice !== 'number' || typeof purchasePrice !== 'number') {
    throw new Error('All parameters must be numbers');
  }
  if (btcAmount < 0 || currentPrice < 0 || purchasePrice < 0) {
    throw new Error('All parameters must be non-negative');
  }
  
  const currentValue = btcAmount * currentPrice;
  const purchaseValue = btcAmount * purchasePrice;
  return currentValue - purchaseValue;
}

/**
 * Calculate percentage gain
 * @param {number} currentPrice - Current BTC price in USD
 * @param {number} purchasePrice - Purchase price of BTC in USD
 * @returns {number} Percentage gain (e.g., 0.25 for 25%)
 */
export function calculatePercentageGain(currentPrice, purchasePrice) {
  if (typeof currentPrice !== 'number' || typeof purchasePrice !== 'number') {
    throw new Error('Current price and purchase price must be numbers');
  }
  if (currentPrice < 0 || purchasePrice <= 0) {
    throw new Error('Prices must be positive numbers');
  }
  
  return (currentPrice - purchasePrice) / purchasePrice;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 * @param {number} currentPrice - Current BTC price in USD
 * @param {number} purchasePrice - Purchase price of BTC in USD
 * @param {number} years - Time period in years
 * @returns {number} CAGR as decimal (e.g., 0.15 for 15% annual growth)
 */
export function calculateCAGR(currentPrice, purchasePrice, years) {
  if (typeof currentPrice !== 'number' || typeof purchasePrice !== 'number' || typeof years !== 'number') {
    throw new Error('All parameters must be numbers');
  }
  if (currentPrice <= 0 || purchasePrice <= 0 || years <= 0) {
    throw new Error('All parameters must be positive numbers');
  }
  
  return Math.pow(currentPrice / purchasePrice, 1 / years) - 1;
}

/**
 * Calculate years between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Years between dates as decimal
 */
export function calculateYearsBetweenDates(startDate, endDate) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new Error('Both parameters must be Date objects');
  }
  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }
  
  const millisecondsDiff = endDate - startDate;
  const daysDiff = millisecondsDiff / (1000 * 60 * 60 * 24);
  return daysDiff / 365.25; // Account for leap years
}

/**
 * Calculate display-friendly CAGR that handles short time periods appropriately
 * @param {number} currentPrice - Current BTC price in USD
 * @param {number} purchasePrice - Purchase price of BTC in USD
 * @param {number} years - Time period in years
 * @returns {number|null} CAGR as decimal, or null if time period is too short
 */
export function calculateDisplayCAGR(currentPrice, purchasePrice, years) {
  // For periods less than 30 days, CAGR becomes unrealistic for display
  const MIN_DAYS_FOR_CAGR = 30;
  const minYearsForCAGR = MIN_DAYS_FOR_CAGR / 365.25;
  
  if (years < minYearsForCAGR) {
    return null; // Don't show CAGR for very short periods
  }
  
  return calculateCAGR(currentPrice, purchasePrice, years);
}

/**
 * Calculate portfolio metrics for a given time period
 * @param {number} btcAmount - Amount of BTC held
 * @param {number} currentPrice - Current BTC price in USD
 * @param {number} purchasePrice - Purchase price of BTC in USD
 * @param {Date} purchaseDate - Date of purchase
 * @param {Date} currentDate - Current date (default: now)
 * @returns {Object} Complete portfolio metrics
 */
export function calculatePortfolioMetrics(btcAmount, currentPrice, purchasePrice, purchaseDate, currentDate = new Date()) {
  const totalValue = calculateTotalValue(btcAmount, currentPrice);
  const absoluteGain = calculateAbsoluteGain(btcAmount, currentPrice, purchasePrice);
  const percentageGain = calculatePercentageGain(currentPrice, purchasePrice);
  const years = calculateYearsBetweenDates(purchaseDate, currentDate);
  const cagr = calculateCAGR(currentPrice, purchasePrice, years);
  const displayCAGR = calculateDisplayCAGR(currentPrice, purchasePrice, years);
  
  return {
    totalValue,
    absoluteGain,
    percentageGain,
    cagr,
    displayCAGR, // Use this for UI display
    years,
    initialValue: btcAmount * purchasePrice
  };
}