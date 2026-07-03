/**
 * Interactions dispatcher engine tests.
 *
 * The engine reads validated data-ba-* config off the element, checks
 * conditions at fire time, and dispatches a synthetic `ba-fire` event —
 * the RUNTIME's `data-wp-on--ba-fire` directive then evaluates the
 * entry in the element's own namespace scope. Tests listen for that
 * event the way the runtime would.
 */

const interactivityMock = require( '@wordpress/interactivity' );

let engine;
let helpers;

beforeAll( () => {
	helpers = require( '../../src/stores/interactions/view' );
	engine =
		interactivityMock.store.mock.calls[
			interactivityMock.store.mock.calls.length - 1
		][ 1 ];
} );

function element( attrs ) {
	const el = document.createElement( 'div' );
	Object.entries( attrs ).forEach( ( [ k, v ] ) =>
		el.setAttribute( k, String( v ) )
	);
	return el;
}

// Attach a runtime-like listener and return its call log.
function armFireListener( el ) {
	const fired = [];
	el.addEventListener( helpers.FIRE_EVENT, ( e ) => fired.push( e ) );
	return fired;
}

const mmFactory = ( { width = 1024, reduced = false } = {} ) => {
	return ( query ) => {
		if ( query.includes( 'prefers-reduced-motion' ) ) {
			return { matches: reduced };
		}
		const min = query.match( /min-width: (\d+)px/ );
		if ( min ) {
			return { matches: width >= Number( min[ 1 ] ) };
		}
		const max = query.match( /max-width: (\d+)px/ );
		if ( max ) {
			return { matches: width <= Number( max[ 1 ] ) };
		}
		return { matches: true };
	};
};

describe( 'conditionsMet', () => {
	it( 'passes with no conditions', () => {
		expect(
			helpers.conditionsMet(
				{ minWidth: 0, maxWidth: 0, reducedMotion: false },
				mmFactory()
			)
		).toBe( true );
	} );

	it( 'gates on min/max viewport width', () => {
		const cfg = { minWidth: 782, maxWidth: 0, reducedMotion: false };
		expect(
			helpers.conditionsMet( cfg, mmFactory( { width: 500 } ) )
		).toBe( false );
		expect(
			helpers.conditionsMet( cfg, mmFactory( { width: 800 } ) )
		).toBe( true );

		const cfgMax = { minWidth: 0, maxWidth: 600, reducedMotion: false };
		expect(
			helpers.conditionsMet( cfgMax, mmFactory( { width: 800 } ) )
		).toBe( false );
	} );

	it( 'gates on prefers-reduced-motion', () => {
		const cfg = { minWidth: 0, maxWidth: 0, reducedMotion: true };
		expect(
			helpers.conditionsMet( cfg, mmFactory( { reduced: true } ) )
		).toBe( false );
		expect(
			helpers.conditionsMet( cfg, mmFactory( { reduced: false } ) )
		).toBe( true );
	} );
} );

describe( 'readConfig', () => {
	it( 'parses the injected data-ba-* attributes', () => {
		const cfg = helpers.readConfig(
			element( {
				'data-ba-trigger': 'timer',
				'data-ba-delay': '2500',
				'data-ba-min-width': '782',
				'data-ba-reduced-motion': 'skip',
			} )
		);
		expect( cfg ).toEqual( {
			trigger: 'timer',
			delay: 2500,
			minWidth: 782,
			maxWidth: 0,
			reducedMotion: true,
		} );
	} );
} );

describe( 'dispatch (conditioned click/hover)', () => {
	beforeEach( () => {
		window.matchMedia = mmFactory( { width: 1024 } );
	} );

	it( 'preventDefaults the original event and fires ba-fire when conditions pass', () => {
		const el = element( { 'data-ba-min-width': '782' } );
		const fired = armFireListener( el );
		interactivityMock.__setElement( el );

		const original = { preventDefault: jest.fn() };
		engine.actions.dispatch( original );

		expect( original.preventDefault ).toHaveBeenCalled();
		expect( fired ).toHaveLength( 1 );
		expect( fired[ 0 ].cancelable ).toBe( true );
	} );

	it( 'lets the original interaction proceed when conditions fail', () => {
		window.matchMedia = mmFactory( { width: 500 } );
		const el = element( { 'data-ba-min-width': '782' } );
		const fired = armFireListener( el );
		interactivityMock.__setElement( el );

		const original = { preventDefault: jest.fn() };
		engine.actions.dispatch( original );

		expect( original.preventDefault ).not.toHaveBeenCalled();
		expect( fired ).toHaveLength( 0 );
	} );
} );

