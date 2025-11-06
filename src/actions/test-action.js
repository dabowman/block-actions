/**
 * Test Action.
 * This action changes the button's background color to red and updates its text.
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

        if (!action.canExecute()) return;

        action.setStyle('backgroundColor', 'red');
        action.setTextContent('it worked!');

        // Reset after delay
        setTimeout(() => action.reset(), 2000);
    });
}
