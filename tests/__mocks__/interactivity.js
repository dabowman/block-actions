/**
 * Mock for @wordpress/interactivity
 *
 * Provides controllable mocks for store(), getContext(), getElement().
 */

let currentContext = {};
let currentElement = { ref: document.createElement( 'div' ) };

const store = jest.fn( ( namespace, definition ) => definition );
const getContext = jest.fn( () => currentContext );
const getElement = jest.fn( () => currentElement );

/**
 * Set the context returned by getContext() in tests.
 *
 * @param {Object} ctx The context object.
 */
function __setContext( ctx ) {
    currentContext = ctx;
}

/**
 * Set the element returned by getElement() in tests.
 *
 * @param {HTMLElement} el The DOM element.
 */
function __setElement( el ) {
    currentElement = { ref: el };
}

/**
 * Reset all mocks to defaults.
 */
function __reset() {
    currentContext = {};
    currentElement = { ref: document.createElement( 'div' ) };
    store.mockClear();
    getContext.mockClear();
    getElement.mockClear();
}

module.exports = {
    store,
    getContext,
    getElement,
    __setContext,
    __setElement,
    __reset,
};
