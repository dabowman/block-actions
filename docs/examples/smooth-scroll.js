/**
 * Smooth Scroll Action
 *
 * Smoothly scrolls to a target element when clicked.
 * Supports an optional pixel offset for fixed headers.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/smooth-scroll.js
 * 2. Add to a Button block in the editor
 * 3. Add data-target="element-id" attribute to specify the scroll target
 * 4. Optionally add data-offset="80" for fixed header offset (in pixels)
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/smooth-scroll', {
	actions: {
		handleClick( event ) {
			event.preventDefault();
			const ctx = getContext();

			if ( ! ctx.targetId ) {
				return;
			}

			const target = document.getElementById( ctx.targetId );
			if ( ! target ) {
				return;
			}

			// Calculate scroll position with offset
			const top =
				target.getBoundingClientRect().top +
				window.pageYOffset -
				ctx.offset;

			window.scrollTo( { top, behavior: 'smooth' } );

			// Show temporary feedback
			const { ref } = getElement();
			const link = ref.querySelector( 'a' ) || ref;
			const originalText = link.textContent;
			link.textContent = 'Scrolling...';

			setTimeout( () => {
				link.textContent = originalText;
			}, 1000 );
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement(); // eslint-disable-line @wordpress/no-unused-vars-before-return

			// Read configuration from data attributes
			ctx.targetId = ref.getAttribute( 'data-target' ) || '';
			ctx.offset = parseInt(
				ref.getAttribute( 'data-offset' ) || '0',
				10
			);

			return () => {};
		},
	},
} );
