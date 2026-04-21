/**
 * Feedback Store Utilities
 *
 * Helpers for the "transient feedback" pattern — click an action, run a
 * side effect, flip context.isScrolling for a duration, then flip back.
 * The view's text/style is driven declaratively by state getters that
 * read context.isScrolling, so no DOM mutation happens here.
 *
 * @since 2.0.0
 */

import {
	getContext,
	getElement,
	withSyncEvent,
	withScope,
} from '@wordpress/interactivity';

/**
 * Init callback that captures the button's initial text into
 * context.originalText and returns a cleanup function that cancels
 * any pending feedback timer.
 *
 * @since 2.0.0
 *
 * @param {WeakMap} timers WeakMap tracking setTimeout IDs per element.
 * @return {Function} An init callback.
 */
export function createFeedbackInit( timers ) {
	return function init() {
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
	};
}

/**
 * Create an action handler that performs a side effect and flips
 * context.isScrolling for a configurable duration. Wrapped in
 * withSyncEvent so event.preventDefault() is safe in WP 6.8+.
 *
 * @since 2.0.0
 *
 * @param {WeakMap}  timers             WeakMap tracking setTimeout IDs per element.
 * @param {Object}   config             Action configuration.
 * @param {Function} config.perform     Called with ( ctx ) to execute the side effect.
 * @param {number}   config.duration    Milliseconds before flipping isScrolling back to false.
 * @param {Function} [config.onRestore] Optional callback ( ctx ) on restore.
 * @return {Function} An action handler.
 */
export function createFeedbackAction( timers, config ) {
	return withSyncEvent( function action( event ) {
		event.preventDefault();
		const ctx = getContext();
		const { ref } = getElement();

		config.perform( ctx );
		ctx.isScrolling = true;

		const existing = timers.get( ref );
		if ( existing ) {
			clearTimeout( existing );
		}
		timers.set(
			ref,
			setTimeout(
				withScope( () => {
					ctx.isScrolling = false;
					if ( config.onRestore ) {
						config.onRestore( ctx );
					}
					timers.delete( ref );
				} ),
				config.duration
			)
		);
	} );
}

/**
 * Derived state helper. Given a context, return the button label that
 * should be rendered: the transient feedback string while scrolling,
 * otherwise the captured original text.
 *
 * @since 2.1.0
 *
 * @param {Object} ctx Store context.
 * @return {string} Text to render.
 */
export function feedbackButtonText( ctx ) {
	if ( ctx.isScrolling ) {
		return ctx.scrollingText || 'Scrolling...';
	}
	return ctx.originalText || '';
}
