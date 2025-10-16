/**
 * Handling link URLs bound to buttons and adding them as links on variant images.
 * Uses BaseAction for secure DOM manipulation and telemetry.
 */

import { BaseAction } from './base-action';
import DOMPurify from 'dompurify';

export const actionName = 'variant-links';

class VariantLinksAction extends BaseAction {
    constructor(element) {
        super(element);
        this.processedImages = new Set();
        this.observer = null;
        this.init();
    }

    init() {
        // Get the parent group containing both images and buttons
        const parentGroup = this.element.closest('.wp-block-group');
        if (!parentGroup) {
            this.log('warning', 'Parent group not found');
            return;
        }

        // Cache buttons and their URLs upfront
        const buttons = Array.from(parentGroup.querySelectorAll('.wp-block-buttons .wp-block-button__link'));
        if (!buttons.length) {
            this.log('warning', 'No buttons found');
            return;
        }

        // Create a map of sanitized URLs upfront
        this.buttonUrls = buttons.map(button => DOMPurify.sanitize(button.href));

        // Set up intersection observer for lazy loading
        this.setupIntersectionObserver(parentGroup);
    }

    setupIntersectionObserver(parentGroup) {
        // Clean up existing observer if any
        if (this.observer) {
            this.observer.disconnect();
        }

        // Create new intersection observer
        this.observer = new IntersectionObserver((entries) => {
            const visibleEntries = entries.filter(entry => entry.isIntersecting);
            if (visibleEntries.length) {
                this.processVisibleImages(visibleEntries.map(entry => entry.target));
            }
        }, {
            root: null,
            rootMargin: '50px', // Start loading slightly before images come into view
            threshold: 0.1
        });

        // Observe all images
        const images = parentGroup.querySelectorAll('.wp-block-image');
        images.forEach(image => {
            if (!this.processedImages.has(image)) {
                this.observer.observe(image);
            }
        });
    }

    processVisibleImages(images) {
        // Create document fragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        let processedCount = 0;

        images.forEach((image, index) => {
            // Skip if already processed or no corresponding URL
            if (this.processedImages.has(image) || index >= this.buttonUrls.length) {
                return;
            }

            const url = this.buttonUrls[index];
            if (!url) return;

            try {
                const imgElement = image.querySelector('img');
                if (!imgElement || image.closest('a')) {
                    return;
                }

                // Create link element
                const link = document.createElement('a');
                link.href = url;
                link.className = 'variant-link';
                link.appendChild(imgElement.cloneNode(true));

                // Add to fragment
                fragment.appendChild(link);

                // Mark as processed and track for replacement
                this.processedImages.add(image);
                processedCount++;

                // Schedule replacement
                requestAnimationFrame(() => {
                    imgElement.parentNode.replaceChild(link, imgElement);
                });

            } catch (error) {
                this.log('error', `Error processing image ${index}`, error);
            }
        });

        if (processedCount > 0) {
            this.log('info', `Processed ${processedCount} new variant images`);
        }

        // If all images are processed, disconnect the observer
        if (this.processedImages.size === this.buttonUrls.length) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

export default function init(element) {
    return new VariantLinksAction(element);
}
