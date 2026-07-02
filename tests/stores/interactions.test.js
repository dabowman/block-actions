/**
 * Interactions dispatcher engine tests.
 *
 * The engine reads validated data-ba-* config off the element, checks
 * conditions at fire time, and invokes the target store's entry action
 * (via the mock's store registry here).
 */

const interactivityMock = require( '@wordpress/interactivity' );

let engine;
let helpers;

// A fake behavioral store the engine dispatches into.
const targetToggle = jest.fn();
const targetGen = jest.fn();

beforeAll( () => {
	// The interactivity mock keeps a store registry: registering returns
	// the definition; a bare store( ns ) fetches it — exactly what the
	// engine's cross-store dispatch relies on.
	// Register the fake target BEFORE loading the engine module (the
	// mock keeps a registry, so store('fake/target') resolves).
	interactivityMock.store( 'fake/target', {
		actions: {
			toggle: targetToggle,
			*copy() {
				targetGen();
				yield Promise.resolve();
				targetGen();
			},
		},
	} );
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
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-trigger': 'timer',
				'data-ba-delay': '2500',
				'data-ba-min-width': '782',
				'data-ba-reduced-motion': 'skip',
			} )
		);
		expect( cfg ).toEqual( {
			entry: 'fake/target::actions.toggle',
			trigger: 'timer',
			delay: 2500,
			minWidth: 782,
			maxWidth: 0,
			reducedMotion: true,
		} );
	} );
} );

describe( 'dispatch (click/hover with conditions)', () => {
	beforeEach( () => {
		targetToggle.mockClear();
		window.matchMedia = mmFactory( { width: 1024 } );
	} );

	it( 'invokes the entry when conditions pass', () => {
		interactivityMock.__setElement(
			element( {
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-trigger': 'click',
				'data-ba-min-width': '782',
			} )
		);
		const event = { type: 'click' };
		engine.actions.dispatch( event );
		expect( targetToggle ).toHaveBeenCalledWith( event );
	} );

	it( 'skips when conditions fail (evaluated at fire time)', () => {
		window.matchMedia = mmFactory( { width: 500 } );
		interactivityMock.__setElement(
			element( {
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-min-width': '782',
			} )
		);
		engine.actions.dispatch( { type: 'click' } );
		expect( targetToggle ).not.toHaveBeenCalled();
	} );

	it( 'drives generator entries to completion', async () => {
		targetGen.mockClear();
		interactivityMock.__setElement(
			element( { 'data-ba-entry': 'fake/target::actions.copy' } )
		);
		await engine.actions.dispatch( { type: 'click' } );
		expect( targetGen ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'warns on an unresolvable entry', () => {
		const warn = jest
			.spyOn( console, 'warn' )
			.mockImplementation( () => {} );
		interactivityMock.__setElement(
			element( { 'data-ba-entry': 'missing/store::actions.nope' } )
		);
		engine.actions.dispatch( { type: 'click' } );
		expect( warn ).toHaveBeenCalled();
		warn.mockRestore();
	} );
} );

describe( 'initTrigger', () => {
	beforeEach( () => {
		targetToggle.mockClear();
		window.matchMedia = mmFactory();
	} );

	it( 'load: fires immediately when conditions pass', () => {
		interactivityMock.__setElement(
			element( {
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-trigger': 'load',
			} )
		);
		engine.callbacks.initTrigger();
		expect( targetToggle ).toHaveBeenCalled();
	} );

	it( 'timer: fires after the delay; cleanup cancels', () => {
		jest.useFakeTimers();
		interactivityMock.__setElement(
			element( {
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-trigger': 'timer',
				'data-ba-delay': '1000',
			} )
		);
		const cleanup = engine.callbacks.initTrigger();
		jest.advanceTimersByTime( 999 );
		expect( targetToggle ).not.toHaveBeenCalled();
		jest.advanceTimersByTime( 1 );
		expect( targetToggle ).toHaveBeenCalledTimes( 1 );

		// A second armed timer dies with its element.
		targetToggle.mockClear();
		const cleanup2 = engine.callbacks.initTrigger();
		cleanup2();
		jest.advanceTimersByTime( 5000 );
		expect( targetToggle ).not.toHaveBeenCalled();
		expect( typeof cleanup ).toBe( 'function' );
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

		interactivityMock.__setElement(
			element( {
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-trigger': 'scroll-into-view',
			} )
		);
		const cleanup = engine.callbacks.initTrigger();
		expect( observe ).toHaveBeenCalled();

		observerCallback( [ { isIntersecting: false } ] );
		expect( targetToggle ).not.toHaveBeenCalled();

		observerCallback( [ { isIntersecting: true } ] );
		expect( targetToggle ).toHaveBeenCalledTimes( 1 );
		expect( disconnect ).toHaveBeenCalled();

		cleanup();
	} );

	it( 'timer conditions are checked at FIRE time, not arm time', () => {
		jest.useFakeTimers();
		window.matchMedia = mmFactory( { width: 1024 } );
		interactivityMock.__setElement(
			element( {
				'data-ba-entry': 'fake/target::actions.toggle',
				'data-ba-trigger': 'timer',
				'data-ba-delay': '100',
				'data-ba-min-width': '782',
			} )
		);
		engine.callbacks.initTrigger();
		// Viewport shrinks below the threshold before the timer fires.
		window.matchMedia = mmFactory( { width: 400 } );
		jest.advanceTimersByTime( 100 );
		expect( targetToggle ).not.toHaveBeenCalled();
		jest.useRealTimers();
	} );
} );
