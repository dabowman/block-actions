import { BaseAction } from './base-action';

export const actionName = 'product-grid-carousel';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        action.log('info', 'Product Grid Carousel initializing...');

        const elements = findElements();
        if (!elements) return;

        setupCarousel(elements);
        setupAccessibility(elements);

        action.log('info', 'Product grid carousel initialized successfully');
    }

    function findElements() {
        const carouselContainer = element.querySelector('.carousel-container');
        if (!carouselContainer) {
            console.warn('Product grid carousel action: Carousel container not found');
            return null;
        }

        const carouselSlider = carouselContainer.querySelector('.carousel-slider');
        const images = carouselSlider.querySelectorAll('.carousel-image');
        const buttonRight = element.querySelector('.carousel-button-right');
        const buttonLeft = element.querySelector('.carousel-button-left');

        if (!carouselSlider || !images.length || !buttonRight || !buttonLeft) {
            console.warn('Product grid carousel action: Required elements not found', {
                slider: !!carouselSlider,
                images: images.length,
                buttonRight: !!buttonRight,
                buttonLeft: !!buttonLeft
            });
            return null;
        }

        action.log('info', 'Found carousel elements', { images: images.length });
        return { carouselSlider, images, buttonRight, buttonLeft };
    }

    function setupCarousel({ carouselSlider, images, buttonRight, buttonLeft }) {
        // Set initial carousel position and styling
        carouselSlider.style.position = 'relative';
        carouselSlider.style.left = '0';
        carouselSlider.style.transition = 'left 0.5s ease';

        let currentIndex = 0;

        function moveCarousel(direction) {
            currentIndex = (currentIndex + direction + images.length) % images.length;
            carouselSlider.style.left = `-${currentIndex * 100}%`;
            carouselSlider.style.transform = `translateX(-${currentIndex * 100}%)`;
            action.log('info', `Carousel moved ${direction > 0 ? 'right' : 'left'} to image ${currentIndex + 1}`);
        }

        // Handle navigation clicks
        buttonRight.addEventListener('click', () => moveCarousel(1));
        buttonLeft.addEventListener('click', () => moveCarousel(-1));
    }

    function setupAccessibility({ buttonRight, buttonLeft }) {
        // Add keyboard navigation to container
        element.setAttribute('role', 'region');
        element.setAttribute('aria-label', 'Product image carousel');

        element.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    buttonLeft.click();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    buttonRight.click();
                    break;
            }
        });

        // Make buttons keyboard accessible
        [buttonLeft, buttonRight].forEach(button => {
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
    }

    // Handle initialization timing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}
