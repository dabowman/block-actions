/**
 * Modal Toggle — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

/**
 * Private state for storing listener references per trigger element.
 *
 * @type {WeakMap<HTMLElement, Object>}
 */
const privateState = new WeakMap();

/**
 * Track the number of currently open modals to manage body overflow.
 * Only restore body scroll when all modals are closed.
 *
 * @type {number}
 */
let openModalCount = 0;

/**
 * Close the given modal and reset context state.
 *
 * @since 2.0.0
 *
 * @param {Object}      ctx   Store context.
 * @param {HTMLElement} modal The modal element.
 */
function closeModal( ctx, modal ) {
	if ( ! ctx.isOpen ) {
		return;
	}
	modal.setAttribute( 'hidden', '' );
	modal.classList.remove( 'is-open' );
	openModalCount = Math.max( 0, openModalCount - 1 );
	if ( openModalCount === 0 ) {
		document.body.style.overflow = '';
	}
	ctx.isOpen = false;
}

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
				closeModal( ctx, modal );
			} else {
				// Open modal.
				modal.removeAttribute( 'hidden' );
				modal.classList.add( 'is-open' );
				openModalCount++;
				document.body.style.overflow = 'hidden';
				modal.setAttribute( 'tabindex', '-1' );
				modal.focus();
				ctx.isOpen = true;
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

			closeModal( ctx, modal );
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();

			if ( ! ctx.modalId ) {
				return () => {};
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! modal ) {
				return () => {};
			}

			const { ref } = getElement();

			const handleCloseClick = () => {
				closeModal( ctx, modal );
			};

			const handleBackdropClick = ( e ) => {
				if ( e.target === modal ) {
					closeModal( ctx, modal );
				}
			};

			const closeButtons = modal.querySelectorAll(
				'.modal-close, [data-modal-close]'
			);
			closeButtons.forEach( ( button ) => {
				button.addEventListener( 'click', handleCloseClick );
			} );

			modal.addEventListener( 'click', handleBackdropClick );

			// Store references for cleanup.
			privateState.set( ref, {
				closeButtons,
				handleCloseClick,
				handleBackdropClick,
				modal,
			} );

			return () => {
				const priv = privateState.get( ref );
				if ( ! priv ) {
					return;
				}
				priv.closeButtons.forEach( ( button ) => {
					button.removeEventListener(
						'click',
						priv.handleCloseClick
					);
				} );
				priv.modal.removeEventListener(
					'click',
					priv.handleBackdropClick
				);
				privateState.delete( ref );
			};
		},
	},
} );
