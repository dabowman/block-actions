/**
 * Carousel — Interactivity API Store
 *
 * Hybrid approach: uses Interactivity API directives for reactive state
 * and imperative code for touch, IntersectionObserver, and accessibility setup.
 * The init callback returns a cleanup function per Interactivity API best
 * practices to disconnect observers and cancel pending animation frames.
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
import { getRateLimiter } from '../utils/rate-limiter';

/**
 * Private state not exposed to directives.
 *
 * @type {WeakMap<HTMLElement, Object>}
 */
const privateState = new WeakMap();

function getPrivate( el ) {
	if ( ! privateState.has( el ) ) {
		privateState.set( el, {
			rafId: null,
			observer: null,
			touchStartX: 0,
			handleTouchStart: null,
			handleTouchEnd: null,
			touchContainer: null,
		} );
	}
	return privateState.get( el );
}

const { state } = store( 'block-actions/carousel', {
	state: {
		get sliderTransform() {
			const ctx = getContext();
			return `translateX(${ -100 * ctx.currentIndex }cqw)`;
		},
		get isPrevDisabled() {
			const ctx = getContext();
			return ! ctx.wrapAround && ctx.currentIndex === 0;
		},
		get isNextDisabled() {
			const ctx = getContext();
			return ! ctx.wrapAround && ctx.currentIndex === ctx.totalSlides - 1;
		},
		get isSlideActive() {
			const ctx = getContext();
			return ctx.currentIndex === ctx.slideIndex;
		},
		get isSlideAriaHidden() {
			return ( ! state.isSlideActive ).toString();
		},
	},

	actions: {
		nextSlide: withSyncEvent( function ( event ) {
			if ( event ) {
				event.preventDefault();
			}
			const ctx = getContext();
			const { ref } = getElement();
			const root = ref.closest( '[data-wp-interactive]' ) || ref;
			const limiter = getRateLimiter( root );
			if ( ! limiter.canExecute() || ctx.isAnimating ) {
				return;
			}

			ctx.isAnimating = true;
			const priv = getPrivate( root );
			if ( priv.rafId ) {
				cancelAnimationFrame( priv.rafId );
			}

			let next = ctx.currentIndex + 1;
			if ( ctx.wrapAround ) {
				next = next % ctx.totalSlides;
			} else {
				next = Math.min( next, ctx.totalSlides - 1 );
			}

			priv.rafId = requestAnimationFrame( () => {
				ctx.currentIndex = next;
				ctx.isAnimating = false;
			} );
		} ),

		prevSlide: withSyncEvent( function ( event ) {
			if ( event ) {
				event.preventDefault();
			}
			const ctx = getContext();
			const { ref } = getElement();
			const root = ref.closest( '[data-wp-interactive]' ) || ref;
			const limiter = getRateLimiter( root );
			if ( ! limiter.canExecute() || ctx.isAnimating ) {
				return;
			}

			ctx.isAnimating = true;
			const priv = getPrivate( root );
			if ( priv.rafId ) {
				cancelAnimationFrame( priv.rafId );
			}

			let prev = ctx.currentIndex - 1;
			if ( ctx.wrapAround ) {
				prev = prev < 0 ? ctx.totalSlides - 1 : prev;
			} else {
				prev = Math.max( 0, prev );
			}

			priv.rafId = requestAnimationFrame( () => {
				ctx.currentIndex = prev;
				ctx.isAnimating = false;
			} );
		} ),

		goToSlide: withSyncEvent( function ( event ) {
			if ( event ) {
				event.preventDefault();
			}
			const ctx = getContext();
			const { ref } = getElement();
			const root = ref.closest( '[data-wp-interactive]' ) || ref;
			const limiter = getRateLimiter( root );
			if ( ! limiter.canExecute() || ctx.isAnimating ) {
				return;
			}

			ctx.isAnimating = true;
			const priv = getPrivate( root );
			if ( priv.rafId ) {
				cancelAnimationFrame( priv.rafId );
			}

			priv.rafId = requestAnimationFrame( () => {
				ctx.currentIndex = ctx.slideIndex;
				ctx.isAnimating = false;
			} );
		} ),

		handleKeydown: withSyncEvent( function ( event ) {
			const ctx = getContext();
			switch ( event.key ) {
				case 'ArrowLeft':
				case 'ArrowUp':
					event.preventDefault();
					store( 'block-actions/carousel' ).actions.prevSlide();
					break;
				case 'ArrowRight':
				case 'ArrowDown':
					event.preventDefault();
					store( 'block-actions/carousel' ).actions.nextSlide();
					break;
				case 'Home':
					event.preventDefault();
					ctx.currentIndex = 0;
					break;
				case 'End':
					event.preventDefault();
					ctx.currentIndex = ctx.totalSlides - 1;
					break;
			}
		} ),
	},

	callbacks: {
		/**
		 * Initialize carousel: count slides (for navigation math), wire up
		 * touch swipe handlers, and attach a lazy-load IntersectionObserver.
		 * Accessibility roles / aria-labels / tabindex are emitted by the
		 * PHP renderer (class-carousel.php) so they are correct on first
		 * paint and for no-JS users.
		 *
		 * @since 2.0.0
		 * @return {Function} Cleanup function that cancels pending RAF,
		 *                    disconnects the observer, and removes listeners.
		 */
		init() {
			const ctx = getContext();
			const { ref } = getElement();

			// Count slides from DOM so nav math has the right bounds.
			const slides = ref.querySelectorAll( '.carousel-slide' );
			ctx.totalSlides = slides.length;

			// Find the container element used for touch gestures.
			const container = ref.classList.contains( 'carousel-container' )
				? ref
				: ref.querySelector( '.carousel-container' );

			// Setup touch support.
			if ( container ) {
				const priv = getPrivate( ref );
				priv.touchContainer = container;

				priv.handleTouchStart = ( e ) => {
					priv.touchStartX = e.changedTouches[ 0 ].screenX;
				};

				// Wrap in withScope so getContext()/getElement() inside
				// prevSlide/nextSlide resolve to this carousel instance
				// when fired from an external DOM event listener.
				priv.handleTouchEnd = withScope( ( e ) => {
					const touchEndX = e.changedTouches[ 0 ].screenX;
					const threshold = 50;

					if ( touchEndX < priv.touchStartX - threshold ) {
						store( 'block-actions/carousel' ).actions.nextSlide();
					} else if ( touchEndX > priv.touchStartX + threshold ) {
						store( 'block-actions/carousel' ).actions.prevSlide();
					}
				} );

				container.addEventListener(
					'touchstart',
					priv.handleTouchStart,
					{ passive: true }
				);
				container.addEventListener( 'touchend', priv.handleTouchEnd, {
					passive: true,
				} );
			}

			// Setup lazy loading via IntersectionObserver.
			const priv = getPrivate( ref );
			priv.observer = new IntersectionObserver(
				( entries ) => {
					entries.forEach( ( entry ) => {
						if ( entry.isIntersecting ) {
							const img =
								entry.target.querySelector( 'img[data-src]' );
							if ( img ) {
								img.src = img.dataset.src;
								img.removeAttribute( 'data-src' );
							}
							priv.observer.unobserve( entry.target );
						}
					} );
				},
				{ rootMargin: '100% 0px', threshold: 0 }
			);

			slides.forEach( ( slide ) => {
				if ( slide.querySelector( 'img[data-src]' ) ) {
					priv.observer.observe( slide );
				}
			} );

			// Initialize first slide position.
			ctx.currentIndex = 0;

			// Return cleanup function for when element is removed.
			return () => {
				const p = getPrivate( ref );
				if ( p.rafId ) {
					cancelAnimationFrame( p.rafId );
				}
				if ( p.observer ) {
					p.observer.disconnect();
				}
				if ( p.touchContainer ) {
					p.touchContainer.removeEventListener(
						'touchstart',
						p.handleTouchStart
					);
					p.touchContainer.removeEventListener(
						'touchend',
						p.handleTouchEnd
					);
				}
			};
		},
	},
} );
