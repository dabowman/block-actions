import { BaseAction } from './base-action';

export const actionName = 'cart-nav';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        action.log('info', 'CartNav initializing...');

        const elements = findElements();
        if (!elements) return;

        setupPopover(elements);
        setupEventHandlers(elements);

        action.log('info', 'Cart nav initialized successfully');
    }

    function findElements() {
        // Find trigger and popover as direct children of the action element
        const trigger = element.querySelector(':scope > .cart-trigger');
        const popover = element.querySelector(':scope > .cart-popover');

        if (!trigger || !popover) {
            action.log('error', 'Required elements not found', {
                trigger: !!trigger,
                popover: !!popover,
                html: element.innerHTML
            });
            return null;
        }

        action.log('info', 'Found cart elements');
        return { trigger, popover };
    }

    function setupPopover({ trigger, popover }) {
        function showPopover() {
            // Position the popover
            const triggerRect = trigger.getBoundingClientRect();
            const containerRect = element.getBoundingClientRect();

            // Position the caret using CSS variable
            const centerPosition = (triggerRect.left + triggerRect.width / 2) - containerRect.left;
            element.style.setProperty('--caret-position', `${centerPosition}px`);

            // Show the popover
            popover.classList.add('is-visible');
            element.classList.add('has-active-popover');
            action.log('info', 'Cart popover shown');
        }

        function hidePopover() {
            popover.classList.remove('is-visible');
            element.classList.remove('has-active-popover');
            action.log('info', 'Cart popover hidden');
        }

        return { showPopover, hidePopover };
    }

    function setupEventHandlers(elements) {
        const { trigger, popover } = elements;
        const { showPopover, hidePopover } = setupPopover(elements);

        // Handle trigger click
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (popover.classList.contains('is-visible')) {
                hidePopover();
            } else {
                showPopover();
            }
        });

        // Handle click outside
        document.addEventListener('click', (e) => {
            // If clicking inside the popover, do nothing
            if (popover.contains(e.target)) {
                return;
            }

            // If clicking the trigger, let the trigger handler handle it
            if (trigger.contains(e.target)) {
                return;
            }

            // Otherwise, hide the popover
            if (popover.classList.contains('is-visible')) {
                hidePopover();
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
