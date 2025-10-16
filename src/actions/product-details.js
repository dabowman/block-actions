import { BaseAction } from './base-action';

export const actionName = 'product-details';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        action.log('info', 'Product Details initializing...');

        const elements = findElements();
        if (!elements) return;

        setupDetailsAccordion(elements);

        action.log('info', 'Product details initialized successfully');
    }

    function findElements() {
        const details = element.querySelectorAll('details');
        if (!details.length) {
            console.warn('Product details action: No details elements found', {
                details: details.length,
                html: element.innerHTML
            });
            return null;
        }

        const parent = element.closest('.product-details-tabs');
        if (!parent) {
            console.warn('Product details action: Parent container not found');
            return null;
        }

        action.log('info', 'Found product details elements', {
            details: details.length
        });

        return { details, parent };
    }

    function setupDetailsAccordion({ details, parent }) {
        let initialHeight = parent.scrollHeight;

        function adjustParentHeight() {
            const openDetail = parent.querySelector('details[open]');

            if (openDetail) {
                const content = openDetail.querySelector('.product-details-tabs-content');
                const summary = openDetail.querySelector('summary');

                if (!content || !summary) {
                    action.log('info', 'Missing content or summary element');
                    return;
                }

                // Set content width to match parent
                content.style.width = `${parent.offsetWidth}px`;

                // Calculate total height
                const contentHeight = content.scrollHeight;
                const contentMargin = parseFloat(window.getComputedStyle(content).marginTop) +
                                   parseFloat(window.getComputedStyle(content).marginBottom);
                const summaryHeight = summary.scrollHeight;

                // Set parent height
                parent.style.height = `${contentHeight + contentMargin + summaryHeight}px`;
                action.log('info', 'Accordion expanded');
            } else {
                // Collapse to summary height
                const summaryHeight = details[0].querySelector('summary')?.scrollHeight || 0;
                parent.style.height = `${summaryHeight}px`;
                action.log('info', 'Accordion collapsed');
            }
        }

        // Setup each details element
        details.forEach(detail => {
            // Set name attribute for grouping
            detail.setAttribute('name', 'product-details');

            // Adjust height if open by default
            if (detail.open) {
                setTimeout(() => {
                    adjustParentHeight();
                    initialHeight = parent.scrollHeight;
                }, 10);
            }

            // Handle toggle events
            detail.addEventListener('toggle', () => {
                setTimeout(adjustParentHeight, 10);
            });
        });

        // Add keyboard navigation
        setupAccessibility({ details });
    }

    function setupAccessibility({ details }) {
        details.forEach((detail, index) => {
            const summary = detail.querySelector('summary');
            if (!summary) return;

            // Add ARIA attributes
            summary.setAttribute('role', 'button');
            summary.setAttribute('aria-expanded', detail.open ? 'true' : 'false');
            summary.setAttribute('aria-controls', `product-detail-${index}`);

            const content = detail.querySelector('.product-details-tabs-content');
            if (content) {
                content.setAttribute('id', `product-detail-${index}`);
                content.setAttribute('role', 'region');
                content.setAttribute('aria-labelledby', summary.id || `product-detail-summary-${index}`);
            }

            // Update ARIA state on toggle
            detail.addEventListener('toggle', () => {
                summary.setAttribute('aria-expanded', detail.open ? 'true' : 'false');
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
