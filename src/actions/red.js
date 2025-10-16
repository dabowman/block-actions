/**
 * Changes the button background to red when clicked
 * @param {HTMLElement} element - The button element.
 */

import { BaseAction } from './base-action';

export const actionName = 'red';

export default function init(element) {
    const action = new BaseAction(element);

    action.target.addEventListener('click', (e) => {
        e.preventDefault();

        // Check rate limiting
        if (!action.canExecute()) return;

        // Safely apply styles and text
        action.setStyle('backgroundColor', 'red');
        action.setTextContent('Red!');

        // Reset after delay
        setTimeout(() => action.reset(), 2000);
    });
}
