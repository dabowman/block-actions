/**
 * Example Rate Limited Action
 *
 * Demonstrates the use of improved rate limiting in BaseAction.
 * This action toggles a CSS class with rate limiting.
 */

import { BaseAction } from './base-action';

export default function init(element) {
    // Create new action instance
    const action = new ClassToggleAction(element);

    // Attach event listener using rate limiting
    element.addEventListener('click', (event) => {
        event.preventDefault();

        // Use the executeWithRateLimit helper to automatically handle rate limiting and cleanup
        action.executeWithRateLimit(() => {
            action.toggleClass();
        });
    });
}

class ClassToggleAction extends BaseAction {
    constructor(element) {
        super(element);
        this.activeClass = 'is-active';
        this.isActive = false;
    }

    /**
     * Toggles CSS class on the target element
     */
    toggleClass() {
        // Toggle state
        this.isActive = !this.isActive;

        // Update UI based on state
        if (this.isActive) {
            this.element.classList.add(this.activeClass);
            this.setTextContent('Active State');
        } else {
            this.element.classList.remove(this.activeClass);
            this.setTextContent(this.originalText);
        }

        this.log('info', `Class toggled to ${this.isActive ? 'active' : 'inactive'}`);
    }

    /**
     * Manual implementation of the same functionality using direct rate limiting methods
     * This shows the alternative approach for comparison
     */
    toggleClassManual() {
        // Check if we can execute (handles rate limiting)
        if (!this.canExecute()) {
            return;
        }

        try {
            // Same logic as toggleClass
            this.isActive = !this.isActive;

            if (this.isActive) {
                this.element.classList.add(this.activeClass);
                this.setTextContent('Active State');
            } else {
                this.element.classList.remove(this.activeClass);
                this.setTextContent(this.originalText);
            }

            this.log('info', `Class toggled to ${this.isActive ? 'active' : 'inactive'}`);
        } finally {
            // Always release the execution lock when done
            this.completeExecution();
        }
    }
}
