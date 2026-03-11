/**
 * Copy to Clipboard — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

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
                target.textContent = 'Copied! \u2713';
                target.style.backgroundColor = '#10b981';
                ctx.status = 'success';
            } catch ( error ) {
                target.textContent = 'Copy failed';
                target.style.backgroundColor = '#ef4444';
                ctx.status = 'error';
            }

            setTimeout( () => {
                target.textContent = ctx.originalText;
                target.removeAttribute( 'style' );
                ctx.status = 'idle';
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
