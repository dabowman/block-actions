/**
 * Scroll to Top — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

/**
 * Timer IDs per element for cleanup.
 *
 * @type {WeakMap<HTMLElement, number>}
 */
const timers = new WeakMap();

store( 'block-actions/scroll-to-top', {
    actions: {
        scrollToTop( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            const target = ref.querySelector( 'a' ) || ref;

            window.scrollTo( { top: 0, behavior: 'smooth' } );

            target.textContent = ctx.scrollingText || 'Scrolling...';

            const existingTimer = timers.get( ref );
            if ( existingTimer ) {
                clearTimeout( existingTimer );
            }
            timers.set(
                ref,
                setTimeout( () => {
                    target.textContent = ctx.originalText;
                    timers.delete( ref );
                }, 500 )
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
