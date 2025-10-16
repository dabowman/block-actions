/**
 * Magazine gallery slider implementation
 * Controls the magazine gallery slider with next/prev buttons and thumbnails
 * @param {HTMLElement} element - The gallery container element.
 */
import { BaseAction } from './base-action';

export const actionName = 'magazine-gallery';

export default function init(element) {
    const action = new BaseAction(element);

    // Initialize the gallery functionality
    const galleryContainer = element.querySelector('.gallery_images_container');
    const imagesWrapper = element.querySelector('.gallery_images_wrapper');
    const images = element.querySelectorAll('.gallery_image_container');
    const leftButton = element.querySelector('.gallery_button-left .wp-block-button__link');
    const rightButton = element.querySelector('.gallery_button-right .wp-block-button__link');
    const thumbnails = element.querySelectorAll('.gallery_thumbnails .wp-block-image');

    // Set initial state
    let currentIndex = 0;
    const totalImages = images.length;

    // Add necessary CSS classes for the gallery container and wrapper
    if (!galleryContainer || !imagesWrapper || images.length === 0) {
        action.log('error', 'Gallery elements not found, aborting initialization');
        return;
    }

    // Style the wrapper to enable horizontal sliding
    imagesWrapper.style.display = 'flex';
    imagesWrapper.style.flexWrap = 'nowrap';
    imagesWrapper.style.width = '100%';
    imagesWrapper.style.transition = 'transform 0.3s ease-in-out';
    imagesWrapper.style.position = 'relative';

    // Container should hide overflow
    galleryContainer.style.overflow = 'hidden';

    // Set up the gallery images
    images.forEach((image, index) => {
        image.style.flexShrink = '0';
        image.style.flexGrow = '0';
        image.style.width = '100%';
        image.style.opacity = index === 0 ? '1' : '0.3';
    });

    // Add active class to first thumbnail
    if (thumbnails.length > 0) {
        thumbnails[0].classList.add('active');
    }

    // Function to update gallery position
    const updateGallery = (newIndex) => {
        // Ensure newIndex is within bounds
        newIndex = Math.max(0, Math.min(newIndex, totalImages - 1));
        currentIndex = newIndex;

        // Transform the wrapper to show the current image
        const offset = -100 * currentIndex;
        imagesWrapper.style.transform = `translateX(${offset}%)`;

        // Update image opacity
        images.forEach((image, index) => {
            image.style.opacity = index === currentIndex ? '1' : '0.3';
        });

        // Update thumbnails
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentIndex);
        });

        // Update button states
        if (leftButton) leftButton.style.opacity = currentIndex === 0 ? '0.5' : '1';
        if (rightButton) rightButton.style.opacity = currentIndex === totalImages - 1 ? '0.5' : '1';
    };

    // Add event listeners to buttons
    if (leftButton) {
        leftButton.addEventListener('click', (e) => {
            e.preventDefault();
            action.executeWithRateLimit(() => {
                updateGallery(currentIndex - 1);
            });
        });
    }

    if (rightButton) {
        rightButton.addEventListener('click', (e) => {
            e.preventDefault();
            action.executeWithRateLimit(() => {
                updateGallery(currentIndex + 1);
            });
        });
    }

    // Add event listeners to thumbnails
    thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => {
            action.executeWithRateLimit(() => {
                updateGallery(index);
            });
        });
    });

    // Set initial button states
    if (leftButton) {
        leftButton.style.opacity = '0.5';
    }

    if (rightButton && totalImages <= 1) {
        rightButton.style.opacity = '0.5';
    }

    // Initialize the gallery with first image
    updateGallery(0);

    // Add touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    galleryContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    galleryContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
        const swipeThreshold = 50;

        if (touchEndX < touchStartX - swipeThreshold) {
            action.executeWithRateLimit(() => {
                updateGallery(currentIndex + 1);
            });
        }

        if (touchEndX > touchStartX + swipeThreshold) {
            action.executeWithRateLimit(() => {
                updateGallery(currentIndex - 1);
            });
        }
    };

    // Add keyboard support
    document.addEventListener('keydown', (e) => {
        if (!galleryContainer.contains(document.activeElement)) {
            return;
        }

        if (e.key === 'ArrowLeft') {
            action.executeWithRateLimit(() => {
                updateGallery(currentIndex - 1);
            });
        } else if (e.key === 'ArrowRight') {
            action.executeWithRateLimit(() => {
                updateGallery(currentIndex + 1);
            });
        }
    });
}
