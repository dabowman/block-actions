/**
 * Test Action — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

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

            target.style.backgroundColor = 'red';
            target.textContent = 'it worked!';

            setTimeout( () => {
                target.textContent = ctx.originalText;
                target.removeAttribute( 'style' );
            }, 2000 );
        },
    },
    callbacks: {
        init() {
            const ctx = getContext();
            const { ref } = getElement();
            const target = ref.querySelector( 'a' ) || ref;
            ctx.originalText = target.textContent;
        },
    },
} );
