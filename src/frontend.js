/**
 * Front-end Actions Initialization
 *
 * This module handles the initialization of block actions on the front end.
 * It dynamically loads action modules and applies them to elements with
 * matching data-action attributes.
 *
 * Features:
 * - Dynamic action module loading
 * - Action caching for performance
 * - Error boundaries and logging
 * - Debug mode support
 *
 * @module frontend
 */

// Import manifest of available actions
import actions from './actions';

/**
 * Cache for loaded action modules to prevent duplicate imports.
 *
 * @since 1.0.0
 *
 * @type {Map<string, Function>}
 */
const loadedActions = new Map();

/**
 * Simplified telemetry for frontend.
 *
 * @since 1.0.0
 *
 * @type {Object}
 */
const telemetry = {
	actionsLoaded: 0,     // Number of actions loaded
	actionsFailed: 0,     // Number of actions that failed to load
	initStartTime: Date.now(), // When initialization started
	initDuration: 0,      // Time to complete initialization
	actionLoadTimes: {}   // Performance data for individual actions
};

/**
 * Centralized logging utility for frontend.
 *
 * @since 1.0.0
 *
 * @param {string}      type    Log type: 'error', 'warning', or 'info'.
 * @param {string}      message Log message to display.
 * @param {Error|null} [error]  Optional error object for error logs.
 * @return {void}
 */
function log(type, message, error = null) {
    const prefix = '[Block Actions Frontend]';
    const debug = !!(window?.blockActions?.debug);
    if (type === 'error') {
        console.error(`${prefix} ${message}`, error || '');
        return;
    }
    if (debug) {
        if (type === 'warning') {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
}

/**
 * Safely loads and executes an action on a target element.
 *
 * @since 1.0.0
 *
 * @param {string}      actionId The ID of the action to load.
 * @param {HTMLElement} element  The element to apply the action to.
 * @return {Promise<void>} Promise that resolves when action is loaded and executed.
 */
async function loadAndExecuteAction(actionId, element) {
    const startTime = performance.now();

    // Build a registry of actions from the static manifest
    if (!loadedActions.has(actionId)) {
        const registryAction = actions.find(a => a.id === actionId);
        if (registryAction && typeof registryAction.init === 'function') {
            loadedActions.set(actionId, registryAction.init);
            telemetry.actionsLoaded++;
        }
    }

    const action = loadedActions.get(actionId);

    if (typeof action === 'function') {
        action(element);
        const loadTime = performance.now() - startTime;
        if (!telemetry.actionLoadTimes[actionId]) {
            telemetry.actionLoadTimes[actionId] = [];
        }
        telemetry.actionLoadTimes[actionId].push(Math.round(loadTime));
        log('info', `Action ${actionId} executed in ${Math.round(loadTime)}ms`);
    } else {
        telemetry.actionsFailed++;
        log('error', `Action ${actionId} is not available`);
    }
}

/**
 * Initializes all actions on the page.
 * Finds elements with data-action attributes and applies the corresponding actions.
 *
 * @since 1.0.0
 *
 * @return {void}
 */
function initActions() {
	const startTime = performance.now();
	log('info', 'Initializing actions...');

	// Find all elements with data-action attribute
	const elements = document.querySelectorAll('[data-action]');
	// log('info', `Found ${elements.length} elements with data-action attribute`);

	// Process each element
	elements.forEach(element => {
		const actionId = element.getAttribute('data-action');
		if (!actionId) return;

		// Validate action exists in our registry
		const actionExists = actions.some(a => a.id === actionId);
		if (!actionExists) {
			log('error', `Unknown action: ${actionId}`);
			return;
		}

		// Load and execute the action
		loadAndExecuteAction(actionId, element);
	});

	// Track initialization time
	telemetry.initDuration = performance.now() - startTime;
	// log('info', `Actions initialized in ${Math.round(telemetry.initDuration)}ms`);
}

// Initialize actions when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', initActions);
