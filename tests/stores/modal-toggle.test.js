/**
 * Modal Toggle Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
	interactivityMock.store.mockImplementation( ( ns, def ) => def );
	require( '../../src/stores/modal-toggle/view' );
	storeDefinition =
		interactivityMock.store.mock.calls[
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

	describe( 'init callback', () => {
		it( 'should return a cleanup function', () => {
			const cleanup = storeDefinition.callbacks.init();
			expect( typeof cleanup ).toBe( 'function' );
		} );

		it( 'should register close button listeners in init', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.classList.add( 'modal-close' );
			modalElement.appendChild( closeBtn );
			const addSpy = jest.spyOn( closeBtn, 'addEventListener' );

			storeDefinition.callbacks.init();

			expect( addSpy ).toHaveBeenCalledWith(
				'click',
				expect.any( Function )
			);
			addSpy.mockRestore();
			modalElement.removeChild( closeBtn );
		} );

		it( 'should close modal via close button click', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.classList.add( 'modal-close' );
			modalElement.appendChild( closeBtn );

			storeDefinition.callbacks.init();

			// Open the modal first.
			const event = { preventDefault: jest.fn() };
			storeDefinition.actions.toggle( event );
			expect( mockContext.isOpen ).toBe( true );

			// Click close button.
			closeBtn.click();
			expect( mockContext.isOpen ).toBe( false );

			modalElement.removeChild( closeBtn );
		} );

		it( 'should not accumulate listeners on repeated open/close', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.classList.add( 'modal-close' );
			modalElement.appendChild( closeBtn );

			storeDefinition.callbacks.init();
			const addSpy = jest.spyOn( closeBtn, 'addEventListener' );

			// Open, close via Escape, open again — should not add new listeners.
			const event = { preventDefault: jest.fn() };
			storeDefinition.actions.toggle( event );
			storeDefinition.actions.handleKeydown( { key: 'Escape' } );
			storeDefinition.actions.toggle( event );

			expect( addSpy ).not.toHaveBeenCalled();
			addSpy.mockRestore();
			modalElement.removeChild( closeBtn );
		} );

		it( 'should remove listeners on cleanup', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.classList.add( 'modal-close' );
			modalElement.appendChild( closeBtn );
			const removeSpy = jest.spyOn( closeBtn, 'removeEventListener' );
			const modalRemoveSpy = jest.spyOn(
				modalElement,
				'removeEventListener'
			);

			const cleanup = storeDefinition.callbacks.init();
			cleanup();

			expect( removeSpy ).toHaveBeenCalledWith(
				'click',
				expect.any( Function )
			);
			expect( modalRemoveSpy ).toHaveBeenCalledWith(
				'click',
				expect.any( Function )
			);
			removeSpy.mockRestore();
			modalRemoveSpy.mockRestore();
			modalElement.removeChild( closeBtn );
		} );
	} );
} );
