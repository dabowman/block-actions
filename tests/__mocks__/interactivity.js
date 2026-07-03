/**
 * Mock for @wordpress/interactivity
 *
 * Provides controllable mocks for store(), getContext(), getElement().
 */

let currentContext = {};
let currentElement = { ref: document.createElement( 'div' ) };

const storeRegistry = {};
const store = jest.fn( ( namespace, definition ) => {
	// Mirror the real API's merge-or-fetch behavior enough for tests:
	// registering returns the definition; a bare store( ns ) call
	// returns whatever was registered under that namespace (used by the
	// interactions dispatcher for cross-store entry invocation).
	if ( definition ) {
		storeRegistry[ namespace ] = definition;
		return definition;
	}
	return storeRegistry[ namespace ];
} );
const getContext = jest.fn( () => currentContext );
const getElement = jest.fn( () => currentElement );

// Pass-through wrappers — the real implementations bind event scope and
// preserve store scope in external callbacks. In jsdom tests we just
// delegate to the underlying function; store/getContext mocks handle
// scope via the module-level `currentContext`/`currentElement`.
const withSyncEvent = jest.fn( ( fn ) => fn );
const withScope = jest.fn( ( fn ) => fn );

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
	withSyncEvent,
	withScope,
	__setContext,
	__setElement,
	__reset,
};
