/**
 * Copy to Clipboard Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
	interactivityMock.store.mockImplementation( ( ns, def ) => def );
	require( '../../src/stores/copy-to-clipboard/view' );
	storeDefinition =
		interactivityMock.store.mock.calls[
			interactivityMock.store.mock.calls.length - 1
		][ 1 ];
} );

describe( 'Copy to Clipboard Store', () => {
	let mockElement;
	let mockContext;

	beforeEach( () => {
		jest.useFakeTimers();

		mockElement = document.createElement( 'div' );
		const link = document.createElement( 'a' );
		link.textContent = 'Copy';
		mockElement.appendChild( link );

		mockContext = {
			copyText: 'text to copy',
			originalText: '',
			status: 'idle',
		};
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );

		navigator.clipboard = {
			writeText: jest.fn().mockResolvedValue( undefined ),
		};
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'should register with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/copy-to-clipboard',
			expect.any( Object )
		);
	} );

	it( 'should store original text on init', () => {
		storeDefinition.callbacks.init();
		expect( mockContext.originalText ).toBe( 'Copy' );
	} );

	it( 'should have a copy action (generator function)', () => {
		expect( storeDefinition.actions.copy ).toBeDefined();
	} );

	it( 'should not copy when copyText is empty', () => {
		mockContext.copyText = '';
		const event = { preventDefault: jest.fn() };
		const gen = storeDefinition.actions.copy( event );
		gen.next();
		expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();
	} );

	it( 'should return a cleanup function from init', () => {
		const cleanup = storeDefinition.callbacks.init();
		expect( typeof cleanup ).toBe( 'function' );
	} );

	it( 'should preserve existing inline styles on restore', () => {
		storeDefinition.callbacks.init();
		const link = mockElement.querySelector( 'a' );
		link.style.padding = '10px';
		link.style.backgroundColor = 'blue';

		const event = { preventDefault: jest.fn() };
		const gen = storeDefinition.actions.copy( event );

		// Run through generator: first next starts, yield on clipboard write.
		gen.next();
		// Resolve the clipboard promise.
		gen.next();

		// Background color should be changed to success color.
		expect( link.style.backgroundColor ).not.toBe( 'blue' );

		// Run the timer to trigger restore.
		jest.advanceTimersByTime( 2000 );

		// Background color should be restored to original, padding preserved.
		expect( link.style.backgroundColor ).toBe( 'blue' );
		expect( link.style.padding ).toBe( '10px' );
	} );
} );
