/**
 * Test Action — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';
import { validateStyle } from '../utils/sanitize';

/**
 * Timer IDs per element for cleanup.
 *
 * @type {WeakMap<HTMLElement, number>}
 */
const timers = new WeakMap();

store( 'block-actions/test-action', {
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            const target = ref.querySelector( 'a' ) || ref;

            const activeColor = validateStyle( 'backgroundColor', 'red' );
            if ( activeColor ) {
                target.style.backgroundColor = activeColor;
            }
            target.textContent = 'it worked!';

            const existingTimer = timers.get( ref );
            if ( existingTimer ) {
                clearTimeout( existingTimer );
            }
            timers.set(
                ref,
                setTimeout( () => {
                    target.textContent = ctx.originalText;
                    target.removeAttribute( 'style' );
                    timers.delete( ref );
                }, 2000 )
            );
        },
    },
    callbacks: {
        init() {
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
        },
    },
} );
