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

// Import manifest of built-in actions
import actions from './actions';
import { BaseAction } from './actions/base-action';

/**
 * Registry of all available actions (built-in + theme actions).
 *
 * @since 1.0.0
 *
 * @type {Array<{id: string, label: string, init: Function}>}
 */
let actionRegistry = [...actions];

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

    // Build a registry of actions from both built-in and theme actions
    if (!loadedActions.has(actionId)) {
        const registryAction = actionRegistry.find(a => a.id === actionId);
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
		const actionExists = actionRegistry.some(a => a.id === actionId);
		if (!actionExists) {
			log('error', `Unknown action: ${actionId}`);
			return;
		}

		// Load and execute the action
		loadAndExecuteAction(actionId, element);
	});

	// Track initialization time
	telemetry.initDuration = performance.now() - startTime;
	log('info', `Actions initialized: ${actionRegistry.length} total (${actions.length} built-in, ${actionRegistry.length - actions.length} theme)`);
}

/**
 * Register a custom action from theme or plugin.
 *
 * @since 1.0.0
 *
 * @param {string}   id    Unique action identifier (e.g., 'my-custom-action').
 * @param {string}   label Human-readable label for the action.
 * @param {Function} init  Initialization function that receives the element.
 * @return {boolean} True if registered successfully, false if ID already exists.
 */
function registerAction(id, label, init) {
	// Validate parameters
	if (!id || typeof id !== 'string') {
		log('error', 'Action ID must be a non-empty string');
		return false;
	}

	if (!label || typeof label !== 'string') {
		log('error', 'Action label must be a non-empty string');
		return false;
	}

	if (typeof init !== 'function') {
		log('error', 'Action init must be a function');
		return false;
	}

	// Check if action already exists
	if (actionRegistry.some(a => a.id === id)) {
		log('warning', `Action "${id}" is already registered, skipping`);
		return false;
	}

	// Register the action
	actionRegistry.push({ id, label, init });
	log('info', `Registered theme action: ${id}`);
	
	return true;
}

/**
 * Get list of all registered actions (for editor).
 *
 * @since 1.0.0
 *
 * @return {Array} Array of action objects with id and label.
 */
function getRegisteredActions() {
	return actionRegistry.map(({ id, label }) => ({ id, label }));
}

// Expose public API globally for theme actions and editor
if (typeof window !== 'undefined') {
	window.BlockActions = window.BlockActions || {};
	window.BlockActions.BaseAction = BaseAction;
	window.BlockActions.registerAction = registerAction;
	window.BlockActions.getRegisteredActions = getRegisteredActions;
}

// Initialize actions when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', initActions);
