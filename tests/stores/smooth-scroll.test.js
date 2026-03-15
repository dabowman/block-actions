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

	it( 'should register with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/smooth-scroll',
			expect.any( Object )
		);
	} );

	it( 'should store original text on init', () => {
		storeDefinition.callbacks.init();
		expect( mockContext.originalText ).toBe( 'Scroll Down' );
	} );

	it( 'should scroll to target on action', () => {
		storeDefinition.callbacks.init();
		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.scrollToTarget( event );

		expect( window.scrollTo ).toHaveBeenCalledWith( {
			top: 500,
			behavior: 'smooth',
		} );
	} );

	it( 'should apply offset', () => {
		mockContext.offset = 50;
		storeDefinition.callbacks.init();
		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.scrollToTarget( event );

		expect( window.scrollTo ).toHaveBeenCalledWith( {
			top: 450,
			behavior: 'smooth',
		} );
	} );

	it( 'should show scrolling text and reset', () => {
		storeDefinition.callbacks.init();
		const link = mockElement.querySelector( 'a' );
		const event = { preventDefault: jest.fn() };

		storeDefinition.actions.scrollToTarget( event );
		expect( link.textContent ).toBe( 'Scrolling...' );

		jest.advanceTimersByTime( 1000 );
		expect( link.textContent ).toBe( 'Scroll Down' );
	} );

	it( 'should not scroll when targetId is empty', () => {
		mockContext.targetId = '';
		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.scrollToTarget( event );
		expect( window.scrollTo ).not.toHaveBeenCalled();
	} );

	it( 'should return a cleanup function from init', () => {
		const cleanup = storeDefinition.callbacks.init();
		expect( typeof cleanup ).toBe( 'function' );
	} );

	it( 'should cancel pending timeout on cleanup', () => {
		const cleanup = storeDefinition.callbacks.init();
		const link = mockElement.querySelector( 'a' );
		const event = { preventDefault: jest.fn() };

		storeDefinition.actions.scrollToTarget( event );
		expect( link.textContent ).toBe( 'Scrolling...' );

		cleanup();
		jest.advanceTimersByTime( 1000 );

		expect( link.textContent ).toBe( 'Scrolling...' );
	} );
} );
