/**
 * Base Action Class
 *
 * Provides common utilities and security features for all actions.
 * This is the foundation class that all actions should extend from.
 *
 * Features:
 * - XSS Protection with DOMPurify
 * - Rate limiting (max executions per second)
 * - Telemetry and logging
 * - Safe DOM manipulation
 * - API request handling with security
 *
 * @since 1.0.0
 *
 * @class BaseAction
 */

// Import DOMPurify for robust XSS protection
import DOMPurify from 'dompurify';

/**
 * Base Action Class
 * 
 * Exported globally as window.BlockActions.BaseAction for use in theme actions.
 */
export class BaseAction {
	/**
	 * Creates a new BaseAction instance.
	 *
	 * @since 1.0.0
	 *
	 * @param {HTMLElement} element The DOM element to attach the action to.
	 */
	constructor(element) {
		this.element = element;
		this.target = element.querySelector('a') || element;
		this.originalText = this.target.textContent;
		this.isExecuting = false;
        this.nonce = window?.blockActions?.nonce || '';
		this.actionId = element.getAttribute('data-action');
        this.restUrl = window?.blockActions?.restUrl || '';

		// Track recent execution timestamps for rate limiting
		this.executionTimestamps = [];

		// Simple telemetry - only track what's necessary
		this.telemetry = {
			execCount: 0,        // Total number of executions
			errorCount: 0,       // Total number of errors
			lastExecTime: null,  // Timestamp of last execution (for rate limiting)
			lastDuration: 0      // Last execution duration in ms (for performance)
		};
	}

	/**
	 * Safely updates element text content with XSS protection.
	 *
	 * @since 1.0.0
	 *
	 * @param {string} text Text to set.
	 * @return {void}
	 */
	setTextContent(text) {
		if (typeof text !== 'string') return;
		this.target.textContent = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
	}

	/**
	 * Safely updates element style with validation.
	 *
	 * @since 1.0.0
	 *
	 * @param {string} property CSS property name.
	 * @param {string} value    CSS value to set.
	 * @return {void}
	 */
	setStyle(property, value) {
		// Whitelist of allowed CSS properties and their valid values
		const allowedStyles = {
			backgroundColor: /^(#[0-9A-Fa-f]{6}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|[a-zA-Z]+)$/,
			color: /^(#[0-9A-Fa-f]{6}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|[a-zA-Z]+)$/,
			opacity: /^(0(\.\d+)?|1(\.0+)?)$/
		};

        if (!allowedStyles[property] || !allowedStyles[property].test(value)) {
            console.warn(`[Block Actions] Invalid style ${property}: ${String(value)}`);
            return;
        }

		this.target.style[property] = value;
	}

	/**
	 * Makes an authenticated API request to WordPress.
	 *
	 * @since 1.0.0
	 *
	 * @param {string} endpoint WordPress API endpoint.
	 * @param {Object} data     Request data to send.
	 * @return {Promise} Promise that resolves to the API response.
	 */
	async apiRequest(endpoint, data = {}) {
		try {
            const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': this.nonce
				},
				body: JSON.stringify(data),
				credentials: 'same-origin'
			});

			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
            this.log('error', 'API Request Failed', error);
            throw error;
		}
	}

	/**
	 * Checks if the action can execute based on maximum executions per second.
	 * Also tracks execution telemetry.
	 *
	 * @since 1.0.0
	 *
	 * @return {boolean} True if the action can execute, false if rate limited.
	 */
	canExecute() {
		const now = Date.now();
		const MAX_EXECUTIONS_PER_SECOND = 5; // Maximum actions per second
		const ONE_SECOND = 1000; // 1 second in milliseconds

		// Remove timestamps older than 1 second
		this.executionTimestamps = this.executionTimestamps.filter(
			timestamp => now - timestamp < ONE_SECOND
		);

		// Check if we've exceeded our rate limit
		if (this.executionTimestamps.length >= MAX_EXECUTIONS_PER_SECOND) {
			return false;
		}

		// Add current timestamp to our history
		this.executionTimestamps.push(now);

		// Action can execute - update state and telemetry
		this.isExecuting = true;
		this.telemetry.execCount++;
		this.telemetry.lastExecTime = now;

		// Start tracking execution time for performance monitoring
		this._execStartTime = performance.now();

		// Safety timeout - automatically release lock after timeout
		// to prevent deadlocks if completeExecution is never called
        this._safetyTimeout = setTimeout(() => {
			if (this.isExecuting) {
				this.isExecuting = false;
			}
		}, 3000); // 3 second timeout

		return true;
	}

	/**
	 * Call this when execution is complete to properly update telemetry
	 * and release the execution lock.
	 *
	 * @since 1.0.0
	 *
	 * @return {void}
	 */
	completeExecution() {
		// Ignore if not executing (prevents errors from multiple calls)
		if (!this.isExecuting) return;

		// Clear safety timeout since we're completing normally
		if (this._safetyTimeout) {
			clearTimeout(this._safetyTimeout);
			this._safetyTimeout = null;
		}

		// Track execution duration for performance insights
		if (this._execStartTime) {
			this.telemetry.lastDuration = performance.now() - this._execStartTime;
			this._execStartTime = null;
		}

		// Release execution lock
		this.isExecuting = false;
	}

	/**
	 * Resets the element to its original state.
	 *
	 * @since 1.0.0
	 *
	 * @return {void}
	 */
	reset() {
		this.setTextContent(this.originalText);
		this.target.removeAttribute('style');
	}

	/**
	 * Centralized logging method for all log types.
	 *
	 * @since 1.0.0
	 *
	 * @param {string}      type    Log type: 'error', 'warning', or 'info'.
	 * @param {string}      message Log message to display.
	 * @param {Error|null} [error]  Optional error object for error logs.
	 * @return {void}
	 */
    log(type, message, error = null) {
        const prefix = '[Block Actions]';
        switch (type) {
            case 'error':
                console.error(`${prefix} ${message}`, error || '');
                this.telemetry.errorCount++;
                break;
            case 'warning':
                console.warn(`${prefix} ${message}`);
                break;
            default:
                if (window?.blockActions?.debug) {
                    console.log(`${prefix} ${message}`);
                }
        }
    }

	/**
	 * Executes a callback with rate limiting based on maximum executions per second.
	 *
	 * @since 1.0.0
	 *
	 * @param {Function} callback Function to execute with rate limiting.
	 * @return {boolean} True if executed successfully, false if rate limited or error occurred.
	 */
	executeWithRateLimit(callback) {
		if (!this.canExecute()) {
			return false;
		}

		try {
			callback();
			return true;
		} catch (error) {
			this.log('error', 'Error in rate-limited execution', error);
			return false;
		} finally {
			this.completeExecution();
		}
	}
}
