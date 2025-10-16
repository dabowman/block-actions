import { BaseAction } from './base-action';

export const actionName = 'product-gallery';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        const elements = findElements();
        if (!elements) return;

        setupGallery(elements);
        setupAccessibility(elements);
    }

    function findElements() {
        // Find gallery and thumbnails containers
        const gallery = element.querySelector(':scope > .gallery');
        const thumbnailsContainer = element.querySelector(':scope > .thumbnails');

        if (!gallery || !thumbnailsContainer) {
            action.log('error', 'Required containers not found');
            return null;
        }

        // Get all gallery images and thumbnails
        const galleryItems = gallery.querySelectorAll('.product-details-image-gallery-item');
        const thumbnails = thumbnailsContainer.querySelectorAll('.product-details-image-gallery-item');

        if (!galleryItems.length || !thumbnails.length) {
            action.log('error', 'No gallery items or thumbnails found');
            return null;
        }

        return { gallery, thumbnails, galleryItems };
    }

    function setupGallery({ gallery, thumbnails }) {
        // Add active class to first thumbnail
        thumbnails[0].classList.add('is-active');

        function switchToImage(index) {
            // Update active thumbnail
            thumbnails.forEach(t => t.classList.remove('is-active'));
            thumbnails[index].classList.add('is-active');

            // Move gallery
            const offset = -100 * index;
            gallery.style.left = `${offset}cqw`;
        }

        // Handle thumbnail clicks
        thumbnails.forEach((thumbnail, index) => {
            thumbnail.addEventListener('click', () => switchToImage(index));
        });

        return { switchToImage };
    }

    function setupAccessibility({ thumbnails }) {
        // Add keyboard navigation for gallery
        element.setAttribute('role', 'region');
        element.setAttribute('aria-label', 'Product gallery');

        // Make thumbnails keyboard accessible
        thumbnails.forEach((thumbnail, index) => {
            thumbnail.setAttribute('role', 'button');
            thumbnail.setAttribute('tabindex', '0');
            thumbnail.setAttribute('aria-label', `View image ${index + 1}`);

            // Handle keyboard navigation
            thumbnail.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    thumbnail.click();
                }
            });
        });

        // Add keyboard navigation for gallery container
        element.addEventListener('keydown', (e) => {
            const currentIndex = Array.from(thumbnails).findIndex(t =>
                t.classList.contains('is-active')
            );

            let newIndex = currentIndex;

            switch (e.key) {
                case 'ArrowLeft':
                    newIndex = Math.max(0, currentIndex - 1);
                    break;
                case 'ArrowRight':
                    newIndex = Math.min(thumbnails.length - 1, currentIndex + 1);
                    break;
                default:
                    return;
            }

            if (newIndex !== currentIndex) {
                e.preventDefault();
                thumbnails[newIndex].click();
            }
        });
    }

    // Handle initialization timing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}
