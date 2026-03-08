/**
 * Toggle Visibility — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/toggle-visibility', {
    actions: {
        toggle( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            const target = document.getElementById( ctx.targetId );
            if ( ! target ) {
                return;
            }

            ctx.isVisible = ! ctx.isVisible;
            target.style.display = ctx.isVisible ? '' : 'none';

            const link = ref.querySelector( 'a' ) || ref;
            link.textContent = ctx.isVisible ? 'Hide' : 'Show';
        },
    },
    callbacks: {
        init() {
            const ctx = getContext();
            const target = document.getElementById( ctx.targetId );
            if ( target ) {
                ctx.isVisible = target.style.display !== 'none';
            }
        },
    },
} );
