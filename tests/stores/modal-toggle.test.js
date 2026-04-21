/**
 * Modal Toggle Store Tests
 *
 * Covers the native-<dialog>-based store. Focus trap, ESC to close, and
 * focus restore are delegated to the browser and not exercised here —
 * jsdom's dialog polyfill in tests/setup.js only implements enough to
 * track open state and dispatch the close event.
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
		// Reset module-level state so counter/overflow don't leak between cases.
		storeDefinition.state.openCount = 0;
		storeDefinition.state.priorBodyOverflow = '';

		mockElement = document.createElement( 'button' );
		modalElement = document.createElement( 'dialog' );
		modalElement.id = 'test-modal';
		document.body.appendChild( modalElement );

		mockContext = { modalId: 'test-modal', isOpen: false };
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );
	} );

	afterEach( () => {
		if ( modalElement.open ) {
			modalElement.close();
		}
		document.body.removeChild( modalElement );
		document.body.style.overflow = '';
	} );

	it( 'registers with the correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/modal-toggle',
			expect.any( Object )
		);
	} );

	describe( 'toggle action', () => {
		beforeEach( () => {
			// Wire close listeners so the close path can sync state. In
			// real usage `data-wp-init` guarantees this; tests need to
			// reproduce it explicitly.
			storeDefinition.callbacks.init();
		} );

		it( 'opens the dialog and locks body scroll', () => {
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );

			expect( modalElement.open ).toBe( true );
			expect( mockContext.isOpen ).toBe( true );
			expect( document.body.style.overflow ).toBe( 'hidden' );
		} );

		it( 'closes the dialog on the second toggle and restores scroll', () => {
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );

			expect( modalElement.open ).toBe( false );
			expect( mockContext.isOpen ).toBe( false );
			expect( document.body.style.overflow ).toBe( '' );
		} );

		it( 'no-ops when modalId is missing', () => {
			interactivityMock.__setContext( { modalId: '', isOpen: false } );

			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );

			expect( modalElement.open ).toBe( false );
		} );

		it( 'no-ops when target is not a <dialog>', () => {
			const div = document.createElement( 'div' );
			div.id = 'not-a-dialog';
			document.body.appendChild( div );
			interactivityMock.__setContext( {
				modalId: 'not-a-dialog',
				isOpen: false,
			} );

			expect( () =>
				storeDefinition.actions.toggle( {
					preventDefault: jest.fn(),
				} )
			).not.toThrow();

			document.body.removeChild( div );
		} );

		it( 'preserves body overflow when one of two modals closes', () => {
			// Open the first (ctx1 was wired in the outer beforeEach init).
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( document.body.style.overflow ).toBe( 'hidden' );

			// Spin up a second trigger + dialog + context.
			const trigger2 = document.createElement( 'button' );
			const modal2 = document.createElement( 'dialog' );
			modal2.id = 'test-modal-2';
			document.body.appendChild( modal2 );
			const ctx2 = { modalId: 'test-modal-2', isOpen: false };
			interactivityMock.__setContext( ctx2 );
			interactivityMock.__setElement( trigger2 );
			storeDefinition.callbacks.init();

			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( ctx2.isOpen ).toBe( true );
			expect( modal2.open ).toBe( true );

			// Close the second — body stays locked because the first is still open.
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( ctx2.isOpen ).toBe( false );
			expect( document.body.style.overflow ).toBe( 'hidden' );

			// Close the first — body unlocks.
			interactivityMock.__setContext( mockContext );
			interactivityMock.__setElement( mockElement );
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( document.body.style.overflow ).toBe( '' );

			document.body.removeChild( modal2 );
		} );

		it( 'restores the prior body overflow value on close', () => {
			document.body.style.overflow = 'scroll';

			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( document.body.style.overflow ).toBe( 'hidden' );

			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( document.body.style.overflow ).toBe( 'scroll' );

			document.body.style.overflow = '';
		} );
	} );

	describe( 'init callback', () => {
		it( 'returns a cleanup function when wired up', () => {
			const cleanup = storeDefinition.callbacks.init();
			expect( typeof cleanup ).toBe( 'function' );
		} );

		it( 'returns nothing when modalId is missing', () => {
			interactivityMock.__setContext( { modalId: '', isOpen: false } );
			expect( storeDefinition.callbacks.init() ).toBeUndefined();
		} );

		it( 'returns nothing when target element is not found', () => {
			interactivityMock.__setContext( {
				modalId: 'nonexistent',
				isOpen: false,
			} );
			expect( storeDefinition.callbacks.init() ).toBeUndefined();
		} );

		it( 'warns and returns nothing when target is not a <dialog>', () => {
			const div = document.createElement( 'div' );
			div.id = 'also-not-a-dialog';
			document.body.appendChild( div );
			interactivityMock.__setContext( {
				modalId: 'also-not-a-dialog',
				isOpen: false,
			} );
			const warnSpy = jest
				.spyOn( console, 'warn' )
				.mockImplementation( () => {} );

			const result = storeDefinition.callbacks.init();

			expect( result ).toBeUndefined();
			expect( warnSpy ).toHaveBeenCalledWith(
				expect.stringContaining( 'not a <dialog> element' )
			);

			warnSpy.mockRestore();
			document.body.removeChild( div );
		} );

		it( 'syncs context.isOpen when the dialog fires a native close event', () => {
			storeDefinition.callbacks.init();
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( mockContext.isOpen ).toBe( true );

			// Simulate ESC / form method="dialog" / programmatic close().
			modalElement.close();

			expect( mockContext.isOpen ).toBe( false );
			expect( document.body.style.overflow ).toBe( '' );
		} );

		it( 'closes the dialog when a .modal-close button is clicked', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.classList.add( 'modal-close' );
			modalElement.appendChild( closeBtn );

			storeDefinition.callbacks.init();
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( modalElement.open ).toBe( true );

			closeBtn.click();

			expect( modalElement.open ).toBe( false );
			expect( mockContext.isOpen ).toBe( false );

			modalElement.removeChild( closeBtn );
		} );

		it( 'closes the dialog when [data-modal-close] is clicked', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.setAttribute( 'data-modal-close', '' );
			modalElement.appendChild( closeBtn );

			storeDefinition.callbacks.init();
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );

			closeBtn.click();

			expect( modalElement.open ).toBe( false );

			modalElement.removeChild( closeBtn );
		} );

		it( 'closes on backdrop click (e.target === dialog)', () => {
			storeDefinition.callbacks.init();
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );
			expect( modalElement.open ).toBe( true );

			modalElement.dispatchEvent(
				new MouseEvent( 'click', { bubbles: true } )
			);

			expect( modalElement.open ).toBe( false );
		} );

		it( 'ignores clicks originating inside modal content', () => {
			const content = document.createElement( 'div' );
			modalElement.appendChild( content );

			storeDefinition.callbacks.init();
			storeDefinition.actions.toggle( { preventDefault: jest.fn() } );

			content.dispatchEvent(
				new MouseEvent( 'click', { bubbles: true } )
			);

			expect( modalElement.open ).toBe( true );

			modalElement.removeChild( content );
		} );

		it( 'removes all listeners on cleanup', () => {
			const closeBtn = document.createElement( 'button' );
			closeBtn.classList.add( 'modal-close' );
			modalElement.appendChild( closeBtn );
			const removeBtn = jest.spyOn( closeBtn, 'removeEventListener' );
			const removeModal = jest.spyOn(
				modalElement,
				'removeEventListener'
			);

			const cleanup = storeDefinition.callbacks.init();
			cleanup();

			expect( removeBtn ).toHaveBeenCalledWith(
				'click',
				expect.any( Function )
			);
			expect( removeModal ).toHaveBeenCalledWith(
				'click',
				expect.any( Function )
			);
			expect( removeModal ).toHaveBeenCalledWith(
				'close',
				expect.any( Function )
			);

			removeBtn.mockRestore();
			removeModal.mockRestore();
			modalElement.removeChild( closeBtn );
		} );
	} );

	describe( 'aria-labelledby inference', () => {
		it( 'wires aria-labelledby to the first heading with an id', () => {
			const heading = document.createElement( 'h2' );
			heading.id = 'demo-title';
			modalElement.appendChild( heading );

			storeDefinition.callbacks.init();

			expect( modalElement.getAttribute( 'aria-labelledby' ) ).toBe(
				'demo-title'
			);

			modalElement.removeChild( heading );
		} );

		it( 'generates a heading id when missing', () => {
			const heading = document.createElement( 'h2' );
			modalElement.appendChild( heading );

			storeDefinition.callbacks.init();

			expect( heading.id ).toBe( 'test-modal__heading' );
			expect( modalElement.getAttribute( 'aria-labelledby' ) ).toBe(
				'test-modal__heading'
			);

			modalElement.removeChild( heading );
		} );

		it( 'leaves aria-labelledby alone when the author set one', () => {
			modalElement.setAttribute( 'aria-labelledby', 'author-label' );

			storeDefinition.callbacks.init();

			expect( modalElement.getAttribute( 'aria-labelledby' ) ).toBe(
				'author-label'
			);
		} );
	} );
} );
