/**
 * Copy to Clipboard — Interactivity API Store
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

store( 'block-actions/copy-to-clipboard', {
    actions: {
        *copy( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            if ( ! ctx.copyText ) {
                return;
            }

            const target = ref.querySelector( 'a' ) || ref;

            try {
                yield navigator.clipboard.writeText( ctx.copyText );
                target.textContent = ctx.copiedText || 'Copied! \u2713';
                const successColor = validateStyle(
                    'backgroundColor',
                    '#10b981'
                );
                if ( successColor ) {
                    target.style.backgroundColor = successColor;
                }
                ctx.status = 'success';
            } catch ( error ) {
                target.textContent = ctx.copyFailedText || 'Copy failed';
                const errorColor = validateStyle(
                    'backgroundColor',
                    '#ef4444'
                );
                if ( errorColor ) {
                    target.style.backgroundColor = errorColor;
                }
                ctx.status = 'error';
            }

            const existingTimer = timers.get( ref );
            if ( existingTimer ) {
                clearTimeout( existingTimer );
            }
            timers.set(
                ref,
                setTimeout( () => {
                    target.textContent = ctx.originalText;
                    target.removeAttribute( 'style' );
                    ctx.status = 'idle';
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
