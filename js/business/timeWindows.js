/**
 * Time window filtering functions for historical price data
 * Pure functions for filtering data by time ranges
 */

/**
 * Available time windows
 */
export const TIME_WINDOWS = {
  '1d': { days: 1, label: '1 Day', type: 'daily' },
  'wtd': { days: null, label: 'This Week', type: 'calendar' },
  'mtd': { days: null, label: 'This Month', type: 'calendar' },
  'ytd': { days: null, label: 'This Year', type: 'calendar' },
  '7d': { days: 7, label: '7 Days', type: 'fixed' },
  '30d': { days: 30, label: '30 Days', type: 'fixed' },
  '3mo': { days: 90, label: '3 Months', type: 'fixed' },
  '6mo': { days: 180, label: '6 Months', type: 'fixed' },
  '1y': { days: 365, label: '1 Year', type: 'fixed' },
  '5y': { days: 1825, label: '5 Years', type: 'fixed' },
  'all': { days: Infinity, label: 'All Time', type: 'fixed' }
};

/**
 * Get date that is N days ago from a reference date
 * @param {Date} referenceDate - Reference date (default: now)
 * @param {number} daysAgo - Number of days to go back
 * @returns {Date} Date that is N days ago
 */
export function getDateDaysAgo(referenceDate = new Date(), daysAgo) {
  if (!(referenceDate instanceof Date)) {
    throw new Error('Reference date must be a Date object');
  }
  if (typeof daysAgo !== 'number' || daysAgo < 0) {
    throw new Error('Days ago must be a non-negative number');
  }
  
  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() - daysAgo);
  return targetDate;
}

/**
 * Get start of week (Monday) for a given date
 * @param {Date} date - Reference date
 * @returns {Date} Start of week date
 */
export function getStartOfWeek(date = new Date()) {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

/**
 * Get start of month for a given date
 * @param {Date} date - Reference date
 * @returns {Date} Start of month date
 */
export function getStartOfMonth(date = new Date()) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth;
}

/**
 * Get start of year for a given date
 * @param {Date} date - Reference date
 * @returns {Date} Start of year date
 */
export function getStartOfYear(date = new Date()) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);
  return startOfYear;
}

/**
 * Get start of yesterday (previous day's close) for a given date
 * This represents the last market close before the current period
 * @param {Date} date - Reference date
 * @returns {Date} Start of yesterday date
 */
export function getStartOfYesterday(date = new Date()) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

/**
 * Get start date for calendar-based time windows
 * @param {string} timeWindow - Time window key
 * @param {Date} referenceDate - Reference date (default: now)
 * @returns {Date} Start date for the time window
 */
export function getCalendarStartDate(timeWindow, referenceDate = new Date()) {
  switch (timeWindow) {
    case '1d':
      return getStartOfYesterday(referenceDate);
    case 'wtd':
      return getStartOfWeek(referenceDate);
    case 'mtd':
      return getStartOfMonth(referenceDate);
    case 'ytd':
      return getStartOfYear(referenceDate);
    default:
      throw new Error(`Invalid calendar time window: ${timeWindow}`);
  }
}

/**
 * Filter historical price data by time window
 * @param {Array} priceData - Array of {date: Date, price: number} objects
 * @param {string} timeWindow - Time window key (e.g., '1d', '7d', '30d', 'wtd', 'mtd', 'ytd')
 * @param {Date} referenceDate - Reference date for filtering (default: now)
 * @returns {Array} Filtered price data array
 */
