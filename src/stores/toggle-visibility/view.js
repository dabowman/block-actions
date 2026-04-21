/**
 * Toggle Visibility — Interactivity API Store
 *
 * @since 2.0.0
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/toggle-visibility', {
	actions: {
		toggle: withSyncEvent( function ( event ) {
			event.preventDefault();
			const { ref } = getElement();
			const limiter = getRateLimiter( ref );
			if ( ! limiter.canExecute() ) {
				return;
			}

			const ctx = getContext();
			const target = document.getElementById( ctx.targetId );
			if ( ! target ) {
				return;
			}

			ctx.isVisible = ! ctx.isVisible;
			target.classList.toggle( 'is-hidden', ! ctx.isVisible );

			const link = ref.querySelector( 'a' ) || ref;
			link.textContent = ctx.isVisible
				? ctx.hideLabel || 'Hide'
				: ctx.showLabel || 'Show';

			// Update ARIA state for accessibility.
			ref.setAttribute( 'aria-expanded', String( ctx.isVisible ) );
		} ),
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();
			const target = document.getElementById( ctx.targetId );
			if ( target ) {
				ctx.isVisible = ! target.classList.contains( 'is-hidden' );
			}

			// Set initial ARIA attributes.
			if ( ctx.targetId ) {
				ref.setAttribute( 'aria-controls', ctx.targetId );
			}
			ref.setAttribute( 'aria-expanded', String( ctx.isVisible ) );

			return () => {};
		},
	},
} );
