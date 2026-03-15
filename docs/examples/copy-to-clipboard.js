/**
 * Copy to Clipboard Action
 *
 * Copies text to the user's clipboard when clicked.
 * Shows how to interact with browser APIs and provide user feedback.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/copy-to-clipboard.js
 * 2. Add to a Button block
 * 3. Add data-copy-text="Text to copy" attribute to the button
 * 4. Clicking will copy the text and show feedback
 *
 */

( function () {
	'use strict';

	const { BaseAction } = window.BlockActions;

	function init( element ) {
		const action = new BaseAction( element );

		// Get text to copy from data attribute
		const textToCopy = element.getAttribute( 'data-copy-text' );

		if ( ! textToCopy ) {
			action.log(
				'error',
				'Copy to Clipboard: No data-copy-text attribute specified'
			);
			return;
		}

		action.target.addEventListener( 'click', async ( e ) => {
			e.preventDefault();

			action.executeWithRateLimit( async () => {
				try {
					// Copy to clipboard using modern API
					await navigator.clipboard.writeText( textToCopy );

					// Success feedback
					action.setTextContent( 'Copied! ✓' );
					action.setStyle( 'backgroundColor', '#10b981' ); // Green

					action.log(
						'info',
						`Copied to clipboard: ${ textToCopy }`
					);

					// Reset after 2 seconds
					setTimeout( () => {
						action.reset();
					}, 2000 );
				} catch ( error ) {
					// Error feedback
					action.setTextContent( 'Copy failed' );
					action.setStyle( 'backgroundColor', '#ef4444' ); // Red
					action.log( 'error', 'Failed to copy to clipboard', error );

					// Reset after 2 seconds
					setTimeout( () => {
						action.reset();
					}, 2000 );
				}
			} );
		} );

		action.log( 'info', 'Copy to Clipboard action initialized' );
	}

	window.BlockActions.registerAction(
		'copy-to-clipboard',
		'Copy to Clipboard',
		init
	);
} )();
