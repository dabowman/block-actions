/**
 * Smoothly scrolls the page back to the top when clicked
 * @param {HTMLElement} element - The button element.
 */

import { BaseAction } from './base-action';

export const actionName = 'scroll-to-top';

export default function init(element) {
    const action = new BaseAction(element);

    action.target.addEventListener('click', (e) => {
        e.preventDefault();

        if (!action.canExecute()) return;

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
}
