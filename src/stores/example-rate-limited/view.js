/**
 * Example Rate Limited — Interactivity API Store
 *
 * Demonstrates rate limiting with class toggle.
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/example-rate-limited', {
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            ctx.isActive = ! ctx.isActive;

            const target = ref.querySelector( 'a' ) || ref;
            if ( ctx.isActive ) {
                ref.classList.add( 'is-active' );
                target.textContent = 'Active State';
            } else {
                ref.classList.remove( 'is-active' );
                target.textContent = ctx.originalText;
            }
        },
    },
    callbacks: {
        init() {
            const ctx = getContext();
            const { ref } = getElement();
            const target = ref.querySelector( 'a' ) || ref;
            ctx.originalText = target.textContent;
            ctx.isActive = false;
        },
    },
} );
