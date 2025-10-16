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
 * @class BaseAction
 */

// Import DOMPurify for robust XSS protection
import apiFetch from '@wordpress/api-fetch';
import DOMPurify from 'dompurify';

// Removed product specificity for standalone plugin
const PRODUCT_ID = null;
const DATA_SOURCE_UUID = '';

export class BaseAction {
	/**
	 * Creates a new BaseAction instance
	 *
	 * @param {HTMLElement} element - The DOM element to attach the action to
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
	 * Safely updates element text content with XSS protection
	 *
	 * @param {string} text - Text to set
	 */
	setTextContent(text) {
		if (typeof text !== 'string') return;
		this.target.textContent = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
	}

	/**
	 * Safely updates element style with validation
	 *
	 * @param {string} property - CSS property
	 * @param {string} value - CSS value
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
	 * Makes an authenticated API request to WordPress
	 *
	 * @param {string} endpoint - WordPress API endpoint
	 * @param {Object} data - Request data
	 * @returns {Promise} API response
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
	 * Checks if the action can execute based on maximum executions per second
	 * Also tracks execution telemetry
	 *
	 * @returns {boolean} Whether the action can execute
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
	 * and release the execution lock
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
	 * Logs an error with telemetry data
	 * @deprecated Use log('error', message, error) instead
	 * @param {string} message - Error message
	 * @param {Error} error - Error object
	 */
	logError(message, error) {
		this.log('error', message, error);
	}

	/**
	 * Logs a warning message
	 * @deprecated Use log('warning', message) instead
	 * @param {string} message - Warning message
	 */
	logWarning(message) {
		this.log('warning', message);
	}

	/**
	 * Logs an info message if debug mode is enabled
	 * @deprecated Use log('info', message) instead
	 * @param {string} message - Info message
	 */
    logInfo(message) {
        if (window?.blockActions?.debug) {
            this.log('info', message);
        }
    }

	async setInitialCookieForBuyer() {
		// ToDo: We should prob take into account the store_id so if that changes the cookie is invalid. It's tied to the site_id which is tied to the store_id.
        let guestCookie = document.cookie.split('; ').find(row => row.startsWith('guest_uuid_essential_'));

		if (guestCookie) {
			this.log('info', 'Found the cookies for the guest checkout flow. We are good to continue on.');
		} else {
			this.log('info', 'No guest checkout flow cookies found');

			// This would be where we make a request to our endpoint to get the guest checkout cookies.
			this.log('info', 'Making a request to our endpoint to get the guest checkout cookies.');
			let response;
			try {
                response = await apiFetch({
                    url: `${this.restUrl}salesforce-d2c/generate-buyer-info`,
					method: 'POST',
					data: {
                        uuid: DATA_SOURCE_UUID,
					}
				});
			} catch (error) {
				console.error('Error setting the initial cookie for the buyer', error);
				return;
			}

			// Then we would set the cookies.
			this.log('info', 'Setting the cookies.');

			const buyerCookie = response.buyer_cookie;
			const cartId = response.cart_id;
			const sessionCookie = response.session_cookie;

			document.cookie = buyerCookie;
			document.cookie = sessionCookie;
			document.cookie = `vip_guest_cart_id=${cartId}; path=/;`;

			// Then we would set the cartId as well in local storage.
			this.log('info', 'Setting the cartId in local storage.');

			localStorage.setItem('cartId', cartId);

			this.log('info', 'Initial cookie for the guest checkout flow has been set.');
		}
	}

	async addItemToCart() {
		// ToDo: This should be dynamic through a quantity attribute.
		const quantity = 1;

		// ToDo: This should be dynamic and not be hardcoded like it's been done here. Perhaps the block could have a data-product-id attribute?
        const productId = PRODUCT_ID;

		// Get the cartId from local storage.
		const cartId = localStorage.getItem('cartId');

		if (!cartId) {
			this.log('error', 'No cartId found');
			return;
		}

		// Make a request to the endpoint to add the item to the cart.
		this.log('info', 'Making a request to the endpoint to add the item to the cart.');
		let response;
		try {
            const proxyUrl = `${this.restUrl}salesforce-d2c/proxy-request`;
			response = await apiFetch({
				url: proxyUrl,
				credentials: 'include',
				method: 'POST',
				data: {
					action: 'ADD_TO_CART',
					payload: {
						cartId,
						productId,
						quantity,
                        uuid: DATA_SOURCE_UUID,
					}
				}
			});
		} catch (error) {
			console.error('Error adding the item to the cart', error);
			return;
		}

		this.log('info', 'Item added to cart');
	}

	async getCartItems() {
		// Get the cartId from local storage.
		const cartId = localStorage.getItem('cartId');

		if (!cartId) {
			this.log('error', 'No cartId found');
			return;
		}

		// Make a request to the endpoint to get the cart items.
		this.log('info', 'Making a request to the endpoint to get the cart items.');
		let response;
		try {
            response = await apiFetch({
                url: `${this.restUrl}salesforce-d2c/proxy-request`,
				credentials: 'include',
				method: 'POST',
				data: {
					action: 'GET_CART_ITEMS',
					payload: {
						cartId,
                        uuid: DATA_SOURCE_UUID,
					}
				}
			});
		} catch (error) {
			console.error('Error getting the cart items', error);
			return;
		}

		localStorage.setItem('cartItems', JSON.stringify(response));
		console.log('Set local storage cart items:', response);

		return response;
	}

	/**
	 * Resets the element to its original state
	 */
	reset() {
		this.setTextContent(this.originalText);
		this.target.removeAttribute('style');
	}

	/**
	 * Centralized logging method for all log types
	 *
	 * @param {string} type - Log type: 'error', 'warning', 'info'
	 * @param {string} message - Log message
	 * @param {Error} [error] - Optional error object for error logs
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
	 * Executes a callback with rate limiting based on maximum executions per second
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
