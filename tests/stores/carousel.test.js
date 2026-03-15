/**
 * Carousel Store Tests
 */

const interactivityMock = require( '@wordpress/interactivity' );

let storeDefinition;
let origRAF;
let origCAF;

beforeAll( () => {
	// Mock requestAnimationFrame before loading the module.
	origRAF = window.requestAnimationFrame;
	origCAF = window.cancelAnimationFrame;
	window.requestAnimationFrame = jest.fn( ( cb ) => {
		cb();
		return 1;
	} );
	window.cancelAnimationFrame = jest.fn();

	// Mock IntersectionObserver.
	global.IntersectionObserver = jest.fn( () => ( {
		observe: jest.fn(),
		unobserve: jest.fn(),
		disconnect: jest.fn(),
	} ) );

	// The carousel store calls store() twice: once with a definition, once
	// with just a namespace (for self-reference). Handle both cases.
	interactivityMock.store.mockImplementation( ( ns, def ) => {
		if ( def ) {
			return def;
		}
		// When called with just namespace (for self-reference), return stub.
		return { actions: {} };
	} );

	require( '../../src/stores/carousel/view' );

	// Get the call that has a definition object.
	const storeCall = interactivityMock.store.mock.calls.find(
		( call ) => call[ 1 ] !== undefined
	);
	storeDefinition = storeCall[ 1 ];
} );

afterAll( () => {
	window.requestAnimationFrame = origRAF;
	window.cancelAnimationFrame = origCAF;
} );

