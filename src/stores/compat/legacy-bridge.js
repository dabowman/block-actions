/**
 * Legacy Bridge
 *
 * Compatibility shim that allows old-style IIFE theme actions using
 * window.BlockActions.registerAction() to work with the Interactivity API.
 *
 * The shim wraps the legacy init(element) function in an Interactivity API
 * store with a data-wp-init callback.
 *
 * @since 2.0.0
 */

import { store, getElement } from '@wordpress/interactivity';

window.BlockActions = window.BlockActions || {};

/**
 * Register a legacy action by wrapping its init function in a store.
 *
 * @since 2.0.0
 *
 * @param {string}   id    Action identifier.
 * @param {string}   label Human-readable label.
 * @param {Function} initFn Legacy init function receiving the element.
 * @return {boolean} True if registered.
 */
window.BlockActions.registerAction = function ( id, label, initFn ) {
    if ( ! id || typeof id !== 'string' ) {
        return false;
    }
    if ( typeof initFn !== 'function' ) {
        return false;
    }

    store( `block-actions/${ id }`, {
        callbacks: {
            init() {
                const { ref } = getElement();
                initFn( ref );
            },
        },
    } );

    return true;
};

/**
 * Get registered actions — stub for backward compatibility.
 *
 * @since 2.0.0
 *
 * @return {Array} Empty array (legacy API).
 */
window.BlockActions.getRegisteredActions = function () {
    return [];
};
