import { BaseAction } from './base-action';

export const actionName = 'watch-day-night';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        action.log('info', 'Watch Day/Night initializing...');

        const elements = findElements();
        if (!elements) return;

        setupImageToggle(elements);
        setupAccessibility(elements);

        action.log('info', 'Watch day/night initialized successfully');
    }

    function findElements() {
        const dayButton = element.querySelector('.watch-day-night-button.day');
        const nightButton = element.querySelector('.watch-day-night-button.night');
        const dayImage = element.querySelector('.watch-day-night-image.day');
        const nightImage = element.querySelector('.watch-day-night-image.night');

        if (!dayButton || !nightButton || !dayImage || !nightImage) {
            console.warn('Watch day/night action: Required elements not found', {
                dayButton: !!dayButton,
                nightButton: !!nightButton,
                dayImage: !!dayImage,
                nightImage: !!nightImage,
                html: element.innerHTML
            });
            return null;
        }

        action.log('info', 'Found watch day/night elements');
        return { dayButton, nightButton, dayImage, nightImage };
    }

    function setupImageToggle({ dayButton, nightButton, dayImage, nightImage }) {
        function showDayImage() {
            dayImage.style.opacity = '1';
            dayButton.classList.add('active');
            nightButton.classList.remove('active');
            action.log('info', 'Day mode activated');
        }

        function showNightImage() {
            nightImage.style.opacity = '1';
            nightButton.classList.add('active');
            dayButton.classList.remove('active');
            action.log('info', 'Night mode activated');
        }

        // Set initial state
        showDayImage();

        // Add hover events
        dayButton.addEventListener('mouseenter', showDayImage);
        nightButton.addEventListener('mouseenter', showNightImage);

        return { showDayImage, showNightImage };
    }

    function setupAccessibility({ dayButton, nightButton }) {
        // Add ARIA roles and labels
        element.setAttribute('role', 'region');
        element.setAttribute('aria-label', 'Watch day and night view toggle');

        [
            [dayButton, 'Show day view'],
            [nightButton, 'Show night view']
        ].forEach(([button, label]) => {
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            button.setAttribute('aria-label', label);

            // Add keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.dispatchEvent(new MouseEvent('mouseenter'));
                }
            });
        });

        // Add arrow key navigation
        element.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    dayButton.dispatchEvent(new MouseEvent('mouseenter'));
                    dayButton.focus();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    nightButton.dispatchEvent(new MouseEvent('mouseenter'));
                    nightButton.focus();
                    break;
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
