/**
 * Toggle Visibility Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;

beforeAll( () => {
	interactivityMock.store.mockImplementation( ( ns, def ) => def );
	require( '../../src/stores/toggle-visibility/view' );
	storeDefinition =
		interactivityMock.store.mock.calls[
			interactivityMock.store.mock.calls.length - 1
		][ 1 ];
} );

describe( 'Toggle Visibility Store', () => {
	let mockElement;
	let mockContext;
	let targetElement;

	beforeEach( () => {
		mockElement = document.createElement( 'div' );
		const link = document.createElement( 'a' );
		link.textContent = 'Hide';
		mockElement.appendChild( link );

		targetElement = document.createElement( 'div' );
		targetElement.id = 'test-target';
		document.body.appendChild( targetElement );

		mockContext = {
			targetId: 'test-target',
			isVisible: true,
			showLabel: 'Show',
			hideLabel: 'Hide',
		};
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );
	} );

	afterEach( () => {
		document.body.removeChild( targetElement );
	} );

	it( 'should register with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/toggle-visibility',
			expect.any( Object )
		);
	} );

	it( 'should detect initial visibility on init', () => {
		storeDefinition.callbacks.init();
		expect( mockContext.isVisible ).toBe( true );
	} );

	it( 'should detect hidden state on init', () => {
		targetElement.classList.add( 'is-hidden' );
		storeDefinition.callbacks.init();
		expect( mockContext.isVisible ).toBe( false );
	} );

	it( 'should hide target on toggle when visible', () => {
		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( event );

		expect( mockContext.isVisible ).toBe( false );
		expect( targetElement.classList.contains( 'is-hidden' ) ).toBe( true );
	} );

	it( 'should show target on toggle when hidden', () => {
		mockContext.isVisible = false;
		targetElement.classList.add( 'is-hidden' );

		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( event );

		expect( mockContext.isVisible ).toBe( true );
		expect( targetElement.classList.contains( 'is-hidden' ) ).toBe( false );
	} );

	it( 'should update button text', () => {
		const link = mockElement.querySelector( 'a' );
		const event = { preventDefault: jest.fn() };

		storeDefinition.actions.toggle( event );
		expect( link.textContent ).toBe( 'Show' );

		storeDefinition.actions.toggle( event );
		expect( link.textContent ).toBe( 'Hide' );
	} );

	it( 'should use context labels for button text', () => {
		mockContext.showLabel = 'Reveal';
		mockContext.hideLabel = 'Conceal';
		const link = mockElement.querySelector( 'a' );
		const event = { preventDefault: jest.fn() };

		storeDefinition.actions.toggle( event );
		expect( link.textContent ).toBe( 'Reveal' );

		storeDefinition.actions.toggle( event );
		expect( link.textContent ).toBe( 'Conceal' );
	} );

	it( 'should return a cleanup function from init', () => {
		const cleanup = storeDefinition.callbacks.init();
		expect( typeof cleanup ).toBe( 'function' );
	} );
} );
