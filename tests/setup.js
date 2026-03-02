// Add custom jest matchers
import '@testing-library/jest-dom';

// Mock WordPress globals
global.wp = {
	i18n: {
		__: (text) => text,
		_x: (text) => text,
		sprintf: (text) => text
	}
};

// Mock window.blockActions
window.blockActions = {
    nonce: 'test-nonce',
    debug: true,
    restUrl: 'http://example.test/wp-json/'
};

// Setup fetch mock
global.fetch = jest.fn();

// Setup timer mocks
jest.useFakeTimers();
