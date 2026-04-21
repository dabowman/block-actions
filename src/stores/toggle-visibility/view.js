/**
 * Toggle Visibility — Interactivity API Store
 *
 * Declarative: the renderer binds aria-expanded / aria-controls / button
 * label via data-wp-bind and data-wp-text. The store only mutates
 * context.isVisible and toggles the external target element's class
 * (the target lives outside this block's interactive region, so class
 * sync remains imperative).
 *
 * @since 2.0.0
 */

import {
	store,
	getContext,
	withSyncEvent,
} from '@wordpress/interactivity';

const { state } = store( 'block-actions/toggle-visibility', {
	state: {
		get buttonLabel() {
			const ctx = getContext();
			return ctx.isVisible
				? ctx.hideLabel || 'Hide'
				: ctx.showLabel || 'Show';
		},
	},
	actions: {
		toggle: withSyncEvent( function ( event ) {
			event.preventDefault();
			const ctx = getContext();
			const target = document.getElementById( ctx.targetId );
			if ( ! target ) {
				return;
			}
			ctx.isVisible = ! ctx.isVisible;
			target.classList.toggle( 'is-hidden', ! ctx.isVisible );
		} ),
	},
	callbacks: {
		init() {
			const ctx = getContext();
			if ( ! ctx.targetId ) {
				return;
			}
			const target = document.getElementById( ctx.targetId );
			if ( target ) {
				ctx.isVisible = ! target.classList.contains( 'is-hidden' );
			}
		},
	},
} );

export { state };
