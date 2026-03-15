/**
 * Modal Toggle Action Example
 *
 * Opens and closes a modal/dialog when clicked.
 * Use data-modal attribute to specify the modal element ID.
 *
 * Usage:
 * 1. Copy this file to: wp-content/themes/your-theme/actions/modal-toggle.js
 * 2. Add data-modal="my-modal-id" to your button block
 * 3. Select "Modal Toggle" action in the block editor
 * 4. Create a modal element with matching ID
 *
 * Example block HTML:
 * <div class="wp-block-button" data-action="modal-toggle" data-modal="contact-modal">
 *   <a class="wp-block-button__link">Open Contact Form</a>
 * </div>
 *
 * Example modal HTML:
 * <div id="contact-modal" class="modal" hidden>
 *   <div class="modal-content">
 *     <!-- Your content -->
 *     <button class="modal-close">×</button>
 *   </div>
 * </div>
 */

( function () {
	'use strict';

	const { BaseAction } = window.BlockActions;

	/**
	 * Initialize the modal toggle action.
	 *
	 * @param {HTMLElement} element The block element.
	 */
	function init( element ) {
		const action = new BaseAction( element );

		action.target.addEventListener( 'click', ( e ) => {
			e.preventDefault();

			action.executeWithRateLimit( () => {
				const modalId = element.getAttribute( 'data-modal' );

				if ( ! modalId ) {
					action.log( 'error', 'No data-modal attribute specified' );
					return;
				}

				const modal = document.getElementById( modalId );

				if ( ! modal ) {
					action.log( 'error', `Modal #${ modalId } not found` );
					return;
				}

				// Toggle modal visibility
				const isHidden = modal.hasAttribute( 'hidden' );

				if ( isHidden ) {
					// Show modal
					modal.removeAttribute( 'hidden' );
					modal.classList.add( 'is-open' );
					document.body.style.overflow = 'hidden'; // Prevent background scroll

					// Set focus to modal for accessibility
					modal.setAttribute( 'tabindex', '-1' );
					modal.focus();

					action.log( 'info', `Opened modal #${ modalId }` );

					// Setup close handlers
					setupCloseHandlers( modal, action );
				} else {
					// Close modal
					closeModal( modal, action );
				}
			} );
		} );
	}

	/**
	 * Setup event handlers to close the modal.
	 *
	 * @param {HTMLElement} modal  The modal element.
	 * @param {Object}      action The action instance.
	 */
	function setupCloseHandlers( modal, action ) {
		// Close on close button click
		const closeButtons = modal.querySelectorAll(
			'.modal-close, [data-modal-close]'
		);
		closeButtons.forEach( ( button ) => {
			button.addEventListener(
				'click',
				() => closeModal( modal, action ),
				{ once: true }
			);
		} );

		// Close on backdrop click
		modal.addEventListener(
			'click',
			( e ) => {
				if ( e.target === modal ) {
					closeModal( modal, action );
				}
			},
			{ once: true }
		);

		// Close on Escape key
		const escapeHandler = ( e ) => {
			if ( e.key === 'Escape' ) {
				closeModal( modal, action );
				document.removeEventListener( 'keydown', escapeHandler );
			}
		};
		document.addEventListener( 'keydown', escapeHandler );
	}

	/**
	 * Close a modal.
	 *
	 * @param {HTMLElement} modal  The modal element.
	 * @param {Object}      action The action instance.
	 */
	function closeModal( modal, action ) {
		modal.setAttribute( 'hidden', '' );
		modal.classList.remove( 'is-open' );
		document.body.style.overflow = ''; // Restore scrolling

		action.log( 'info', `Closed modal #${ modal.id }` );
	}

	// Register the action
	window.BlockActions.registerAction( 'modal-toggle', 'Modal Toggle', init );
} )();
