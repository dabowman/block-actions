/**
 * Mock for @wordpress/interactivity-router
 *
 * The real module performs region-swapping client navigation; tests only
 * need to observe that navigate()/prefetch() were called with the right
 * URLs and options.
 */

const actions = {
	navigate: jest.fn( () => Promise.resolve() ),
	prefetch: jest.fn( () => Promise.resolve() ),
};

/**
 * Reset call history between tests.
 */
function __reset() {
	actions.navigate.mockClear();
	actions.prefetch.mockClear();
}

module.exports = { actions, __reset };