describe( 'Carousel Store', () => {
	let mockElement;
	let mockContext;

	function createCarouselDOM() {
		const el = document.createElement( 'div' );
		el.setAttribute( 'data-wp-interactive', 'block-actions/carousel' );

		const container = document.createElement( 'div' );
		container.classList.add( 'carousel-container' );

		const slider = document.createElement( 'div' );
		slider.classList.add( 'carousel-slider' );

		for ( let i = 0; i < 3; i++ ) {
			const slide = document.createElement( 'div' );
			slide.classList.add( 'carousel-slide' );
			slider.appendChild( slide );
		}
		container.appendChild( slider );

		const prevBtn = document.createElement( 'button' );
		prevBtn.classList.add( 'carousel-button-left' );
		container.appendChild( prevBtn );

		const nextBtn = document.createElement( 'button' );
		nextBtn.classList.add( 'carousel-button-right' );
		container.appendChild( nextBtn );

		el.appendChild( container );
		return el;
	}

	beforeEach( () => {
		jest.useFakeTimers();

		mockElement = createCarouselDOM();
		mockContext = {
			currentIndex: 0,
			isAnimating: false,
			totalSlides: 0,
			wrapAround: true,
		};
		interactivityMock.__setContext( mockContext );
		interactivityMock.__setElement( mockElement );

		// Re-mock RAF after useFakeTimers overrides it.
		window.requestAnimationFrame = jest.fn( ( cb ) => {
			cb();
			return 1;
		} );
		window.cancelAnimationFrame = jest.fn();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'should register with correct namespace', () => {
		expect( interactivityMock.store ).toHaveBeenCalledWith(
			'block-actions/carousel',
			expect.any( Object )
		);
	} );

	describe( 'init callback', () => {
		it( 'should count slides', () => {
			storeDefinition.callbacks.init();
			expect( mockContext.totalSlides ).toBe( 3 );
		} );

		it( 'should set accessibility attributes on container', () => {
			storeDefinition.callbacks.init();
			const container = mockElement.querySelector(
				'.carousel-container'
			);
			expect( container.getAttribute( 'role' ) ).toBe( 'region' );
			expect( container.getAttribute( 'aria-label' ) ).toBe(
				'Image carousel'
			);
			expect( container.getAttribute( 'tabindex' ) ).toBe( '0' );
		} );

		it( 'should set accessibility attributes on slides', () => {
			storeDefinition.callbacks.init();
			const slides = mockElement.querySelectorAll( '.carousel-slide' );
			slides.forEach( ( slide, i ) => {
				expect( slide.getAttribute( 'role' ) ).toBe( 'tabpanel' );
				expect( slide.getAttribute( 'aria-label' ) ).toBe(
					`Slide ${ i + 1 } of 3`
				);
			} );
		} );

		it( 'should return a cleanup function', () => {
			const cleanup = storeDefinition.callbacks.init();
			expect( typeof cleanup ).toBe( 'function' );
		} );

		it( 'should remove touch listeners on cleanup', () => {
			const container = mockElement.querySelector(
				'.carousel-container'
			);
			const removeSpy = jest.spyOn( container, 'removeEventListener' );

			const cleanup = storeDefinition.callbacks.init();
			cleanup();

			expect( removeSpy ).toHaveBeenCalledWith(
				'touchstart',
				expect.any( Function )
			);
			expect( removeSpy ).toHaveBeenCalledWith(
				'touchend',
				expect.any( Function )
			);
			removeSpy.mockRestore();
		} );

		it( 'should set accessibility attributes on buttons', () => {
			storeDefinition.callbacks.init();
			const prev = mockElement.querySelector( '.carousel-button-left' );
			const next = mockElement.querySelector( '.carousel-button-right' );
			expect( prev.getAttribute( 'aria-label' ) ).toBe(
				'Previous slide'
			);
			expect( next.getAttribute( 'aria-label' ) ).toBe( 'Next slide' );
		} );
	} );

	describe( 'navigation actions', () => {
		beforeEach( () => {
			mockContext.totalSlides = 3;
		} );

		it( 'should go to next slide', () => {
			storeDefinition.actions.nextSlide();
			expect( mockContext.currentIndex ).toBe( 1 );
		} );

		it( 'should wrap around on next', () => {
			mockContext.currentIndex = 2;
			storeDefinition.actions.nextSlide();
			expect( mockContext.currentIndex ).toBe( 0 );
		} );

		it( 'should go to previous slide', () => {
			mockContext.currentIndex = 1;
			storeDefinition.actions.prevSlide();
			expect( mockContext.currentIndex ).toBe( 0 );
		} );

		it( 'should wrap around on prev', () => {
			mockContext.currentIndex = 0;
			storeDefinition.actions.prevSlide();
			expect( mockContext.currentIndex ).toBe( 2 );
		} );

		it( 'should not navigate when animating', () => {
			mockContext.isAnimating = true;
			mockContext.currentIndex = 0;
			storeDefinition.actions.nextSlide();
			expect( mockContext.currentIndex ).toBe( 0 );
		} );

		it( 'should clamp at max when wrapAround is false', () => {
			mockContext.wrapAround = false;
			mockContext.currentIndex = 2;
			storeDefinition.actions.nextSlide();
			expect( mockContext.currentIndex ).toBe( 2 );
		} );

		it( 'should clamp at 0 when wrapAround is false', () => {
			mockContext.wrapAround = false;
			mockContext.currentIndex = 0;
			storeDefinition.actions.prevSlide();
			expect( mockContext.currentIndex ).toBe( 0 );
		} );
	} );

	describe( 'keyboard navigation', () => {
		beforeEach( () => {
			mockContext.totalSlides = 3;
		} );

		it( 'should go to first on Home', () => {
			mockContext.currentIndex = 2;
			const event = { key: 'Home', preventDefault: jest.fn() };
			storeDefinition.actions.handleKeydown( event );
			expect( mockContext.currentIndex ).toBe( 0 );
		} );

		it( 'should go to last on End', () => {
			const event = { key: 'End', preventDefault: jest.fn() };
			storeDefinition.actions.handleKeydown( event );
			expect( mockContext.currentIndex ).toBe( 2 );
		} );
	} );

	describe( 'derived state', () => {
		it( 'should compute slider transform', () => {
			mockContext.currentIndex = 2;
			const transform = storeDefinition.state.sliderTransform;
			expect( transform ).toBe( 'translateX(-200cqw)' );
		} );

		it( 'should compute isPrevDisabled', () => {
			mockContext.wrapAround = false;
			mockContext.currentIndex = 0;
			expect( storeDefinition.state.isPrevDisabled ).toBe( true );

			mockContext.currentIndex = 1;
			expect( storeDefinition.state.isPrevDisabled ).toBe( false );
		} );

		it( 'should compute isNextDisabled', () => {
			mockContext.wrapAround = false;
			mockContext.totalSlides = 3;
			mockContext.currentIndex = 2;
			expect( storeDefinition.state.isNextDisabled ).toBe( true );

			mockContext.currentIndex = 1;
			expect( storeDefinition.state.isNextDisabled ).toBe( false );
		} );
	} );
} );
