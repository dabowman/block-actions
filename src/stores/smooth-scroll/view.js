/**
 * Smooth Scroll — Interactivity API Store
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

store( 'block-actions/smooth-scroll', {
    actions: {
        scrollToTarget( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            if ( ! ctx.targetId ) {
                return;
            }

            const targetElement = document.getElementById( ctx.targetId );
            if ( ! targetElement ) {
                return;
            }

            const targetPosition =
                targetElement.getBoundingClientRect().top +
                window.pageYOffset -
                ctx.offset;

            window.scrollTo( { top: targetPosition, behavior: 'smooth' } );

            const target = ref.querySelector( 'a' ) || ref;
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
                }, 1000 )
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
