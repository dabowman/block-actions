import { BaseAction } from './base-action';

export const actionName = 'tech-specs';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        action.log('info', 'Tech Specs initializing...');

        const elements = findElements();
        if (!elements) return;

        setupTabs(elements);
        setupAccessibility(elements);

        action.log('info', 'Tech specs initialized successfully');
    }

    function findElements() {
        const triggers = element.querySelectorAll('.triggers .trigger');
        const contents = element.querySelectorAll('.content-container .content');

        if (!triggers.length || !contents.length || triggers.length !== contents.length) {
            console.warn('Tech specs action: Required elements not found or mismatch', {
                triggers: triggers.length,
                contents: contents.length,
                html: element.innerHTML
            });
            return null;
        }

        action.log('info', 'Found tech specs elements', {
            triggers: triggers.length,
            contents: contents.length
        });

        return { triggers, contents };
    }

    function setupTabs({ triggers, contents }) {
        function toggleTab(trigger, index) {
            const isActive = trigger.classList.contains('active');

            // Remove active class from all triggers and contents
            triggers.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Toggle active class if the trigger was not already active
            if (!isActive) {
                trigger.classList.add('active');
                contents[index].classList.add('active');
                action.log('info', `Tech spec tab ${index + 1} activated`);
            } else {
                action.log('info', 'Tech spec tabs deactivated');
            }
        }

        // Handle trigger clicks
        triggers.forEach((trigger, index) => {
            trigger.addEventListener('click', () => toggleTab(trigger, index));
        });
    }

    function setupAccessibility({ triggers, contents }) {
        // Add ARIA roles and labels
        element.setAttribute('role', 'tablist');

        triggers.forEach((trigger, index) => {
            const content = contents[index];
            const id = `tech-spec-content-${index}`;

            // Setup trigger
            trigger.setAttribute('role', 'tab');
            trigger.setAttribute('aria-controls', id);
            trigger.setAttribute('tabindex', '0');

            // Setup content
            content.setAttribute('role', 'tabpanel');
            content.setAttribute('id', id);
            content.setAttribute('aria-labelledby', trigger.id || `tech-spec-trigger-${index}`);

            // Add keyboard navigation
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    trigger.click();
                }
            });
        });

        // Add keyboard navigation between tabs
        element.addEventListener('keydown', (e) => {
            const currentTrigger = document.activeElement;
            if (!currentTrigger.classList.contains('trigger')) return;

            const currentIndex = Array.from(triggers).indexOf(currentTrigger);
            let newIndex = currentIndex;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    newIndex = (currentIndex - 1 + triggers.length) % triggers.length;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    newIndex = (currentIndex + 1) % triggers.length;
                    break;
                default:
                    return;
            }

            e.preventDefault();
            triggers[newIndex].focus();
        });
    }

    // Handle initialization timing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}
