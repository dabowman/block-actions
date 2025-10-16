/**
 * Test Action
 * This action changes the button's background color to red and updates its text.
 * @param {HTMLElement} element - The button element.
 */

import { BaseAction } from './base-action';

// Export both the action name and the init function
export const actionName = 'test-action';

export default function init(element) {
    const action = new BaseAction(element);

    action.target.addEventListener('click', (e) => {
        e.preventDefault();

        if (!action.canExecute()) return;

        action.setStyle('backgroundColor', 'red');
        action.setTextContent('it worked!');

        // Reset after delay
        setTimeout(() => action.reset(), 2000);
    });
}
