/**
 * Alert Message Action
 *
 * The simplest possible action - shows an alert when clicked.
 * Great starting point for understanding the basic structure.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/alert-message.js
 * 2. Select a Button block in the editor
 * 3. Choose "Alert Message" from the action dropdown
 * 4. Add data-message="Your custom message" to the button
 * 5. Click the button to see the alert
 *
 */

( function () {
	'use strict';

	const { BaseAction } = window.BlockActions;

	function init( element ) {
		const action = new BaseAction( element );

		// Get custom message from data attribute, or use default
		const message =
			element.getAttribute( 'data-message' ) ||
			'Hello from Block Actions!';

		action.target.addEventListener( 'click', ( e ) => {
			e.preventDefault();

			action.executeWithRateLimit( () => {
				// Show the alert
				// eslint-disable-next-line no-alert
				alert( message );

				// Log it
				action.log( 'info', `Alert shown: ${ message }` );

				// Update button text temporarily
				const originalText = action.originalText;
				action.setTextContent( 'Alert shown!' );

				setTimeout( () => {
					action.setTextContent( originalText );
				}, 1500 );
			} );
		} );
	}

	window.BlockActions.registerAction(
		'alert-message',
		'Alert Message',
		init
	);
} )();
