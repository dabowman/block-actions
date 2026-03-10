/**
 * Scroll to Top Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
    interactivityMock.store.mockImplementation( ( ns, def ) => def );
    require( '../../src/stores/scroll-to-top/view' );
    storeDefinition = interactivityMock.store.mock.calls[
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

        mockContext = { originalText: '', isScrolling: false };
        interactivityMock.__setContext( mockContext );
        interactivityMock.__setElement( mockElement );

        window.scrollTo = jest.fn();
    } );

    afterEach( () => {
        jest.useRealTimers();
    } );

    it( 'should register with correct namespace', () => {
        expect( interactivityMock.store ).toHaveBeenCalledWith(
            'block-actions/scroll-to-top',
            expect.any( Object )
        );
    } );

    it( 'should store original text on init', () => {
        storeDefinition.callbacks.init();
        expect( mockContext.originalText ).toBe( 'Back to Top' );
    } );

    it( 'should scroll to top on action', () => {
        storeDefinition.callbacks.init();

        const event = { preventDefault: jest.fn() };
        storeDefinition.actions.scrollToTop( event );

        expect( event.preventDefault ).toHaveBeenCalled();
        expect( window.scrollTo ).toHaveBeenCalledWith( {
            top: 0,
            behavior: 'smooth',
        } );
    } );

    it( 'should show scrolling text and reset', () => {
        storeDefinition.callbacks.init();
        const link = mockElement.querySelector( 'a' );

        const event = { preventDefault: jest.fn() };
        storeDefinition.actions.scrollToTop( event );

        expect( link.textContent ).toBe( 'Scrolling...' );

        jest.advanceTimersByTime( 500 );
        expect( link.textContent ).toBe( 'Back to Top' );
    } );

    it( 'should return a cleanup function from init', () => {
        const cleanup = storeDefinition.callbacks.init();
        expect( typeof cleanup ).toBe( 'function' );
    } );

    it( 'should cancel pending timeout on cleanup', () => {
        const cleanup = storeDefinition.callbacks.init();
        const link = mockElement.querySelector( 'a' );

        const event = { preventDefault: jest.fn() };
        storeDefinition.actions.scrollToTop( event );
        expect( link.textContent ).toBe( 'Scrolling...' );

        // Cleanup before timeout fires.
        cleanup();
        jest.advanceTimersByTime( 500 );

        // Text should NOT have reset because cleanup cancelled the timer.
        expect( link.textContent ).toBe( 'Scrolling...' );
    } );
} );
