/**
 * Alert Message Action
 *
 * The simplest possible action — shows an alert when clicked.
 * Great starting point for understanding the basic structure.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/alert-message.js
 * 2. Select a Button block in the editor
 * 3. Choose "Alert Message" from the action dropdown
 * 4. Click the button on the frontend to see the alert
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/alert-message', {
	actions: {
		handleClick( event ) {
			event.preventDefault();
			const ctx = getContext();
			const { ref } = getElement();

			// Get custom message from context (set during init)
			const message = ctx.message || 'Hello from Block Actions!';

			// Show the alert
			// eslint-disable-next-line no-alert
			alert( message );

			// Update button text temporarily
			const link = ref.querySelector( 'a' ) || ref;
			const originalText = link.textContent;
			link.textContent = 'Alert shown!';

			setTimeout( () => {
				link.textContent = originalText;
			}, 1500 );
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();

			// Read custom message from data attribute
			ctx.message =
				ref.getAttribute( 'data-message' ) ||
				'Hello from Block Actions!';

			return () => {};
		},
	},
} );
