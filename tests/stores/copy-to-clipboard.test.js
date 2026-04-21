/**
 * Copy to Clipboard Store Tests
 *
 * The store no longer mutates DOM text or styles — those are driven
 * from state.buttonText / state.backgroundColor via data-wp-text and
 * data-wp-style--background-color. Tests assert context.status
 * transitions and state getters rather than DOM inspection.
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
			copiedText: 'Copied!',
			copyFailedText: 'Copy failed',
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

	it( 'registers with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/copy-to-clipboard',
			expect.any( Object )
		);
	} );

	it( 'captures original text on init', () => {
		storeDefinition.callbacks.init();
		expect( mockContext.originalText ).toBe( 'Copy' );
	} );

	it( 'returns a cleanup function from init', () => {
		const cleanup = storeDefinition.callbacks.init();
		expect( typeof cleanup ).toBe( 'function' );
	} );

	it( 'does not invoke clipboard when copyText is empty', () => {
		mockContext.copyText = '';
		const event = { preventDefault: jest.fn() };
		const gen = storeDefinition.actions.copy( event );
		gen.next();
		expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();
	} );

	it( 'sets status to success on successful copy', async () => {
		const event = { preventDefault: jest.fn() };
		const gen = storeDefinition.actions.copy( event );
		const firstYield = gen.next();
		await firstYield.value;
		gen.next();
		expect( mockContext.status ).toBe( 'success' );
	} );

	it( 'sets status to error on clipboard failure', () => {
		// Return a pending promise and drive the generator manually so
		// the rejected path can be exercised synchronously.
		navigator.clipboard.writeText = jest.fn( () => new Promise( () => {} ) );
		const event = { preventDefault: jest.fn() };
		const gen = storeDefinition.actions.copy( event );
		gen.next();
		// Simulate the Interactivity runtime throwing the rejection
		// back into the generator so the try/catch can handle it.
		gen.throw( new Error( 'denied' ) );
		expect( mockContext.status ).toBe( 'error' );
	} );

	it( 'resets status to idle after the feedback timer', async () => {
		const event = { preventDefault: jest.fn() };
		const gen = storeDefinition.actions.copy( event );
		const firstYield = gen.next();
		await firstYield.value;
		gen.next();
		expect( mockContext.status ).toBe( 'success' );
		jest.advanceTimersByTime( 2000 );
		expect( mockContext.status ).toBe( 'idle' );
	} );

	describe( 'state getters', () => {
		it( 'buttonText falls back to originalText when idle', () => {
			mockContext.status = 'idle';
			mockContext.originalText = 'Copy link';
			expect( storeDefinition.state.buttonText ).toBe( 'Copy link' );
		} );

		it( 'buttonText returns copiedText on success', () => {
			mockContext.status = 'success';
			expect( storeDefinition.state.buttonText ).toBe( 'Copied!' );
		} );

		it( 'buttonText returns copyFailedText on error', () => {
			mockContext.status = 'error';
			expect( storeDefinition.state.buttonText ).toBe( 'Copy failed' );
		} );

		it( 'backgroundColor is empty when idle', () => {
			mockContext.status = 'idle';
			expect( storeDefinition.state.backgroundColor ).toBe( '' );
		} );

		it( 'backgroundColor is green on success', () => {
			mockContext.status = 'success';
			expect( storeDefinition.state.backgroundColor ).toBe( '#10b981' );
		} );

		it( 'backgroundColor is red on error', () => {
			mockContext.status = 'error';
			expect( storeDefinition.state.backgroundColor ).toBe( '#ef4444' );
		} );
	} );
} );
