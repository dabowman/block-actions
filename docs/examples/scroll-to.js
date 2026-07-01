/**
 * Scroll To Action
 *
 * Smoothly scrolls to a target element when clicked.
 * Supports an optional pixel offset for fixed headers.
 *
 * Named `scroll-to` (not `smooth-scroll`) on purpose: the filename
 * becomes the action ID and the store namespace, and the plugin already
 * ships a built-in `smooth-scroll` action. Reusing a built-in name
 * would merge the two stores and the built-in renderer would win.
 *
 * Usage:
 * 1. Copy to: wp-content/themes/your-theme/actions/scroll-to.js
 * 2. Add to a Button block in the editor
 * 3. Add data-target="element-id" attribute to specify the scroll target
 * 4. Optionally add data-offset="80" for fixed header offset (in pixels)
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

store( 'block-actions/scroll-to', {
	actions: {
		// withSyncEvent is required because the handler calls
		// event.preventDefault() (WordPress 6.8+).
		handleClick: withSyncEvent( function ( event ) {
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
		} ),
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();

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
