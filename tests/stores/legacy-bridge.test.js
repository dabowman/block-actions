/**
 * Legacy Bridge Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

beforeAll( () => {
    delete window.BlockActions;
    interactivityMock.store.mockImplementation( ( ns, def ) => def );
    require( '../../src/stores/compat/legacy-bridge' );
} );

describe( 'Legacy Bridge', () => {
    it( 'should expose registerAction on window.BlockActions', () => {
        expect( window.BlockActions ).toBeDefined();
        expect( typeof window.BlockActions.registerAction ).toBe( 'function' );
    } );

    it( 'should expose getRegisteredActions on window.BlockActions', () => {
        expect( typeof window.BlockActions.getRegisteredActions ).toBe(
            'function'
        );
    } );

    it( 'should register a store when registerAction is called', () => {
        const initFn = jest.fn();
        const result = window.BlockActions.registerAction(
            'test-action',
            'Test Action',
            initFn
        );

        expect( result ).toBe( true );
        expect( interactivityMock.store ).toHaveBeenCalledWith(
            'block-actions/test-action',
            expect.objectContaining( {
                callbacks: expect.objectContaining( {
                    init: expect.any( Function ),
                } ),
            } )
        );
    } );

    it( 'should call init function with element ref', () => {
        const initFn = jest.fn();
        window.BlockActions.registerAction(
            'init-test-action',
            'Init Test Action',
            initFn
        );

        // Get the most recent store call for this action.
        const storeCall = interactivityMock.store.mock.calls.find(
            ( call ) => call[ 0 ] === 'block-actions/init-test-action'
        );
        const storeDef = storeCall[ 1 ];

        const el = document.createElement( 'div' );
        interactivityMock.__setElement( el );
        storeDef.callbacks.init();

        expect( initFn ).toHaveBeenCalledWith( el );
    } );

    it( 'should return false for invalid id', () => {
        const result = window.BlockActions.registerAction(
            '',
            'Test',
            jest.fn()
        );
        expect( result ).toBe( false );
    } );

    it( 'should return false for invalid init function', () => {
        const result = window.BlockActions.registerAction(
            'test',
            'Test',
            'not a function'
        );
        expect( result ).toBe( false );
    } );

    it( 'should return empty array from getRegisteredActions', () => {
        expect( window.BlockActions.getRegisteredActions() ).toEqual( [] );
    } );
} );
