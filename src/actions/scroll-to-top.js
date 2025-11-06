/**
 * Smoothly scrolls the page back to the top when clicked.
 *
 * @since 1.0.0
 *
 * @param {HTMLElement} element The button element.
 * @return {void}
 */

import { BaseAction } from './base-action';

export default function init(element) {
    const action = new BaseAction(element);

    action.target.addEventListener('click', (e) => {
        e.preventDefault();

        action.executeWithRateLimit(() => {
            // Smooth scroll to top
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            action.setTextContent('Scrolling...');
            action.log('info', 'Scrolling to top');

            // Reset after animation
            setTimeout(() => action.reset(), 500);
        });
    });
}
