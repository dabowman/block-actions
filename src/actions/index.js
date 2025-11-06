/**
 * Actions Registry.
 * This file automatically discovers and exports all actions in the directory.
 * 
 * Note: Action IDs are derived from filenames, not from exports.
 * For example, 'scroll-to-top.js' becomes the 'scroll-to-top' action.
 *
 * @since 1.0.0
 */

// Use webpack's require.context to get all .js files in current directory
const actionContext = require.context('./', false, /\.js$/);

// Whitelist core actions to ship by default
const CORE_ACTION_IDS = [
    'scroll-to-top',
    'carousel',
];

// Filter out this index file and create an array of action modules
// Action IDs are extracted from filenames
const actions = actionContext.keys()
    .filter(key => key !== './index.js' && key !== './base-action.js')
    .map(key => key.replace(/^\.\/(.*)\.js$/, '$1'))
    .filter(id => CORE_ACTION_IDS.includes(id))
    .map(id => {
        const module = actionContext(`./${id}.js`);
        return {
            id,
            label: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            init: module.default
        };
    });

export default actions;
