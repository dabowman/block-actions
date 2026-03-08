/**
 * Carousel — Interactivity API Store
 *
 * Hybrid approach: uses Interactivity API directives for reactive state
 * and imperative code for touch, IntersectionObserver, and accessibility setup.
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
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
            return (
                ! ctx.wrapAround &&
                ctx.currentIndex === ctx.totalSlides - 1
            );
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
        nextSlide( event ) {
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
        },

        prevSlide( event ) {
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
        },

        goToSlide( event ) {
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
        },

        handleKeydown( event ) {
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
        },
    },

    callbacks: {
        init() {
            const ctx = getContext();
            const { ref } = getElement();

            // Count slides from DOM.
            const slides = ref.querySelectorAll( '.carousel-slide' );
            ctx.totalSlides = slides.length;

            // Setup accessibility attributes.
            const container = ref.classList.contains( 'carousel-container' )
                ? ref
                : ref.querySelector( '.carousel-container' );
            if ( container ) {
                container.setAttribute( 'role', 'region' );
                container.setAttribute( 'aria-label', 'Image carousel' );
                container.setAttribute( 'tabindex', '0' );
            }

            slides.forEach( ( slide, i ) => {
                slide.setAttribute( 'role', 'tabpanel' );
                slide.setAttribute( 'aria-roledescription', 'slide' );
                slide.setAttribute(
                    'aria-label',
                    `Slide ${ i + 1 } of ${ slides.length }`
                );
            } );

            // Setup buttons accessibility.
            const prevButton = ref.querySelector( '.carousel-button-left' );
            const nextButton = ref.querySelector( '.carousel-button-right' );

            if ( prevButton ) {
                prevButton.setAttribute( 'role', 'button' );
                prevButton.setAttribute( 'aria-label', 'Previous slide' );
                prevButton.setAttribute( 'tabindex', '0' );
            }

            if ( nextButton ) {
                nextButton.setAttribute( 'role', 'button' );
                nextButton.setAttribute( 'aria-label', 'Next slide' );
                nextButton.setAttribute( 'tabindex', '0' );
            }

            // Setup thumbnails accessibility.
            const thumbnails = ref.querySelectorAll( '.carousel-thumbnail' );
            thumbnails.forEach( ( thumb, i ) => {
                thumb.setAttribute( 'role', 'tab' );
                thumb.setAttribute(
                    'aria-label',
                    `Show slide ${ i + 1 }`
                );
                thumb.setAttribute( 'tabindex', '0' );
            } );

            // Activate first thumbnail.
            if ( thumbnails.length > 0 ) {
                thumbnails[ 0 ].classList.add( 'active' );
            }

            // Setup touch support.
            if ( container ) {
                const priv = getPrivate( ref );
                container.addEventListener(
                    'touchstart',
                    ( e ) => {
                        priv.touchStartX = e.changedTouches[ 0 ].screenX;
                    },
                    { passive: true }
                );

                container.addEventListener(
                    'touchend',
                    ( e ) => {
                        const touchEndX = e.changedTouches[ 0 ].screenX;
                        const threshold = 50;

                        if ( touchEndX < priv.touchStartX - threshold ) {
                            store(
                                'block-actions/carousel'
                            ).actions.nextSlide();
                        } else if (
                            touchEndX >
                            priv.touchStartX + threshold
                        ) {
                            store(
                                'block-actions/carousel'
                            ).actions.prevSlide();
                        }
                    },
                    { passive: true }
                );
            }

            // Setup lazy loading via IntersectionObserver.
            const priv = getPrivate( ref );
            priv.observer = new IntersectionObserver(
                ( entries ) => {
                    entries.forEach( ( entry ) => {
                        if ( entry.isIntersecting ) {
                            const img =
                                entry.target.querySelector(
                                    'img[data-src]'
                                );
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
        },
    },
} );
