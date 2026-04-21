/**
 * Feedback Store Utility Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let createFeedbackInit, createFeedbackAction, feedbackButtonText;

beforeAll( () => {
	const mod = require( '../../../src/stores/utils/create-feedback-store' );
	createFeedbackInit = mod.createFeedbackInit;
	createFeedbackAction = mod.createFeedbackAction;
	feedbackButtonText = mod.feedbackButtonText;
} );

describe( 'createFeedbackInit', () => {
	let timers;
	let mockElement;
	let mockContext;

	beforeEach( () => {
		jest.useFakeTimers();
		timers = new WeakMap();

		mockElement = document.createElement( 'div' );
		const link = document.createElement( 'a' );
		link.textContent = 'Click me';
		mockElement.appendChild( link );

		mockContext = {};
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'returns an init function', () => {
		expect( typeof createFeedbackInit( timers ) ).toBe( 'function' );
	} );

	it( 'captures original text', () => {
		createFeedbackInit( timers )();
		expect( mockContext.originalText ).toBe( 'Click me' );
	} );

	it( 'does not overwrite originalText if already set', () => {
		mockContext.originalText = 'Preserved';
		createFeedbackInit( timers )();
		expect( mockContext.originalText ).toBe( 'Preserved' );
	} );

	it( 'returns a cleanup function', () => {
		const cleanup = createFeedbackInit( timers )();
		expect( typeof cleanup ).toBe( 'function' );
	} );

	it( 'clears pending timer on cleanup', () => {
		const cleanup = createFeedbackInit( timers )();
		const timerId = setTimeout( () => {}, 1000 );
		timers.set( mockElement, timerId );
		cleanup();
		expect( timers.has( mockElement ) ).toBe( false );
	} );

	it( 'handles cleanup with no pending timer', () => {
		const cleanup = createFeedbackInit( timers )();
		expect( () => cleanup() ).not.toThrow();
	} );
} );

describe( 'createFeedbackAction', () => {
	let timers;
	let mockElement;
	let mockContext;

	beforeEach( () => {
		jest.useFakeTimers();
		timers = new WeakMap();

		mockElement = document.createElement( 'div' );
		const link = document.createElement( 'a' );
		link.textContent = 'Original';
		mockElement.appendChild( link );

		mockContext = { originalText: 'Original', isScrolling: false };
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'returns an action function', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			duration: 500,
		} );
		expect( typeof action ).toBe( 'function' );
	} );

	it( 'calls event.preventDefault', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			duration: 500,
		} );
		const event = { preventDefault: jest.fn() };
		action( event );
		expect( event.preventDefault ).toHaveBeenCalled();
	} );

	it( 'calls perform with ctx', () => {
		const perform = jest.fn();
		const action = createFeedbackAction( timers, { perform, duration: 500 } );
		action( { preventDefault: jest.fn() } );
		expect( perform ).toHaveBeenCalledWith( mockContext );
	} );

	it( 'flips isScrolling true and back after duration', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			duration: 1000,
		} );
		action( { preventDefault: jest.fn() } );
		expect( mockContext.isScrolling ).toBe( true );

		jest.advanceTimersByTime( 1000 );
		expect( mockContext.isScrolling ).toBe( false );
	} );

	it( 'calls onRestore when timer fires', () => {
		const onRestore = jest.fn();
		const action = createFeedbackAction( timers, {
			perform() {},
			duration: 500,
			onRestore,
		} );
		action( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 500 );
		expect( onRestore ).toHaveBeenCalledWith( mockContext );
	} );

	it( 'cancels a pending timer on repeated calls', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			duration: 1000,
		} );
		action( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 500 );

		action( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 500 );
		// Would have fired if the first timer had not been cancelled.
		expect( mockContext.isScrolling ).toBe( true );

		jest.advanceTimersByTime( 500 );
		expect( mockContext.isScrolling ).toBe( false );
	} );
} );

describe( 'feedbackButtonText', () => {
	it( 'returns scrollingText when isScrolling', () => {
		expect(
			feedbackButtonText( {
				isScrolling: true,
				scrollingText: 'Working…',
				originalText: 'Go',
			} )
		).toBe( 'Working…' );
	} );

	it( 'falls back to default scrolling text', () => {
		expect(
			feedbackButtonText( { isScrolling: true, originalText: 'Go' } )
		).toBe( 'Scrolling...' );
	} );

	it( 'returns originalText when idle', () => {
		expect(
			feedbackButtonText( { isScrolling: false, originalText: 'Go' } )
		).toBe( 'Go' );
	} );

	it( 'returns empty string when idle and no originalText', () => {
		expect( feedbackButtonText( { isScrolling: false } ) ).toBe( '' );
	} );
} );
