/**
 * Feedback Store Utility Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let createFeedbackInit, createFeedbackAction, setFeedbackTimer;

beforeAll( () => {
	const mod = require( '../../../src/stores/utils/create-feedback-store' );
	createFeedbackInit = mod.createFeedbackInit;
	createFeedbackAction = mod.createFeedbackAction;
	setFeedbackTimer = mod.setFeedbackTimer;
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

	it( 'should return an init function', () => {
		const init = createFeedbackInit( timers );
		expect( typeof init ).toBe( 'function' );
	} );

	it( 'should capture original text', () => {
		const init = createFeedbackInit( timers );
		init();
		expect( mockContext.originalText ).toBe( 'Click me' );
	} );

	it( 'should return a cleanup function', () => {
		const init = createFeedbackInit( timers );
		const cleanup = init();
		expect( typeof cleanup ).toBe( 'function' );
	} );

	it( 'should clear pending timer on cleanup', () => {
		const init = createFeedbackInit( timers );
		const cleanup = init();

		// Simulate a pending timer.
		const timerId = setTimeout( () => {}, 1000 );
		timers.set( mockElement, timerId );

		cleanup();

		expect( timers.has( mockElement ) ).toBe( false );
	} );

	it( 'should handle cleanup with no pending timer', () => {
		const init = createFeedbackInit( timers );
		const cleanup = init();
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

		mockContext = { originalText: 'Original' };
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'should return an action function', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			feedbackText: () => 'Done',
			duration: 500,
		} );
		expect( typeof action ).toBe( 'function' );
	} );

	it( 'should call event.preventDefault', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			feedbackText: () => 'Done',
			duration: 500,
		} );
		const event = { preventDefault: jest.fn() };
		action( event );
		expect( event.preventDefault ).toHaveBeenCalled();
	} );

	it( 'should call perform with ctx, ref, and target', () => {
		const perform = jest.fn();
		const action = createFeedbackAction( timers, {
			perform,
			feedbackText: () => 'Done',
			duration: 500,
		} );
		action( { preventDefault: jest.fn() } );
		expect( perform ).toHaveBeenCalledWith(
			mockContext,
			mockElement,
			mockElement.querySelector( 'a' )
		);
	} );

	it( 'should set feedback text and restore after duration', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			feedbackText: () => 'Working...',
			duration: 1000,
		} );
		const link = mockElement.querySelector( 'a' );

		action( { preventDefault: jest.fn() } );
		expect( link.textContent ).toBe( 'Working...' );

		jest.advanceTimersByTime( 1000 );
		expect( link.textContent ).toBe( 'Original' );
	} );

	it( 'should call onRestore when timer fires', () => {
		const onRestore = jest.fn();
		const action = createFeedbackAction( timers, {
			perform() {},
			feedbackText: () => 'Done',
			duration: 500,
			onRestore,
		} );

		action( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 500 );

		expect( onRestore ).toHaveBeenCalledWith(
			mockContext,
			mockElement.querySelector( 'a' )
		);
	} );

	it( 'should clear existing timer on repeated calls', () => {
		const action = createFeedbackAction( timers, {
			perform() {},
			feedbackText: () => 'Working...',
			duration: 1000,
		} );
		const link = mockElement.querySelector( 'a' );

		action( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 500 );

		// Second call before first timer fires.
		action( { preventDefault: jest.fn() } );
		jest.advanceTimersByTime( 500 );

		// First timer should have been cancelled; text is still feedback.
		expect( link.textContent ).toBe( 'Working...' );

		jest.advanceTimersByTime( 500 );
		expect( link.textContent ).toBe( 'Original' );
	} );
} );

describe( 'setFeedbackTimer', () => {
	let timers;
	let ref;
	let target;
	let ctx;

	beforeEach( () => {
		jest.useFakeTimers();
		timers = new WeakMap();
		ref = document.createElement( 'div' );
		target = document.createElement( 'a' );
		target.textContent = 'Original';
		ctx = { originalText: 'Original' };
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'should set feedback text immediately', () => {
		setFeedbackTimer( ref, timers, target, ctx, {
			feedbackText: () => 'Loading...',
			duration: 500,
		} );
		expect( target.textContent ).toBe( 'Loading...' );
	} );

	it( 'should restore original text after duration', () => {
		setFeedbackTimer( ref, timers, target, ctx, {
			feedbackText: () => 'Loading...',
			duration: 500,
		} );
		jest.advanceTimersByTime( 500 );
		expect( target.textContent ).toBe( 'Original' );
	} );

	it( 'should call onRestore callback', () => {
		const onRestore = jest.fn();
		setFeedbackTimer( ref, timers, target, ctx, {
			feedbackText: () => 'Loading...',
			duration: 500,
			onRestore,
		} );
		jest.advanceTimersByTime( 500 );
		expect( onRestore ).toHaveBeenCalledWith( ctx, target );
	} );

	it( 'should clean up timer from WeakMap after firing', () => {
		setFeedbackTimer( ref, timers, target, ctx, {
			feedbackText: () => 'Loading...',
			duration: 500,
		} );
		expect( timers.has( ref ) ).toBe( true );
		jest.advanceTimersByTime( 500 );
		expect( timers.has( ref ) ).toBe( false );
	} );
} );
