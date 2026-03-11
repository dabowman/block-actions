/**
 * Copy to Clipboard — Interactivity API Store
 *
 * Uses a generator function for async clipboard access. Shares init and
 * timer management with the feedback store utilities.
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';
import { validateStyle } from '../utils/sanitize';
import { createFeedbackInit, setFeedbackTimer } from '../utils/create-feedback-store';

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
                ctx.status = 'success';
            } catch ( error ) {
                ctx.status = 'error';
            }

            const isSuccess = ctx.status === 'success';
            const color = isSuccess ? '#10b981' : '#ef4444';
            const validColor = validateStyle( 'backgroundColor', color );
            if ( validColor ) {
                target.style.backgroundColor = validColor;
            }

            setFeedbackTimer( ref, timers, target, ctx, {
                feedbackText: ( c ) =>
                    isSuccess
                        ? c.copiedText || 'Copied! \u2713'
                        : c.copyFailedText || 'Copy failed',
                duration: 2000,
                onRestore( c ) {
                    target.removeAttribute( 'style' );
                    c.status = 'idle';
                },
            } );
        },
    },
    callbacks: {
        init: createFeedbackInit( timers ),
    },
} );
