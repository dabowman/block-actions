/**
 * Modal Toggle Action
 *
 * Opens and closes a native <dialog> element when the trigger is
 * clicked. The browser provides focus trap, ESC to close, and focus
 * restore; this action layers on body scroll lock, backdrop-click to
 * close, and convenience close-button selectors.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/modal-toggle.js
 * 2. Add to a Button block in the editor
 * 3. Set data-modal="my-modal-id" on the button
 * 4. Create a <dialog> element with the matching ID:
 *
 *    <dialog id="my-modal-id">
 *      <div class="modal-content">
 *        <h2 id="my-modal-id-title">Title</h2>
 *        <p>Body content.</p>
 *        <button class="modal-close">&times;</button>
 *      </div>
 *    </dialog>
 *
 * The store mirrors the built-in modal-toggle action, minus PHP-injected
 * trigger ARIA; theme actions get all trigger ARIA via markup they write
 * themselves.
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'block-actions/modal-toggle', {
	state: {
		openCount: 0,
		priorBodyOverflow: '',
	},
	actions: {
		handleClick( event ) {
			event.preventDefault();
			const ctx = getContext();
			if ( ! ctx.modalId ) {
				return;
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! modal || typeof modal.showModal !== 'function' ) {
				return;
			}

			if ( modal.open ) {
				modal.close();
			} else {
				if ( state.openCount === 0 ) {
					state.priorBodyOverflow = document.body.style.overflow;
				}
				modal.showModal();
				state.openCount++;
				document.body.style.overflow = 'hidden';
				ctx.isOpen = true;
			}
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();

			ctx.modalId = ref.getAttribute( 'data-modal' ) || '';
			ctx.isOpen = false;

			if ( ! ctx.modalId ) {
				return () => {};
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! modal || typeof modal.showModal !== 'function' ) {
				return () => {};
			}

			const handleCloseClick = () => modal.close();
			const handleBackdropClick = ( e ) => {
				if ( e.target === modal ) {
					modal.close();
				}
			};
			const handleNativeClose = () => {
				state.openCount = Math.max( 0, state.openCount - 1 );
				if ( state.openCount === 0 ) {
					document.body.style.overflow = state.priorBodyOverflow;
				}
				ctx.isOpen = false;
			};

			const closeButtons = modal.querySelectorAll(
				'.modal-close, [data-modal-close]'
			);
			closeButtons.forEach( ( button ) => {
				button.addEventListener( 'click', handleCloseClick );
			} );
			modal.addEventListener( 'click', handleBackdropClick );
			modal.addEventListener( 'close', handleNativeClose );

			return () => {
				closeButtons.forEach( ( button ) => {
					button.removeEventListener( 'click', handleCloseClick );
				} );
				modal.removeEventListener( 'click', handleBackdropClick );
				modal.removeEventListener( 'close', handleNativeClose );
			};
		},
	},
} );
