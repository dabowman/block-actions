/**
 * Modal Toggle — Interactivity API Store
 *
 * Shared across all modal-toggle instances: state.openCount tracks how
 * many modals are currently open so body scroll is only restored when
 * the last one closes. The state is reactive and survives client
 * navigation per the Interactivity API contract.
 *
 * @since 2.0.0
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Per-trigger listener references for cleanup.
 *
 * @type {WeakMap<HTMLElement, Object>}
 */
const privateState = new WeakMap();

const { state } = store( 'block-actions/modal-toggle', {
	state: {
		openCount: 0,
	},
	actions: {
		toggle: withSyncEvent( function ( event ) {
			event.preventDefault();
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
				modal.removeAttribute( 'hidden' );
				modal.classList.add( 'is-open' );
				state.openCount++;
				document.body.style.overflow = 'hidden';
				modal.setAttribute( 'tabindex', '-1' );
				modal.focus();
				ctx.isOpen = true;
			}
		} ),

		handleKeydown: withSyncEvent( function ( event ) {
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
		} ),
	},
	callbacks: {
		init() {
			const ctx = getContext();

			if ( ! ctx.modalId ) {
				return;
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! modal ) {
				return;
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

/**
 * Close the given modal and reset context state. Decrements the
 * shared open count and restores body scroll when the last modal
 * closes.
 *
 * @since 2.0.0
 *
 * @param {Object}      ctx   Store context for the trigger.
 * @param {HTMLElement} modal The modal element being closed.
 */
function closeModal( ctx, modal ) {
	if ( ! ctx.isOpen ) {
		return;
	}
	modal.setAttribute( 'hidden', '' );
	modal.classList.remove( 'is-open' );
	state.openCount = Math.max( 0, state.openCount - 1 );
	if ( state.openCount === 0 ) {
		document.body.style.overflow = '';
	}
	ctx.isOpen = false;
}

export { state };
