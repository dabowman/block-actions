/**
 * Actions Registry
 * This file automatically discovers and exports all actions in the directory.
 */

// Use webpack's require.context to get all .js files in current directory
const actionContext = require.context('./', false, /\.js$/);

// Filter out this index file and create an array of action modules
const actions = actionContext.keys()
    .filter(key => key !== './index.js' && key !== './base-action.js')
    .map(key => {
        const module = actionContext(key);
        // Get the action name from the file path (e.g., './add-to-cart.js' -> 'add-to-cart')
        const id = key.replace(/^\.\/(.*)\.js$/, '$1');
        return {
            id,
            label: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            init: module.default
        };
    });

export default actions;
