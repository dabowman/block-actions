// Add custom jest matchers
import '@testing-library/jest-dom';

// Mock WordPress globals
global.wp = {
	i18n: {
		__: ( text ) => text,
		_x: ( text ) => text,
		sprintf: ( text ) => text,
	},
};

// Mock window.blockActions
window.blockActions = {
	nonce: 'test-nonce',
	debug: true,
	restUrl: 'http://example.test/wp-json/',
};

// Setup fetch mock
global.fetch = jest.fn();

// Setup timer mocks
jest.useFakeTimers();

// Polyfill <dialog> methods missing from jsdom 20 (bundled with
// jest-environment-jsdom ^29.5). jsdom 22+ implements these natively; until
// we upgrade, mirror the platform behavior well enough for unit tests.
if ( typeof HTMLDialogElement !== 'undefined' ) {
	if ( ! HTMLDialogElement.prototype.showModal ) {
		HTMLDialogElement.prototype.showModal = function () {
			this.open = true;
		};
	}
	if ( ! HTMLDialogElement.prototype.show ) {
		HTMLDialogElement.prototype.show = function () {
			this.open = true;
		};
	}
	if ( ! HTMLDialogElement.prototype.close ) {
		HTMLDialogElement.prototype.close = function ( returnValue ) {
			if ( ! this.open ) {
				return;
			}
			this.open = false;
			if ( returnValue !== undefined ) {
				this.returnValue = returnValue;
			}
			this.dispatchEvent( new Event( 'close' ) );
		};
	}
}
