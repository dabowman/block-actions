/**
 * Interactions dispatcher — Interactivity API Store
 *
 * The engine behind non-default triggers (load / timer /
 * scroll-into-view) and conditions (viewport width, reduced motion).
 * Plain click/hover interactions never touch this module — the
 * transformer wires those as direct directives against the action's
 * own store (byte-identical to the pre-trigger pipeline for click).
 *
 * Dispatch design (review #11): the engine NEVER calls the target
 * store's action itself — a programmatic `store( ns ).actions.x()`
 * call runs in the ENGINE's scope, so `getContext()` inside the target
 * would resolve the wrong namespace. Instead the transformer arms a
 * `data-wp-on--ba-fire="{entry}"` directive against the action's OWN
 * store on the same element, and the engine dispatches a synthetic
 * cancelable `ba-fire` DOM event when the trigger condition is met.
 * The runtime then evaluates the entry with the element's real scope
 * and namespace — generator handling, withSyncEvent, everything —
 * exactly as a native click would. This also guarantees entries always
 * receive a real, preventDefault-able event.
 *
 * Config travels as server-validated `data-ba-*` attributes on the
 * element; conditions are evaluated at FIRE time via matchMedia, so
 * resizing after page load behaves correctly and nothing about the
 * server render varies (page-cache safe).
 *
 * @since 3.1.0
 */

import {
	store,
	getElement,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * The synthetic event type the runtime listens for (the transformer
 * injects `data-wp-on--ba-fire="{entry}"` alongside the engine attrs).
 *
 * @type {string}
 */
export const FIRE_EVENT = 'ba-fire';

/**
 * Read the engine config off the element.
 *
 * Exported for unit tests.
 *
 * @since 3.1.0
 *
 * @param {HTMLElement} ref The interaction's root element.
 * @return {Object} Parsed config.
 */
export function readConfig( ref ) {
	return {
		trigger: ref.getAttribute( 'data-ba-trigger' ) || 'click',
		delay: Number( ref.getAttribute( 'data-ba-delay' ) ) || 4000,
		minWidth: Number( ref.getAttribute( 'data-ba-min-width' ) ) || 0,
		maxWidth: Number( ref.getAttribute( 'data-ba-max-width' ) ) || 0,
		reducedMotion: ref.getAttribute( 'data-ba-reduced-motion' ) === 'skip',
	};
}

/**
 * Evaluate the tuple's conditions right now.
 *
 * Exported for unit tests (inject a fake matchMedia).
 *
 * @since 3.1.0
 *
 * @param {Object}   cfg  Config from readConfig().
 * @param {Function} [mm] matchMedia implementation.
 * @return {boolean} Whether the interaction may fire.
 */
export function conditionsMet( cfg, mm ) {
	const matcher =
		mm || ( typeof window !== 'undefined' && window.matchMedia );
	if ( ! matcher ) {
		return true;
	}
	if (
		cfg.minWidth &&
		! matcher( `(min-width: ${ cfg.minWidth }px)` ).matches
	) {
		return false;
	}
	if (
		cfg.maxWidth &&
		! matcher( `(max-width: ${ cfg.maxWidth }px)` ).matches
	) {
		return false;
	}
	if (
		cfg.reducedMotion &&
		matcher( '(prefers-reduced-motion: reduce)' ).matches
	) {
		return false;
	}
	return true;
}

/**
 * Fire the interaction: dispatch the synthetic event the runtime's
 * `data-wp-on--ba-fire` listener resolves in the element's OWN
 * namespace scope.
 *
 * @since 3.1.0
 *
 * @param {HTMLElement} ref The interaction's root element.
 */
function fire( ref ) {
	ref.dispatchEvent( new CustomEvent( FIRE_EVENT, { cancelable: true } ) );
}

store( 'block-actions/interactions', {
	actions: {
		/**
		 * Conditioned click/hover dispatch: check conditions against
		 * the live viewport, then hand off to the runtime.
		 *
		 * @param {Event} event The originating pointer/focus event.
		 */
		dispatch: withSyncEvent( function ( event ) {
			const { ref } = getElement();
			const cfg = readConfig( ref );
			if ( ! conditionsMet( cfg ) ) {
				// Conditions failed: let the original interaction
				// proceed normally (a link keeps navigating).
				return;
			}
			// The entry action would have preventDefault()ed the real
			// event on the fast path; it only sees the synthetic one
			// here, so cancel the original on its behalf.
			if ( typeof event?.preventDefault === 'function' ) {
				event.preventDefault();
			}
			fire( ref );
		} ),
	},

	callbacks: {
		/**
		 * Arm load / timer / scroll-into-view triggers. Returns cleanup
		 * so timers and observers die with the element (router region
		 * swaps re-arm naturally on the swapped-in markup's init).
		 */
		initTrigger() {
			const { ref } = getElement();
			const cfg = readConfig( ref );

			if ( 'load' === cfg.trigger ) {
				// Deferred one macrotask: this init is ADDITIVE next to
				// the target store's own data-wp-init, and their order
				// isn't guaranteed — firing synchronously could invoke
				// the entry before the target initialized its context.
				const timer = setTimeout(
					withScope( () => {
						if ( conditionsMet( cfg ) ) {
							fire( ref );
						}
					} ),
					0
				);
				return () => clearTimeout( timer );
			}

			if ( 'timer' === cfg.trigger ) {
				const timer = setTimeout(
					withScope( () => {
						if ( conditionsMet( cfg ) ) {
							fire( ref );
						}
					} ),
					cfg.delay
				);
				return () => clearTimeout( timer );
			}

			if ( 'scroll-into-view' === cfg.trigger ) {
				const observer = new IntersectionObserver(
					withScope( ( entries ) => {
						if ( ! entries.some( ( e ) => e.isIntersecting ) ) {
							return;
						}
						// Once-by-default: fire and disarm.
						observer.disconnect();
						if ( conditionsMet( cfg ) ) {
							fire( ref );
						}
					} ),
					{ threshold: 0.25 }
				);
				observer.observe( ref );
				return () => observer.disconnect();
			}
		},
	},
} );