export function filterByTimeWindow(priceData, timeWindow, referenceDate = new Date()) {
  if (!Array.isArray(priceData)) {
    throw new Error('Price data must be an array');
  }
  if (typeof timeWindow !== 'string') {
    throw new Error('Time window must be a string');
  }
  if (!(referenceDate instanceof Date)) {
    throw new Error('Reference date must be a Date object');
  }
  
  const windowConfig = TIME_WINDOWS[timeWindow];
  if (!windowConfig) {
    throw new Error(`Invalid time window: ${timeWindow}. Valid options: ${Object.keys(TIME_WINDOWS).join(', ')}`);
  }
  
  // Return all data for 'all' time window
  if (timeWindow === 'all') {
    return [...priceData];
  }
  
  let cutoffDate;
  
  if (windowConfig.type === 'calendar' || windowConfig.type === 'daily') {
    cutoffDate = getCalendarStartDate(timeWindow, referenceDate);
  } else {
    cutoffDate = getDateDaysAgo(referenceDate, windowConfig.days);
  }
  
  return priceData.filter(dataPoint => {
    if (!dataPoint.date || !(dataPoint.date instanceof Date)) {
      throw new Error('Each price data point must have a valid Date object in the date property');
    }
    return dataPoint.date >= cutoffDate;
  });
}

/**
 * Get the earliest date from filtered data for a time window
 * @param {Array} priceData - Array of {date: Date, price: number} objects
 * @param {string} timeWindow - Time window key
 * @param {Date} referenceDate - Reference date for filtering (default: now)
 * @returns {Date|null} Earliest date in the filtered data, or null if no data
 */
export function getEarliestDateForWindow(priceData, timeWindow, referenceDate = new Date()) {
  const filteredData = filterByTimeWindow(priceData, timeWindow, referenceDate);
  
  if (filteredData.length === 0) {
    return null;
  }
  
  return filteredData.reduce((earliest, dataPoint) => {
    return dataPoint.date < earliest ? dataPoint.date : earliest;
  }, filteredData[0].date);
}

/**
 * Get the latest date from filtered data for a time window
 * @param {Array} priceData - Array of {date: Date, price: number} objects
 * @param {string} timeWindow - Time window key
 * @param {Date} referenceDate - Reference date for filtering (default: now)
 * @returns {Date|null} Latest date in the filtered data, or null if no data
 */
export function getLatestDateForWindow(priceData, timeWindow, referenceDate = new Date()) {
  const filteredData = filterByTimeWindow(priceData, timeWindow, referenceDate);
  
  if (filteredData.length === 0) {
    return null;
  }
  
  return filteredData.reduce((latest, dataPoint) => {
    return dataPoint.date > latest ? dataPoint.date : latest;
  }, filteredData[0].date);
}

/**
 * Get available time windows based on data availability
 * @param {Array} priceData - Array of {date: Date, price: number} objects
 * @param {Date} referenceDate - Reference date for filtering (default: now)
 * @returns {Array} Array of available time window keys
 */
export function getAvailableTimeWindows(priceData, referenceDate = new Date()) {
  if (!Array.isArray(priceData) || priceData.length === 0) {
    return [];
  }
  
  const earliestDate = priceData.reduce((earliest, dataPoint) => {
    return dataPoint.date < earliest ? dataPoint.date : earliest;
  }, priceData[0].date);
  
  const daysSinceEarliest = Math.floor((referenceDate - earliestDate) / (1000 * 60 * 60 * 24));
  
  return Object.keys(TIME_WINDOWS).filter(window => {
    const windowConfig = TIME_WINDOWS[window];
    
    if (window === 'all') {
      return true;
    }
    
    if (windowConfig.type === 'calendar' || windowConfig.type === 'daily') {
      // For calendar windows, check if we have data going back to the start of the period
      try {
        const startDate = getCalendarStartDate(window, referenceDate);
        return earliestDate <= startDate;
      } catch (error) {
        return false;
      }
    } else {
      // For fixed windows, check if we have enough days of data
      return windowConfig.days <= daysSinceEarliest;
    }
  });
}

/**
 * Validate time window key
 * @param {string} timeWindow - Time window key to validate
 * @returns {boolean} True if valid time window
 */
export function isValidTimeWindow(timeWindow) {
  return typeof timeWindow === 'string' && timeWindow in TIME_WINDOWS;
}