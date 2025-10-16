/**
 * Unified carousel action for all carousel types
 * Handles image carousels with buttons, thumbnails, or both
 * Uses container queries for more reliable layouts
 *
 * Supports two structure options:
 * 1. Block element contains a child with class 'carousel-container'
 * 2. Block element itself has class 'carousel-container'
 *
 * @param {HTMLElement} element - The carousel element or parent element.
 */
import { BaseAction } from './base-action';

export const actionName = 'carousel';

export default function init(element) {
    const action = new BaseAction(element);
    let isAnimating = false;
    let rafId = null;

    // Ensure initialization happens after DOM is ready
    function initialize() {
        const elements = findElements();
        if (!elements) return;

        // Cache all slides upfront for better performance
        elements.slideElements = Array.from(elements.slides);

        const carouselController = setupCarousel(elements);
        setupAccessibility(elements, carouselController);
        setupTouchSupport(elements, carouselController);
        setupLazyLoading(elements);
    }

    function setupLazyLoading({ slideElements }) {
        const options = {
            root: null,
            rootMargin: '100% 0px', // Load one screen ahead
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const slide = entry.target;
                    const lazyImage = slide.querySelector('img[data-src]');
                    if (lazyImage) {
                        lazyImage.src = lazyImage.dataset.src;
                        lazyImage.removeAttribute('data-src');
                    }
                    observer.unobserve(slide);
                }
            });
        }, options);

        slideElements.forEach(slide => {
            const image = slide.querySelector('img[data-src]');
            if (image) {
                observer.observe(slide);
            }
        });
    }

    /**
     * Find all carousel elements in the container
     * Supporting different possible carousel layouts
     */
    function findElements() {
        // The main carousel container (always required)
        const container = element.classList.contains('carousel-container')
            ? element
            : element.querySelector('.carousel-container');

        if (!container) {
            action.log('error', 'Carousel container not found');
            return null;
        }

        // The slider that holds the images and moves
        const slider = container.querySelector('.carousel-slider');
        if (!slider) {
            action.log('error', 'Carousel slider not found');
            return null;
        }

        // All images/slides in the carousel
        const slides = slider.querySelectorAll('.carousel-slide');
        if (!slides.length) {
            action.log('error', 'No carousel slides found');
            return null;
        }

        // Optional navigation buttons
        const prevButton = element.querySelector('.carousel-button-left') ||
                          (element !== container ? container.querySelector('.carousel-button-left') : null);
        const nextButton = element.querySelector('.carousel-button-right') ||
                          (element !== container ? container.querySelector('.carousel-button-right') : null);

        // Optional thumbnails
        const thumbnailsContainer = element.querySelector('.carousel-thumbnails') ||
                                   (element !== container ? container.querySelector('.carousel-thumbnails') : null);
        const thumbnails = thumbnailsContainer ?
            thumbnailsContainer.querySelectorAll('.carousel-thumbnail') :
            [];

        return {
            container,
            slider,
            slides,
            prevButton,
            nextButton,
            thumbnailsContainer,
            thumbnails: Array.from(thumbnails)
        };
    }

    /**
     * Set up the carousel functionality
     */
    function setupCarousel({ container, slider, slides, prevButton, nextButton, thumbnails, slideElements }) {
        let currentIndex = 0;
        const totalSlides = slides.length;
        const shouldWrapAround = true;

        // Let CSS handle the width of individual slides
        // The slider will be width: fit-content
        if (thumbnails.length > 0) {
            thumbnails[0].classList.add('active');
        }

        function updateCarousel(newIndex, forceWrap = false) {
            if (isAnimating) return;
            isAnimating = true;

            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            if (shouldWrapAround || forceWrap) {
                newIndex = newIndex < 0 ? totalSlides - 1 : newIndex % totalSlides;
            } else {
                newIndex = Math.max(0, Math.min(newIndex, totalSlides - 1));
            }

            currentIndex = newIndex;

            rafId = requestAnimationFrame(() => {
                // Each slide is 100cqw wide, so we move by that amount
                const offset = -100 * currentIndex;
                slider.style.transform = `translateX(${offset}cqw)`;
                updateSlideStates();
                isAnimating = false;
            });
        }

        function updateSlideStates() {
            slideElements.forEach((slide, index) => {
                const isActive = index === currentIndex;
                slide.setAttribute('aria-hidden', (!isActive).toString());
                slide.classList.toggle('active', isActive);
            });

            if (thumbnails.length > 0) {
                thumbnails.forEach((thumb, index) => {
                    const isActive = index === currentIndex;
                    thumb.classList.toggle('active', isActive);
                    thumb.setAttribute('aria-current', isActive.toString());
                });
            }

            if (prevButton) {
                const isPrevDisabled = !shouldWrapAround && currentIndex === 0;
                prevButton.classList.toggle('disabled', isPrevDisabled);
                prevButton.setAttribute('aria-disabled', isPrevDisabled.toString());
            }

            if (nextButton) {
                const isNextDisabled = !shouldWrapAround && currentIndex === totalSlides - 1;
                nextButton.classList.toggle('disabled', isNextDisabled);
                nextButton.setAttribute('aria-disabled', isNextDisabled.toString());
            }
        }

        function goToNextSlide() {
            action.executeWithRateLimit(() => {
                updateCarousel(currentIndex + 1);
            });
        }

        function goToPrevSlide() {
            action.executeWithRateLimit(() => {
                updateCarousel(currentIndex - 1);
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                goToPrevSlide();
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                goToNextSlide();
            });
        }

        thumbnails.forEach((thumbnail, index) => {
            thumbnail.addEventListener('click', () => {
                action.executeWithRateLimit(() => {
                    updateCarousel(index);
                });
            });
        });

        updateCarousel(0);

        return {
            updateCarousel,
            goToNextSlide,
            goToPrevSlide,
            getCurrentIndex: () => currentIndex,
            getTotalSlides: () => totalSlides,
            shouldWrapAround: () => shouldWrapAround
        };
    }

    /**
     * Add accessibility features to the carousel
     */
    function setupAccessibility({ container, slider, slides, prevButton, nextButton, thumbnails }, carouselController) {
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', 'Image carousel');
        container.setAttribute('tabindex', '0');

        slides.forEach((slide, index) => {
            slide.setAttribute('role', 'tabpanel');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);
        });

        if (prevButton) {
            prevButton.setAttribute('role', 'button');
            prevButton.setAttribute('aria-label', 'Previous slide');
            prevButton.setAttribute('tabindex', '0');

            prevButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    prevButton.click();
                }
            });
        }

        if (nextButton) {
            nextButton.setAttribute('role', 'button');
            nextButton.setAttribute('aria-label', 'Next slide');
            nextButton.setAttribute('tabindex', '0');

            nextButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    nextButton.click();
                }
            });
        }

        thumbnails.forEach((thumbnail, index) => {
            thumbnail.setAttribute('role', 'tab');
            thumbnail.setAttribute('aria-label', `Show slide ${index + 1}`);
            thumbnail.setAttribute('tabindex', '0');

            thumbnail.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    thumbnail.click();
                }
            });
        });

        container.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    if (prevButton) {
                        prevButton.click();
                    } else {
                        carouselController.goToPrevSlide();
                    }
                    break;

                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    if (nextButton) {
                        nextButton.click();
                    } else {
                        carouselController.goToNextSlide();
                    }
                    break;

                case 'Home':
                    e.preventDefault();
                    if (thumbnails.length > 0) {
                        thumbnails[0].click();
                    } else {
                        action.executeWithRateLimit(() => {
                            carouselController.updateCarousel(0);
                        });
                    }
                    break;

                case 'End':
                    e.preventDefault();
                    if (thumbnails.length > 0) {
                        thumbnails[thumbnails.length - 1].click();
                    } else {
                        action.executeWithRateLimit(() => {
                            carouselController.updateCarousel(carouselController.getTotalSlides() - 1);
                        });
                    }
                    break;
            }
        });
    }

    /**
     * Add touch support for mobile devices
     */
    function setupTouchSupport({ container }, carouselController) {
        let touchStartX = 0;
        let touchEndX = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;

            if (touchEndX < touchStartX - swipeThreshold) {
                carouselController.goToNextSlide();
            }

            if (touchEndX > touchStartX + swipeThreshold) {
                carouselController.goToPrevSlide();
            }
        }
    }

    // Handle initialization timing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}
