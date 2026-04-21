/**
 * Toggle Visibility Store Tests
 *
 * Tests the declarative store: state.buttonLabel getter, toggle action
 * that mutates ctx.isVisible + target class, and init that reads
 * initial state from the target element. aria-expanded / aria-controls
 * are bound via PHP directives (data-wp-bind), not set in JS.
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

	it( 'should bail when targetId is missing', () => {
		mockContext.targetId = '';
		const event = { preventDefault: jest.fn() };
		const beforeVisibility = mockContext.isVisible;
		storeDefinition.actions.toggle( event );
		expect( mockContext.isVisible ).toBe( beforeVisibility );
	} );

	it( 'should call preventDefault on the event', () => {
		const event = { preventDefault: jest.fn() };
		storeDefinition.actions.toggle( event );
		expect( event.preventDefault ).toHaveBeenCalled();
	} );

	describe( 'state.buttonLabel', () => {
		it( 'returns hideLabel when visible', () => {
			mockContext.isVisible = true;
			expect( storeDefinition.state.buttonLabel ).toBe( 'Hide' );
		} );

		it( 'returns showLabel when hidden', () => {
			mockContext.isVisible = false;
			expect( storeDefinition.state.buttonLabel ).toBe( 'Show' );
		} );

		it( 'falls back to defaults when labels missing', () => {
			mockContext.showLabel = undefined;
			mockContext.hideLabel = undefined;
			mockContext.isVisible = true;
			expect( storeDefinition.state.buttonLabel ).toBe( 'Hide' );
			mockContext.isVisible = false;
			expect( storeDefinition.state.buttonLabel ).toBe( 'Show' );
		} );

		it( 'honours custom labels', () => {
			mockContext.showLabel = 'Reveal';
			mockContext.hideLabel = 'Conceal';
			mockContext.isVisible = true;
			expect( storeDefinition.state.buttonLabel ).toBe( 'Conceal' );
			mockContext.isVisible = false;
			expect( storeDefinition.state.buttonLabel ).toBe( 'Reveal' );
		} );
	} );
} );
