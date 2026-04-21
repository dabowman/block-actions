/**
 * Copy to Clipboard — Interactivity API Store
 *
 * Declarative feedback: the renderer binds the anchor's text and
 * background-color to state getters driven by context.status. The
 * action flips status through 'success' | 'error' | 'idle' and the
 * view follows reactively — no imperative DOM writes.
 *
 * @since 2.0.0
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
	withScope,
} from '@wordpress/interactivity';

const timers = new WeakMap();

const { state } = store( 'block-actions/copy-to-clipboard', {
	state: {
		get buttonText() {
			const ctx = getContext();
			if ( ctx.status === 'success' ) {
				return ctx.copiedText || 'Copied! \u2713';
			}
			if ( ctx.status === 'error' ) {
				return ctx.copyFailedText || 'Copy failed';
			}
			return ctx.originalText;
		},
		get backgroundColor() {
			const ctx = getContext();
			if ( ctx.status === 'success' ) {
				return '#10b981';
			}
			if ( ctx.status === 'error' ) {
				return '#ef4444';
			}
			return '';
		},
	},
	actions: {
		copy: withSyncEvent( function* ( event ) {
			event.preventDefault();
			const ctx = getContext();
			if ( ! ctx.copyText ) {
				return;
			}

			try {
				yield navigator.clipboard.writeText( ctx.copyText );
				ctx.status = 'success';
			} catch ( error ) {
				ctx.status = 'error';
			}

			const { ref } = getElement();
			const existing = timers.get( ref );
			if ( existing ) {
				clearTimeout( existing );
			}
			timers.set(
				ref,
				setTimeout(
					withScope( () => {
						ctx.status = 'idle';
						timers.delete( ref );
					} ),
					2000
				)
			);
		} ),
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();
			const target = ref.querySelector( 'a' ) || ref;
			if ( ! ctx.originalText ) {
				ctx.originalText = target.textContent;
			}

			return () => {
				const timer = timers.get( ref );
				if ( timer ) {
					clearTimeout( timer );
					timers.delete( ref );
				}
			};
		},
	},
} );

export { state };
