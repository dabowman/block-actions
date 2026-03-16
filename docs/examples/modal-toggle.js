/**
 * Modal Toggle Action
 *
 * Opens and closes a modal/dialog when clicked. Includes accessibility
 * features: ESC key close, backdrop click, focus management, and body
 * scroll lock.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/modal-toggle.js
 * 2. Add to a Button block in the editor
 * 3. Add data-modal="my-modal-id" attribute to the button
 * 4. Create a modal element with matching ID:
 *
 *    <div id="my-modal-id" class="modal" hidden>
 *      <div class="modal-content">
 *        <!-- Your content -->
 *        <button class="modal-close">&times;</button>
 *      </div>
 *    </div>
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Close a modal and reset state.
 */
function closeModal( ctx, modal ) {
	if ( ! ctx.isOpen ) {
		return;
	}
	modal.setAttribute( 'hidden', '' );
	modal.classList.remove( 'is-open' );
	document.body.style.overflow = '';
	ctx.isOpen = false;
}

store( 'block-actions/modal-toggle', {
	actions: {
		handleClick( event ) {
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
				// Open modal
				modal.removeAttribute( 'hidden' );
				modal.classList.add( 'is-open' );
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
			if ( modal ) {
				closeModal( ctx, modal );
			}
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();

			// Read modal ID from data attribute
			ctx.modalId = ref.getAttribute( 'data-modal' ) || '';
			ctx.isOpen = false;

			if ( ! ctx.modalId ) {
				return () => {};
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! modal ) {
				return () => {};
			}

			// Setup close button listeners
			const handleCloseClick = () => closeModal( ctx, modal );
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

			// Cleanup on removal
			return () => {
				closeButtons.forEach( ( button ) => {
					button.removeEventListener( 'click', handleCloseClick );
				} );
				modal.removeEventListener( 'click', handleBackdropClick );
			};
		},
	},
} );
