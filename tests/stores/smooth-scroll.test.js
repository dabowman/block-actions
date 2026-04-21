/**
 * Smooth Scroll Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
	interactivityMock.store.mockImplementation( ( ns, def ) => def );
	require( '../../src/stores/smooth-scroll/view' );
	storeDefinition =
		interactivityMock.store.mock.calls[
			interactivityMock.store.mock.calls.length - 1
		][ 1 ];
} );

describe( 'Smooth Scroll Store', () => {
	let mockElement;
	let mockContext;
	let targetElement;

	beforeEach( () => {
		jest.useFakeTimers();

		mockElement = document.createElement( 'div' );
		const link = document.createElement( 'a' );
		link.textContent = 'Scroll Down';
		mockElement.appendChild( link );

		targetElement = document.createElement( 'div' );
		targetElement.id = 'scroll-target';
		targetElement.getBoundingClientRect = jest.fn( () => ( { top: 500 } ) );
		document.body.appendChild( targetElement );

		mockContext = {
			targetId: 'scroll-target',
			offset: 0,
			originalText: '',
			isScrolling: false,
			scrollingText: 'Scrolling...',
		};
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );

		window.scrollTo = jest.fn();
		Object.defineProperty( window, 'pageYOffset', {
			value: 0,
			writable: true,
			configurable: true,
		} );
	} );

	afterEach( () => {
		jest.useRealTimers();
		document.body.removeChild( targetElement );
	} );

	it( 'registers with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/smooth-scroll',
			expect.any( Object )
		);
	} );

	it( 'captures original text on init', () => {
		storeDefinition.callbacks.init();
		expect( mockContext.originalText ).toBe( 'Scroll Down' );
	} );

	it( 'scrolls to target and flips isScrolling true', () => {
		storeDefinition.callbacks.init();
		storeDefinition.actions.scrollToTarget( { preventDefault: jest.fn() } );

		expect( window.scrollTo ).toHaveBeenCalledWith( {
			top: 500,
			behavior: 'smooth',
		} );
		expect( mockContext.isScrolling ).toBe( true );
	} );

	it( 'applies offset', () => {
		mockContext.offset = 50;
		storeDefinition.callbacks.init();
		storeDefinition.actions.scrollToTarget( { preventDefault: jest.fn() } );

		expect( window.scrollTo ).toHaveBeenCalledWith( {
			top: 450,
			behavior: 'smooth',
		} );
	} );

	it( 'resets isScrolling false after the feedback duration', () => {
		storeDefinition.callbacks.init();
		storeDefinition.actions.scrollToTarget( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 1000 );
		expect( mockContext.isScrolling ).toBe( false );
	} );

	it( 'bails when targetId is empty', () => {
		mockContext.targetId = '';
		storeDefinition.actions.scrollToTarget( { preventDefault: jest.fn() } );
		expect( window.scrollTo ).not.toHaveBeenCalled();
	} );

	it( 'state.buttonText swaps between feedback and original', () => {
		mockContext.originalText = 'Scroll Down';
		mockContext.isScrolling = false;
		expect( storeDefinition.state.buttonText ).toBe( 'Scroll Down' );
		mockContext.isScrolling = true;
		expect( storeDefinition.state.buttonText ).toBe( 'Scrolling...' );
	} );

	it( 'init returns a cleanup function that cancels pending timers', () => {
		const cleanup = storeDefinition.callbacks.init();
		storeDefinition.actions.scrollToTarget( { preventDefault: jest.fn() } );
		expect( mockContext.isScrolling ).toBe( true );

		cleanup();
		jest.advanceTimersByTime( 1000 );
		expect( mockContext.isScrolling ).toBe( true );
	} );
} );
