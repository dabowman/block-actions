/**
 * Feedback Store Utilities
 *
 * Shared helpers for stores that follow the "feedback action" pattern:
 * click → perform action → show temporary text → restore after timeout.
 *
 * @since 2.0.0
 */

import { getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from './rate-limiter';

/**
 * Create an init callback that captures original text and returns a cleanup
 * function for pending timers.
 *
 * @since 2.0.0
 *
 * @param {WeakMap} timers WeakMap tracking setTimeout IDs per element.
 * @return {Function} An init callback for use in a store's callbacks object.
 */
export function createFeedbackInit( timers ) {
    return function init() {
        const ctx = getContext();
        const { ref } = getElement();
        const target = ref.querySelector( 'a' ) || ref;
        ctx.originalText = target.textContent;

        return () => {
            const timer = timers.get( ref );
            if ( timer ) {
                clearTimeout( timer );
                timers.delete( ref );
            }
        };
    };
}

/**
 * Create a synchronous action handler with rate limiting, feedback text,
 * and automatic timer-based restoration.
 *
 * @since 2.0.0
 *
 * @param {WeakMap} timers WeakMap tracking setTimeout IDs per element.
 * @param {Object}  config            Action configuration.
 * @param {Function} config.perform   Called with ( ctx, ref, target ) to execute the action.
 * @param {Function} config.feedbackText Called with ( ctx ) to get the temporary feedback string.
 * @param {number}  config.duration   Milliseconds before restoring original text.
 * @param {Function} [config.onRestore] Optional callback ( ctx, target ) on restore.
 * @return {Function} An action handler for use in a store's actions object.
 */
export function createFeedbackAction( timers, config ) {
    return function action( event ) {
        event.preventDefault();
        const { ref } = getElement();
        const limiter = getRateLimiter( ref );
        if ( ! limiter.canExecute() ) {
            return;
        }

        const ctx = getContext();
        const target = ref.querySelector( 'a' ) || ref;

        config.perform( ctx, ref, target );

        setFeedbackTimer( ref, timers, target, ctx, config );
    };
}

/**
 * Set a feedback timer that shows temporary text and restores the original
 * after a delay. Clears any existing timer for the element.
 *
 * @since 2.0.0
 *
 * @param {HTMLElement} ref    The element reference (WeakMap key).
 * @param {WeakMap}     timers WeakMap tracking setTimeout IDs per element.
 * @param {HTMLElement} target The DOM element whose text is updated.
 * @param {Object}      ctx    Store context with originalText property.
 * @param {Object}      config Timer configuration.
 * @param {Function}    config.feedbackText Called with ( ctx ) to get the temporary string.
 * @param {number}      config.duration     Milliseconds before restoring.
 * @param {Function}    [config.onRestore]  Optional callback ( ctx, target ) on restore.
 */
export function setFeedbackTimer( ref, timers, target, ctx, config ) {
    target.textContent = config.feedbackText( ctx );

    const existingTimer = timers.get( ref );
    if ( existingTimer ) {
        clearTimeout( existingTimer );
    }
    timers.set(
        ref,
        setTimeout( () => {
            target.textContent = ctx.originalText;
            if ( config.onRestore ) {
                config.onRestore( ctx, target );
            }
            timers.delete( ref );
        }, config.duration )
    );
}
