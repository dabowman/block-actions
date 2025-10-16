// Add custom jest matchers
import '@testing-library/jest-dom';

// Mock WordPress globals
global.wp = {
	i18n: {
		__: (text) => text,
		_x: (text) => text,
		sprintf: (text, ...args) => text
	}
};

// Mock window.tagHeuerActions
window.tagHeuerActions = {
	nonce: 'test-nonce',
	debug: true
};

// Setup fetch mock
global.fetch = jest.fn();

// Setup timer mocks
jest.useFakeTimers();
