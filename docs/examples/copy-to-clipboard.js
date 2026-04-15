/**
 * Copy to Clipboard Action
 *
 * Copies text to the user's clipboard when clicked.
 * Demonstrates generator functions for async operations and visual feedback.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/copy-to-clipboard.js
 * 2. Add to a Button block
 * 3. Add data-copy-text="Text to copy" attribute to the button
 * 4. Clicking will copy the text and show feedback
 *
 * Note: The Clipboard API requires HTTPS (or localhost).
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/copy-to-clipboard', {
	actions: {
		/**
		 * Copy text to clipboard.
		 *
		 * Uses a generator function (function*) for async clipboard access.
		 * This is required by the Interactivity API — do NOT use async/await.
		 *
		 * @param {Event} event The click event.
		 */
		*handleClick( event ) {
			event.preventDefault();
			const ctx = getContext();

			if ( ! ctx.copyText ) {
				return;
			}

			const { ref } = getElement();
			const link = ref.querySelector( 'a' ) || ref;
			const originalText = link.textContent;
			const originalBg = link.style.backgroundColor;

			try {
				yield navigator.clipboard.writeText( ctx.copyText );

				// Success feedback
				link.textContent = 'Copied! \u2713';
				link.style.backgroundColor = '#10b981';
			} catch ( error ) {
				// Error feedback
				link.textContent = 'Copy failed';
				link.style.backgroundColor = '#ef4444';
			}

			// Restore after 2 seconds
			setTimeout( () => {
				link.textContent = originalText;
				link.style.backgroundColor = originalBg;
			}, 2000 );
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement(); // eslint-disable-line @wordpress/no-unused-vars-before-return

			// Read text to copy from data attribute
			ctx.copyText = ref.getAttribute( 'data-copy-text' ) || '';

			return () => {};
		},
	},
} );
