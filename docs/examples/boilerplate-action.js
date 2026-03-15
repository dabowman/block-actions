/**
 * Boilerplate Action Template
 *
 * Copy this file as a starting point for creating your own theme actions.
 *
 * Instructions:
 * 1. Copy this file to: wp-content/themes/your-theme/actions/your-action-name.js
 * 2. Rename the file to match your action (e.g., 'toggle-menu.js')
 * 3. Update the action ID and label at the bottom to match filename
 * 4. Add your custom code in the init function
 * 5. Test in the block editor - your action should appear in the dropdown
 *
 */

( function () {
	'use strict';

	// Get BaseAction class from the global API
	// This gives you access to security features, logging, rate limiting, etc.
	const { BaseAction } = window.BlockActions;

	/**
	 * Initialize your action.
	 * This function is called once when the page loads for each element with this action.
	 *
	 * @param {HTMLElement} element The DOM element (the block container).
	 */
	function init( element ) {
		// Create a BaseAction instance
		// This gives you access to helper methods and security features
		const action = new BaseAction( element );

		// Log initialization (only shows if WP_DEBUG is true)
		action.log( 'info', 'My action initialized' );

		// Example: Add a click event listener
		action.target.addEventListener( 'click', handleClick );

		/**
		 * Handle click events with rate limiting.
		 *
		 * @param {Event} event The click event.
		 */
		function handleClick( event ) {
			event.preventDefault();

			// executeWithRateLimit automatically prevents rapid clicking (spam protection)
			action.executeWithRateLimit( () => {
				// Your custom code goes here!
				// This is where you add your action's behavior

				// Example: Change button text
				action.setTextContent( 'Clicked!' );

				// Example: Add a CSS class
				element.classList.add( 'is-active' );

				// Example: Log a message
				action.log( 'info', 'Button was clicked' );

				// Example: Reset after 2 seconds
				setTimeout( () => {
					action.reset(); // Restores original text
					element.classList.remove( 'is-active' );
				}, 2000 );
			} );
		}

		// Optional: Add more event listeners as needed
		// element.addEventListener('mouseenter', handleMouseEnter);
		// element.addEventListener('mouseleave', handleMouseLeave);
	}

	// Register your action with the Block Actions plugin
	// This makes it available in the block editor
	window.BlockActions.registerAction(
		'boilerplate-action', // ID: Must match filename (without .js)
		'Boilerplate Action', // Label: Shown in block editor dropdown
		init // Function: Your initialization function above
	);
} )();
