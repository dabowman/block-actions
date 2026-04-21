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
		// Close the modal if still open so the module-level openModalCount
		// stays in sync across tests.
		if ( mockContext.isOpen ) {
			const event = { preventDefault: jest.fn() };
			storeDefinition.actions.toggle( event );
		}
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
		// Open first so the counter is tracked properly.
		const openEvent = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( openEvent );
		expect( mockContext.isOpen ).toBe( true );

		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( event );

		expect( mockContext.isOpen ).toBe( false );
		expect( modalElement.hasAttribute( 'hidden' ) ).toBe( true );
		expect( modalElement.classList.contains( 'is-open' ) ).toBe( false );
		expect( document.body.style.overflow ).toBe( '' );
	} );

	it( 'should keep body overflow hidden when closing one of multiple open modals', () => {
		// Open the first modal.
		const event1 = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( event1 );
		expect( document.body.style.overflow ).toBe( 'hidden' );

		// Simulate a second modal opening by creating a second context/modal.
		const modal2 = document.createElement( 'div' );
		modal2.id = 'test-modal-2';
		modal2.setAttribute( 'hidden', '' );
		modal2.focus = jest.fn();
		document.body.appendChild( modal2 );

		const ctx2 = { modalId: 'test-modal-2', isOpen: false };
		interactivityMock.__setContext( ctx2 );
		const event2 = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( event2 );
		expect( ctx2.isOpen ).toBe( true );

		// Close the second modal — body should stay locked.
		storeDefinition.actions.toggle( event2 );
		expect( ctx2.isOpen ).toBe( false );
		expect( document.body.style.overflow ).toBe( 'hidden' );

		// Close the first modal — body should unlock.
		interactivityMock.__setContext( mockContext );
		storeDefinition.actions.toggle( event1 );
		expect( mockContext.isOpen ).toBe( false );
		expect( document.body.style.overflow ).toBe( '' );

		document.body.removeChild( modal2 );
	} );

	it( 'should close on Escape key', () => {
		// Open first so counter is tracked.
		const openEvent = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( openEvent );
		expect( mockContext.isOpen ).toBe( true );

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
		it( 'returns a cleanup function when a modal is wired up', () => {
			const cleanup = storeDefinition.callbacks.init();
			expect( typeof cleanup ).toBe( 'function' );
		} );

		it( 'returns nothing when modalId is missing', () => {
			interactivityMock.__setContext( { modalId: '', isOpen: false } );
			expect( storeDefinition.callbacks.init() ).toBeUndefined();
		} );

		it( 'returns nothing when modal element is not found', () => {
			interactivityMock.__setContext( {
				modalId: 'nonexistent',
				isOpen: false,
			} );
			expect( storeDefinition.callbacks.init() ).toBeUndefined();
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
