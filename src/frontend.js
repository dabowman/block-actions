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
 * Cache for loaded action modules to prevent duplicate imports
 * @type {Map<string, Function>}
 */
const loadedActions = new Map();

/**
 * Simplified telemetry for frontend
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
 * Centralized logging utility for frontend
 *
 * @param {string} type - Log type: 'error', 'warning', 'info'
 * @param {string} message - Log message
 * @param {Error|null} [error] - Optional error object
 */
function log(type, message, error = null) {
	const prefix = '[Tag Heuer Frontend]';

	// Only log errors by default
	if (type === 'error') {
		console.error(`${prefix} ${message}`);
	}
}

/**
 * Safely loads and executes an action on a target element
 *
 * @param {string} actionId - The ID of the action to load
 * @param {HTMLElement} element - The element to apply the action to
 * @async
 */
async function loadAndExecuteAction(actionId, element) {
	const startTime = performance.now();

	// Check if action is already loaded
	if (!loadedActions.has(actionId)) {
		// Dynamic import of the action module
		const actionModule = await import(
			/* webpackChunkName: "[request]" */
			`./actions/${actionId}.js`
		);
		loadedActions.set(actionId, actionModule.default);
		telemetry.actionsLoaded++;
	}

	// Get the loaded action
	const action = loadedActions.get(actionId);

	// Execute with error boundary
	if (typeof action === 'function') {
		action(element);
		const loadTime = performance.now() - startTime;

		// Track performance
		if (!telemetry.actionLoadTimes[actionId]) {
			telemetry.actionLoadTimes[actionId] = [];
		}
		telemetry.actionLoadTimes[actionId].push(Math.round(loadTime));

		log('info', `Action ${actionId} loaded in ${Math.round(loadTime)}ms`);
	} else {
		log('error', `Action ${actionId} is not a valid function`);
	}
}

/**
 * Initializes all actions on the page
 * Finds elements with data-action attributes and applies the corresponding actions
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
