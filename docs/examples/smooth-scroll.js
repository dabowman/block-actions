/**
 * Smooth Scroll Action Example
 *
 * Smoothly scrolls to a target element when clicked.
 * Use data-target attribute to specify the target element ID.
 *
 * Usage:
 * 1. Copy this file to: wp-content/themes/your-theme/actions/smooth-scroll.js
 * 2. Add data-target="element-id" to your button block
 * 3. Select "Smooth Scroll" action in the block editor
 *
 * Example block HTML:
 * <div class="wp-block-button" data-action="smooth-scroll" data-target="contact-section">
 *   <a class="wp-block-button__link">Scroll to Contact</a>
 * </div>
 */

( function () {
	'use strict';

	// Get BaseAction class from global API
	const { BaseAction } = window.BlockActions;

	/**
	 * Initialize the smooth scroll action.
	 *
	 * @param {HTMLElement} element The block element.
	 */
	function init( element ) {
		const action = new BaseAction( element );

		action.target.addEventListener( 'click', ( e ) => {
			e.preventDefault();

			action.executeWithRateLimit( () => {
				// Get target element ID from data attribute
				const targetId = element.getAttribute( 'data-target' );

				if ( ! targetId ) {
					action.log( 'error', 'No data-target attribute specified' );
					action.setTextContent( 'Error: No target' );
					setTimeout( () => action.reset(), 2000 );
					return;
				}

				// Find the target element
				const targetElement = document.getElementById( targetId );

				if ( ! targetElement ) {
					action.log(
						'error',
						`Target element #${ targetId } not found`
					);
					action.setTextContent( 'Error: Target not found' );
					setTimeout( () => action.reset(), 2000 );
					return;
				}

				// Calculate position with optional offset
				const offset = parseInt(
					element.getAttribute( 'data-offset' ) || '0',
					10
				);
				const targetPosition =
					targetElement.getBoundingClientRect().top +
					window.pageYOffset -
					offset;

				// Smooth scroll to target
				window.scrollTo( {
					top: targetPosition,
					behavior: 'smooth',
				} );

				// Optional: Update button text temporarily
				const originalText = action.originalText;
				action.setTextContent( 'Scrolling...' );

				// Reset after scroll (approximate time)
				setTimeout( () => {
					action.setTextContent( originalText );
					action.log( 'info', `Scrolled to #${ targetId }` );
				}, 1000 );
			} );
		} );
	}

	// Register the action with Block Actions
	window.BlockActions.registerAction(
		'smooth-scroll', // Action ID (must match filename)
		'Smooth Scroll', // Label shown in block editor
		init // Initialization function
	);
} )();
