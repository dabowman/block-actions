/**
 * Boilerplate Action Template
 *
 * Copy this file as a starting point for creating your own theme actions.
 * Theme actions are ES modules that use the WordPress Interactivity API.
 *
 * Instructions:
 * 1. Copy this file to: wp-content/themes/your-theme/actions/your-action-name.js
 * 2. Rename the file to match your action (e.g., 'toggle-menu.js')
 * 3. Update the store namespace below to match: 'block-actions/your-action-name'
 * 4. Add your custom logic in the actions and callbacks
 * 5. The action will automatically appear in the block editor dropdown
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/boilerplate-action', {
	actions: {
		/**
		 * Handle click events.
		 *
		 * The Theme_Action PHP renderer injects data-wp-on--click="actions.handleClick"
		 * on the root element, so this is called automatically on click.
		 *
		 * @param {Event} event The click event.
		 */
		handleClick( event ) {
			event.preventDefault();
			const ctx = getContext();
			const { ref } = getElement();

			// Your custom code goes here!
			ctx.clicked = true;

			// Example: Update button text
			const link = ref.querySelector( 'a' ) || ref;
			const originalText = link.textContent;
			link.textContent = 'Clicked!';

			// Example: Add a CSS class
			ref.classList.add( 'is-active' );

			// Example: Reset after 2 seconds
			setTimeout( () => {
				link.textContent = originalText;
				ref.classList.remove( 'is-active' );
			}, 2000 );
		},
	},
	callbacks: {
		/**
		 * Initialize the action.
		 *
		 * Called once when the element mounts. The Theme_Action PHP renderer
		 * injects data-wp-init="callbacks.init" on the root element.
		 *
		 * Return a cleanup function if you set up observers, timers, or listeners.
		 */
		init() {
			const ctx = getContext();

			// Read configuration from data attributes if needed
			ctx.clicked = false;

			// Return cleanup function (called when element is removed)
			return () => {
				// Clean up observers, timers, event listeners, etc.
			};
		},
	},
} );
