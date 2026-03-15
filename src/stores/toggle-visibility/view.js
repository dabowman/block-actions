/**
 * Toggle Visibility — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/toggle-visibility', {
	actions: {
		toggle( event ) {
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
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const target = document.getElementById( ctx.targetId );
			if ( target ) {
				ctx.isVisible = ! target.classList.contains( 'is-hidden' );
			}

			return () => {};
		},
	},
} );
