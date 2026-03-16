/**
 * Toggle Visibility Action
 *
 * Toggles the visibility of a target element by ID.
 * Demonstrates context state, DOM manipulation, and ARIA attributes.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/toggle-visibility.js
 * 2. Add to a Button block in the editor
 * 3. Add data-target="my-element-id" attribute to the button
 * 4. Create an element with id="my-element-id" on your page
 * 5. Clicking the button will show/hide the target element
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/toggle-visibility', {
	actions: {
		handleClick( event ) {
			event.preventDefault();
			const ctx = getContext();
			const { ref } = getElement();

			if ( ! ctx.targetId ) {
				return;
			}

			const target = document.getElementById( ctx.targetId );
			if ( ! target ) {
				return;
			}

			// Toggle visibility state
			ctx.isVisible = ! ctx.isVisible;
			target.classList.toggle( 'is-hidden', ! ctx.isVisible );

			// Update button text
			const link = ref.querySelector( 'a' ) || ref;
			link.textContent = ctx.isVisible ? 'Hide' : 'Show';

			// Update ARIA state
			ref.setAttribute( 'aria-expanded', String( ctx.isVisible ) );
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();

			// Read target ID from data attribute
			ctx.targetId = ref.getAttribute( 'data-target' ) || '';
			ctx.isVisible = true;

			const target = document.getElementById( ctx.targetId );
			if ( target ) {
				ctx.isVisible = ! target.classList.contains( 'is-hidden' );
			}

			// Set initial ARIA attributes
			if ( ctx.targetId ) {
				ref.setAttribute( 'aria-controls', ctx.targetId );
			}
			ref.setAttribute( 'aria-expanded', String( ctx.isVisible ) );

			return () => {};
		},
	},
} );
