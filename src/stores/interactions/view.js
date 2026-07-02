/**
 * Interactions dispatcher — Interactivity API Store
 *
 * The engine behind non-default triggers (load / timer /
 * scroll-into-view) and conditions (viewport width, reduced motion).
 * Plain click/hover interactions never touch this module — the
 * transformer wires those as direct directives against the action's
 * own store (byte-identical to the pre-trigger pipeline for click).
 *
 * Config travels as server-validated `data-ba-*` attributes on the
 * element; conditions are evaluated at FIRE time via matchMedia, so
 * resizing after page load behaves correctly and nothing about the
 * server render varies (page-cache safe).
 *
 * Cross-store dispatch note (spike #1 follow-up): the entry action is
 * invoked through its own store proxy from within the element's scope,
 * which the runtime re-binds to the target namespace. Verified paths:
 * unit tests (mock registry) + the wiring itself server-side; the
 * in-browser hydration pass is called out in the PR checklist.
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
		entry: ref.getAttribute( 'data-ba-entry' ) || '',
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
 * Invoke a namespaced entry action ("ns::actions.name").
 *
 * Generator entries (copy-to-clipboard) are driven to completion here —
 * a programmatic call doesn't get the directive runtime's generator
 * handling.
 *
 * @since 3.1.0
 *
 * @param {string} entrySpec Namespaced entry reference.
 * @param {Event}  [event]   Originating event, when there is one.
 * @return {*} The action's return value.
 */
function invokeEntry( entrySpec, event ) {
	const [ namespace, path ] = entrySpec.split( '::' );
	if ( ! namespace || ! path ) {
		return;
	}
	const target = store( namespace );
	const fn = path
		.split( '.' )
		.reduce( ( obj, key ) => ( obj ? obj[ key ] : undefined ), target );
	if ( typeof fn !== 'function' ) {
		console.warn(
			`[block-actions/interactions] Entry "${ entrySpec }" is not a callable action — is the action's view module loaded?`
		);
		return;
	}
	const result = fn( event );
	if ( result && typeof result.next === 'function' ) {
		return runGenerator( result );
	}
	return result;
}

/**
 * Drive a generator (possibly yielding promises) to completion.
 *
 * @since 3.1.0
 *
 * @param {Object} gen The generator to run.
 * @return {Promise} Resolves when the generator finishes.
 */
function runGenerator( gen ) {
	function step( result ) {
		if ( result.done ) {
			return Promise.resolve( result.value );
		}
		return Promise.resolve( result.value ).then(
			( value ) => step( gen.next( value ) ),
			( error ) => step( gen.throw( error ) )
		);
	}
	return step( gen.next() );
}

store( 'block-actions/interactions', {
	actions: {
		/**
		 * Conditioned click/hover dispatch.
		 */
		dispatch: withSyncEvent( function ( event ) {
			const { ref } = getElement();
			const cfg = readConfig( ref );
			if ( ! cfg.entry || ! conditionsMet( cfg ) ) {
				return;
			}
			return invokeEntry( cfg.entry, event );
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
			if ( ! cfg.entry ) {
				return;
			}

			if ( 'load' === cfg.trigger ) {
				if ( conditionsMet( cfg ) ) {
					invokeEntry( cfg.entry );
				}
				return;
			}

			if ( 'timer' === cfg.trigger ) {
				const timer = setTimeout(
					withScope( () => {
						if ( conditionsMet( cfg ) ) {
							invokeEntry( cfg.entry );
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
							invokeEntry( cfg.entry );
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
