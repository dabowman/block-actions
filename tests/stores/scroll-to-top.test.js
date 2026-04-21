/**
 * Scroll to Top Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
	interactivityMock.store.mockImplementation( ( ns, def ) => def );
	require( '../../src/stores/scroll-to-top/view' );
	storeDefinition =
		interactivityMock.store.mock.calls[
			interactivityMock.store.mock.calls.length - 1
		][ 1 ];
} );

describe( 'Scroll to Top Store', () => {
	let mockElement;
	let mockContext;

	beforeEach( () => {
		jest.useFakeTimers();

		mockElement = document.createElement( 'div' );
		const link = document.createElement( 'a' );
		link.textContent = 'Back to Top';
		mockElement.appendChild( link );

		mockContext = {
			originalText: '',
			isScrolling: false,
			scrollingText: 'Scrolling...',
		};
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );

		window.scrollTo = jest.fn();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'registers with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/scroll-to-top',
			expect.any( Object )
		);
	} );

	it( 'captures original text on init', () => {
		storeDefinition.callbacks.init();
		expect( mockContext.originalText ).toBe( 'Back to Top' );
	} );

	it( 'scrolls to top and flips isScrolling true', () => {
		storeDefinition.callbacks.init();
		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.scrollToTop( event );

		expect( event.preventDefault ).toHaveBeenCalled();
		expect( window.scrollTo ).toHaveBeenCalledWith( {
			top: 0,
			behavior: 'smooth',
		} );
		expect( mockContext.isScrolling ).toBe( true );
	} );

	it( 'resets isScrolling false after the feedback duration', () => {
		storeDefinition.callbacks.init();
		storeDefinition.actions.scrollToTop( { preventDefault: jest.fn() } );
		expect( mockContext.isScrolling ).toBe( true );

		jest.advanceTimersByTime( 500 );
		expect( mockContext.isScrolling ).toBe( false );
	} );

	it( 'state.buttonText swaps between feedback and original', () => {
		mockContext.originalText = 'Back to Top';
		mockContext.isScrolling = false;
		expect( storeDefinition.state.buttonText ).toBe( 'Back to Top' );
		mockContext.isScrolling = true;
		expect( storeDefinition.state.buttonText ).toBe( 'Scrolling...' );
	} );

	it( 'init returns a cleanup function that cancels pending timers', () => {
		const cleanup = storeDefinition.callbacks.init();
		expect( typeof cleanup ).toBe( 'function' );

		storeDefinition.actions.scrollToTop( { preventDefault: jest.fn() } );
		expect( mockContext.isScrolling ).toBe( true );

		cleanup();
		jest.advanceTimersByTime( 500 );
		// Timer was cancelled: isScrolling stays true.
		expect( mockContext.isScrolling ).toBe( true );
	} );
} );
