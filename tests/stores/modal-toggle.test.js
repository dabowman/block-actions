/**
 * Modal Toggle Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
    interactivityMock.store.mockImplementation( ( ns, def ) => def );
    require( '../../src/stores/modal-toggle/view' );
    storeDefinition = interactivityMock.store.mock.calls[
        interactivityMock.store.mock.calls.length - 1
    ][ 1 ];
} );

describe( 'Modal Toggle Store', () => {
    let mockElement;
    let mockContext;
    let modalElement;

    beforeEach( () => {
        mockElement = document.createElement( 'div' );
        modalElement = document.createElement( 'div' );
        modalElement.id = 'test-modal';
        modalElement.setAttribute( 'hidden', '' );
        modalElement.focus = jest.fn();
        document.body.appendChild( modalElement );

        mockContext = { modalId: 'test-modal', isOpen: false };
        interactivityMock.__setContext( mockContext );
        interactivityMock.__setElement( mockElement );
    } );

    afterEach( () => {
        document.body.removeChild( modalElement );
        document.body.style.overflow = '';
    } );

    it( 'should register with correct namespace', () => {
        expect( interactivityMock.store ).toHaveBeenCalledWith(
            'block-actions/modal-toggle',
            expect.any( Object )
        );
    } );

    it( 'should open modal on toggle', () => {
        const event = { preventDefault: jest.fn() };
        storeDefinition.actions.toggle( event );

        expect( mockContext.isOpen ).toBe( true );
        expect( modalElement.hasAttribute( 'hidden' ) ).toBe( false );
        expect( modalElement.classList.contains( 'is-open' ) ).toBe( true );
        expect( document.body.style.overflow ).toBe( 'hidden' );
    } );

    it( 'should close modal on toggle when open', () => {
        mockContext.isOpen = true;
        modalElement.removeAttribute( 'hidden' );
        modalElement.classList.add( 'is-open' );

        const event = { preventDefault: jest.fn() };
        storeDefinition.actions.toggle( event );

        expect( mockContext.isOpen ).toBe( false );
        expect( modalElement.hasAttribute( 'hidden' ) ).toBe( true );
        expect( modalElement.classList.contains( 'is-open' ) ).toBe( false );
        expect( document.body.style.overflow ).toBe( '' );
    } );

    it( 'should close on Escape key', () => {
        mockContext.isOpen = true;
        modalElement.removeAttribute( 'hidden' );

        storeDefinition.actions.handleKeydown( { key: 'Escape' } );

        expect( mockContext.isOpen ).toBe( false );
        expect( modalElement.hasAttribute( 'hidden' ) ).toBe( true );
    } );

    it( 'should not close on non-Escape key', () => {
        mockContext.isOpen = true;
        modalElement.removeAttribute( 'hidden' );

        storeDefinition.actions.handleKeydown( { key: 'Enter' } );

        expect( mockContext.isOpen ).toBe( true );
    } );
} );
