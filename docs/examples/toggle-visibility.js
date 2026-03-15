/**
 * Toggle Visibility Action
 *
 * A simple action that toggles the visibility of a target element.
 * Perfect example for learning the basics of theme actions.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/toggle-visibility.js
 * 2. Add to a Button block in the editor
 * 3. Add data-target="my-element-id" attribute to the button
 * 4. Create an element with id="my-element-id" on your page
 * 5. Clicking the button will show/hide the target element
 *
 */

( function () {
	'use strict';

	const { BaseAction } = window.BlockActions;

	function init( element ) {
		const action = new BaseAction( element );

		// Get target element ID from data attribute
		const targetId = element.getAttribute( 'data-target' );

		if ( ! targetId ) {
			action.log(
				'error',
				'Toggle Visibility: No data-target attribute specified'
			);
			return;
		}

		const targetElement = document.getElementById( targetId );

		if ( ! targetElement ) {
			action.log(
				'error',
				`Toggle Visibility: Target element #${ targetId } not found`
			);
			return;
		}

		// Track visibility state
		let isVisible = targetElement.style.display !== 'none';

		// Handle clicks
		action.target.addEventListener( 'click', ( e ) => {
			e.preventDefault();

			action.executeWithRateLimit( () => {
				// Toggle visibility
				isVisible = ! isVisible;

				if ( isVisible ) {
					targetElement.style.display = '';
					action.setTextContent( 'Hide' );
					action.log( 'info', `Showing #${ targetId }` );
				} else {
					targetElement.style.display = 'none';
					action.setTextContent( 'Show' );
					action.log( 'info', `Hiding #${ targetId }` );
				}
			} );
		} );

		action.log( 'info', 'Toggle Visibility action initialized' );
	}

	window.BlockActions.registerAction(
		'toggle-visibility',
		'Toggle Visibility',
		init
	);
} )();
