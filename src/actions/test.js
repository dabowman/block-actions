/**
 * test
 * @param {HTMLElement} element - The button element.
 */

export const actionName = 'test';

export default function init(element) {
    const target = element.querySelector('a') || element;
    const originalText = target.textContent;

    target.addEventListener('click', (e) => {
        e.preventDefault();

        // Add your action code here
        console.log('test action executed');

        // Example: Change button text
        target.textContent = 'Action Executed!';

        // Example: Reset after 2 seconds
        setTimeout(() => {
            target.textContent = originalText;
        }, 2000);
    });
}
