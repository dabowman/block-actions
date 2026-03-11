/**
 * Rate Limiter Utility
 *
 * WeakMap-based per-element rate limiting. When elements are removed
 * from the DOM, their rate limiter state is automatically garbage collected.
 *
 * @since 2.0.0
 */

/**
 * @type {WeakMap<HTMLElement, Object>}
 */
const limiters = new WeakMap();

/**
 * Create a new rate limiter instance.
 *
 * @since 2.0.0
 *
 * @param {number} maxPerSecond Maximum executions per second.
 * @return {Object} Rate limiter with canExecute() method.
 */
export function createRateLimiter( maxPerSecond = 5 ) {
    return {
        timestamps: [],
        canExecute() {
            const now = Date.now();
            this.timestamps = this.timestamps.filter( ( t ) => now - t < 1000 );
            if ( this.timestamps.length >= maxPerSecond ) {
                return false;
            }
            this.timestamps.push( now );
            return true;
        },
    };
}

/**
 * Get or create a rate limiter for a given element.
 *
 * Uses WeakMap so the limiter is GC'd when the element is removed.
 *
 * @since 2.0.0
 *
 * @param {HTMLElement} element       The DOM element to rate-limit.
 * @param {number}      maxPerSecond Maximum executions per second.
 * @return {Object} Rate limiter with canExecute() method.
 */
export function getRateLimiter( element, maxPerSecond = 5 ) {
    if ( ! limiters.has( element ) ) {
        limiters.set( element, createRateLimiter( maxPerSecond ) );
    }
    return limiters.get( element );
}