describe( 'keyActivate (keyboard operability)', () => {
	it( 'Enter and Space re-dispatch as a click; other keys ignored', () => {
		const el = element( {} );
		const clicked = [];
		el.addEventListener( 'click', () => clicked.push( 1 ) );
		interactivityMock.__setElement( el );

		const enter = { key: 'Enter', preventDefault: jest.fn() };
		engine.actions.keyActivate( enter );
		expect( enter.preventDefault ).toHaveBeenCalled();
		expect( clicked ).toHaveLength( 1 );

		const space = { key: ' ', preventDefault: jest.fn() };
		engine.actions.keyActivate( space );
		expect( clicked ).toHaveLength( 2 );

		const other = { key: 'a', preventDefault: jest.fn() };
		engine.actions.keyActivate( other );
		expect( other.preventDefault ).not.toHaveBeenCalled();
		expect( clicked ).toHaveLength( 2 );
	} );
} );

describe( 'initTrigger', () => {
	beforeEach( () => {
		window.matchMedia = mmFactory();
	} );

	it( 'load: fires DEFERRED (after target inits settle), not synchronously', () => {
		jest.useFakeTimers();
		const el = element( { 'data-ba-trigger': 'load' } );
		const fired = armFireListener( el );
		interactivityMock.__setElement( el );

		engine.callbacks.initTrigger();
		// Synchronous fire would run before the target store's own
		// data-wp-init populated its context.
		expect( fired ).toHaveLength( 0 );
		jest.advanceTimersByTime( 0 );
		expect( fired ).toHaveLength( 1 );
		jest.useRealTimers();
	} );

	it( 'timer: fires after the delay; cleanup cancels', () => {
		jest.useFakeTimers();
		const el = element( {
			'data-ba-trigger': 'timer',
			'data-ba-delay': '1000',
		} );
		const fired = armFireListener( el );
		interactivityMock.__setElement( el );

		engine.callbacks.initTrigger();
		jest.advanceTimersByTime( 999 );
		expect( fired ).toHaveLength( 0 );
		jest.advanceTimersByTime( 1 );
		expect( fired ).toHaveLength( 1 );

		const cleanup = engine.callbacks.initTrigger();
		cleanup();
		jest.advanceTimersByTime( 5000 );
		expect( fired ).toHaveLength( 1 );
		jest.useRealTimers();
	} );

	it( 'scroll-into-view: fires once on intersection and disarms', () => {
		let observerCallback;
		const disconnect = jest.fn();
		const observe = jest.fn();
		window.IntersectionObserver = jest.fn( ( cb ) => {
			observerCallback = cb;
			return { observe, disconnect };
		} );

		const el = element( { 'data-ba-trigger': 'scroll-into-view' } );
		const fired = armFireListener( el );
		interactivityMock.__setElement( el );

		const cleanup = engine.callbacks.initTrigger();
		expect( observe ).toHaveBeenCalled();

		observerCallback( [ { isIntersecting: false } ] );
		expect( fired ).toHaveLength( 0 );

		observerCallback( [ { isIntersecting: true } ] );
		expect( fired ).toHaveLength( 1 );
		expect( disconnect ).toHaveBeenCalled();

		cleanup();
	} );

	it( 'conditions are checked at FIRE time, not arm time', () => {
		jest.useFakeTimers();
		window.matchMedia = mmFactory( { width: 1024 } );
		const el = element( {
			'data-ba-trigger': 'timer',
			'data-ba-delay': '100',
			'data-ba-min-width': '782',
		} );
		const fired = armFireListener( el );
		interactivityMock.__setElement( el );

		engine.callbacks.initTrigger();
		// Viewport shrinks below the threshold before the timer fires.
		window.matchMedia = mmFactory( { width: 400 } );
		jest.advanceTimersByTime( 100 );
		expect( fired ).toHaveLength( 0 );
		jest.useRealTimers();
	} );
} );
