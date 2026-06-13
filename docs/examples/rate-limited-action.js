/**
 * Rate-Limited Action
 *
 * Demonstrates per-element rate limiting for actions that trigger
 * expensive work (network requests, heavy computation). Rate limiting
 * is for I/O — plain UI clicks don't need it; guard those with a
 * context flag instead (see the built-in carousel's isAnimating).
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/rate-limited-action.js
 * 2. Add to a Button block in the editor
 * 3. Rapid clicks beyond 5 per second are ignored
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Per-element rate limiter state. WeakMap keys on the DOM element, so
 * the limiter is garbage-collected when the element leaves the DOM.
 *
 * @type {WeakMap<HTMLElement, number[]>}
 */
const timestamps = new WeakMap();

/**
 * Whether the element may execute again, allowing at most
 * `maxPerSecond` executions in any rolling one-second window.
 *
 * @param {HTMLElement} element      The element to rate-limit.
 * @param {number}      maxPerSecond Maximum executions per second.
 * @return {boolean} True when execution is allowed.
 */
function canExecute( element, maxPerSecond = 5 ) {
	const now = Date.now();
	const recent = ( timestamps.get( element ) || [] ).filter(
		( t ) => now - t < 1000
	);
	if ( recent.length >= maxPerSecond ) {
		timestamps.set( element, recent );
		return false;
	}
	recent.push( now );
	timestamps.set( element, recent );
	return true;
}

store( 'block-actions/rate-limited-action', {
	actions: {
		// withSyncEvent is required because the handler calls
		// event.preventDefault() (WP 6.8+).
		handleClick: withSyncEvent( function* ( event ) {
			event.preventDefault();
			const { ref } = getElement();
			if ( ! canExecute( ref ) ) {
				return;
			}

			const ctx = getContext();
			ctx.requestCount = ( ctx.requestCount || 0 ) + 1;

			// The expensive part this limiter protects — e.g. an API call.
			// Generator + yield (never async/await) for async work:
			try {
				const response = yield fetch( '/wp-json/' );
				ctx.lastStatus = response.status;
			} catch ( error ) {
				ctx.lastStatus = 'error';
			}
		} ),
	},
	callbacks: {
		init() {
			return () => {};
		},
	},
} );
