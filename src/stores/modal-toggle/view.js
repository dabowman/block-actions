/**
 * Modal Toggle — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/modal-toggle', {
    actions: {
        toggle( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) {
                return;
            }

            const ctx = getContext();
            if ( ! ctx.modalId ) {
                return;
            }

            const modal = document.getElementById( ctx.modalId );
            if ( ! modal ) {
                return;
            }

            if ( ctx.isOpen ) {
                // Close modal.
                modal.setAttribute( 'hidden', '' );
                modal.classList.remove( 'is-open' );
                document.body.style.overflow = '';
                ctx.isOpen = false;
            } else {
                // Open modal.
                modal.removeAttribute( 'hidden' );
                modal.classList.add( 'is-open' );
                document.body.style.overflow = 'hidden';
                modal.setAttribute( 'tabindex', '-1' );
                modal.focus();
                ctx.isOpen = true;

                // Setup close handlers.
                const closeButtons = modal.querySelectorAll(
                    '.modal-close, [data-modal-close]'
                );
                closeButtons.forEach( ( button ) => {
                    button.addEventListener(
                        'click',
                        () => {
                            modal.setAttribute( 'hidden', '' );
                            modal.classList.remove( 'is-open' );
                            document.body.style.overflow = '';
                            ctx.isOpen = false;
                        },
                        { once: true }
                    );
                } );

                // Close on backdrop click.
                modal.addEventListener(
                    'click',
                    ( e ) => {
                        if ( e.target === modal ) {
                            modal.setAttribute( 'hidden', '' );
                            modal.classList.remove( 'is-open' );
                            document.body.style.overflow = '';
                            ctx.isOpen = false;
                        }
                    },
                    { once: true }
                );
            }
        },

        handleKeydown( event ) {
            if ( event.key !== 'Escape' ) {
                return;
            }
            const ctx = getContext();
            if ( ! ctx.isOpen || ! ctx.modalId ) {
                return;
            }

            const modal = document.getElementById( ctx.modalId );
            if ( ! modal ) {
                return;
            }

            modal.setAttribute( 'hidden', '' );
            modal.classList.remove( 'is-open' );
            document.body.style.overflow = '';
            ctx.isOpen = false;
        },
    },
    callbacks: {
        init() {
            // No-op: context is set by PHP renderer.
        },
    },
} );
