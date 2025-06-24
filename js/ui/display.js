/**
 * UI display functions for updating DOM elements
 * Separates presentation logic from business logic
 */

/**
 * Update time window button states
 * @param {string} activeWindow - The currently active time window
 */
export function updateTimeWindowButtons(activeWindow) {
    const buttons = document.querySelectorAll('.time-window-btn');
    
    buttons.forEach(button => {
        const isActive = button.dataset.window === activeWindow;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive.toString());
    });
}

/**
 * Show loading state for metrics
 */
export function showMetricsLoading() {
    const metricElements = [
        'total-gain-usd',
        'total-gain-percent', 
        'cagr',
        'time-held',
        'initial-value',
        'purchase-price'
    ];
    
    metricElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'Loading...';
            element.className = 'metric-value loading';
        }
    });
}

/**
 * Show error state for metrics
 * @param {string} message - Error message to display
 */
export function showMetricsError(message = 'Unable to calculate') {
    const metricElements = [
        'total-gain-usd',
        'total-gain-percent',
        'cagr', 
        'time-held',
        'initial-value',
        'purchase-price'
    ];
    
    metricElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '--';
            element.className = 'metric-value error';
        }
    });
}

/**
 * Update the time window selection section title
 * @param {string} activeWindow - The currently active time window
 * @param {Object} windowConfig - Window configuration object
 */
export function updateTimeWindowTitle(activeWindow, windowConfig) {
    const titleElement = document.querySelector('.time-window-title');
    if (titleElement && windowConfig) {
        titleElement.textContent = `Portfolio Performance (${windowConfig.label})`;
    }
}

/**
 * Enable or disable time window buttons based on data availability
 * @param {Array} availableWindows - Array of available time window keys
 */
export function updateTimeWindowAvailability(availableWindows) {
    const buttons = document.querySelectorAll('.time-window-btn');
    
    buttons.forEach(button => {
        const window = button.dataset.window;
        const isAvailable = availableWindows.includes(window);
        
        button.disabled = !isAvailable;
        button.classList.toggle('disabled', !isAvailable);
        
        if (!isAvailable) {
            button.title = 'Insufficient historical data for this time period';
        } else {
            button.title = '';
        }
    });
}

/**
 * Show notification message
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ('info', 'warning', 'error')
 * @param {number} duration - Duration in milliseconds (0 = permanent)
 */
export function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(notification, container.firstChild);
    }
    
    // Auto-remove after duration (if specified)
    if (duration > 0) {
        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

/**
 * Update status bar with time window information
 * @param {string} activeWindow - Currently active time window
 * @param {Date} startDate - Start date for the time window
 * @param {Date} endDate - End date for the time window
 * @param {number} dataPoints - Number of data points in the range
 */
export function updateStatusWithTimeWindow(activeWindow, startDate, endDate, dataPoints) {
    const statusEl = document.getElementById('status-display');
    if (statusEl) {
        const startStr = startDate.toLocaleDateString();
        const endStr = endDate.toLocaleDateString();
        const timeText = `Time window: ${activeWindow.toUpperCase()} (${startStr} to ${endStr}, ${dataPoints} days)`;
        
        // Keep existing status and add time window info
        const currentStatus = statusEl.textContent;
        if (currentStatus && !currentStatus.includes('Time window:')) {
            statusEl.textContent = `${currentStatus} | ${timeText}`;
        } else {
            statusEl.textContent = timeText;
        }
    }
}