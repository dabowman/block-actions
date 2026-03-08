/**
 * @jest-environment jsdom
 */

import init from '../../src/actions/carousel';

describe('carousel action', () => {
    let element;
    let consoleSpy;

    function createCarouselDOM({ slideCount = 3, withButtons = true, withThumbnails = false, containerIsElement = false } = {}) {
        const el = document.createElement('div');
        el.setAttribute('data-action', 'carousel');

        const container = document.createElement('div');
        container.classList.add('carousel-container');

        const slider = document.createElement('div');
        slider.classList.add('carousel-slider');

        for (let i = 0; i < slideCount; i++) {
            const slide = document.createElement('div');
            slide.classList.add('carousel-slide');
            slide.textContent = `Slide ${i + 1}`;
            slider.appendChild(slide);
        }
        container.appendChild(slider);

        if (withButtons) {
            const prevBtn = document.createElement('button');
            prevBtn.classList.add('carousel-button-left');
            container.appendChild(prevBtn);

            const nextBtn = document.createElement('button');
            nextBtn.classList.add('carousel-button-right');
            container.appendChild(nextBtn);
        }

        if (withThumbnails) {
            const thumbContainer = document.createElement('div');
            thumbContainer.classList.add('carousel-thumbnails');
            for (let i = 0; i < slideCount; i++) {
                const thumb = document.createElement('div');
                thumb.classList.add('carousel-thumbnail');
                thumbContainer.appendChild(thumb);
            }
            container.appendChild(thumbContainer);
        }

        if (containerIsElement) {
            el.classList.add('carousel-container');
            // Copy children from container to el
            while (container.firstChild) {
                el.appendChild(container.firstChild);
            }
            return el;
        }

        el.appendChild(container);
        return el;
    }

    beforeEach(() => {
        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn(cb => {
            cb();
            return 1;
        });
        global.cancelAnimationFrame = jest.fn();

        // Mock IntersectionObserver
        global.IntersectionObserver = jest.fn(() => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn()
        }));

        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };
    });

    afterEach(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
        delete global.requestAnimationFrame;
        delete global.cancelAnimationFrame;
        delete global.IntersectionObserver;
    });

    test('initializes with valid carousel markup', () => {
        element = createCarouselDOM();
        init(element);

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
    });

    test('logs error when container is missing', () => {
        element = document.createElement('div');
        element.setAttribute('data-action', 'carousel');
        init(element);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Carousel container not found'),
            expect.anything()
        );
    });

    test('logs error when slider is missing', () => {
        element = document.createElement('div');
        const container = document.createElement('div');
        container.classList.add('carousel-container');
        element.appendChild(container);
        init(element);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Carousel slider not found'),
            expect.anything()
        );
    });

    test('logs error when no slides are found', () => {
        element = document.createElement('div');
        const container = document.createElement('div');
        container.classList.add('carousel-container');
        const slider = document.createElement('div');
        slider.classList.add('carousel-slider');
        container.appendChild(slider);
        element.appendChild(container);
        init(element);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('No carousel slides found'),
            expect.anything()
        );
    });

    test('next button advances to next slide', () => {
        element = createCarouselDOM();
        init(element);

        const nextBtn = element.querySelector('.carousel-button-right');
        nextBtn.click();

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[1].classList.contains('active')).toBe(true);
        expect(slides[0].classList.contains('active')).toBe(false);
    });

    test('prev button goes to previous slide (wraps around)', () => {
        element = createCarouselDOM();
        init(element);

        const prevBtn = element.querySelector('.carousel-button-left');
        prevBtn.click();

        // Should wrap to last slide
        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[2].classList.contains('active')).toBe(true);
    });

    test('carousel wraps from last to first slide', () => {
        element = createCarouselDOM();
        init(element);

        const nextBtn = element.querySelector('.carousel-button-right');
        nextBtn.click(); // slide 1
        nextBtn.click(); // slide 2
        nextBtn.click(); // should wrap to slide 0

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
    });

    test('thumbnail click navigates to specific slide', () => {
        element = createCarouselDOM({ withThumbnails: true });
        init(element);

        const thumbnails = element.querySelectorAll('.carousel-thumbnail');
        thumbnails[2].click();

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[2].classList.contains('active')).toBe(true);
        expect(thumbnails[2].classList.contains('active')).toBe(true);
    });

    test('sets accessibility attributes', () => {
        element = createCarouselDOM({ withButtons: true, withThumbnails: true });
        init(element);

        const container = element.querySelector('.carousel-container');
        expect(container.getAttribute('role')).toBe('region');
        expect(container.getAttribute('aria-label')).toBe('Image carousel');
        expect(container.getAttribute('tabindex')).toBe('0');

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].getAttribute('role')).toBe('tabpanel');
        expect(slides[0].getAttribute('aria-roledescription')).toBe('slide');

        const prevBtn = element.querySelector('.carousel-button-left');
        expect(prevBtn.getAttribute('role')).toBe('button');
        expect(prevBtn.getAttribute('aria-label')).toBe('Previous slide');

        const nextBtn = element.querySelector('.carousel-button-right');
        expect(nextBtn.getAttribute('role')).toBe('button');
        expect(nextBtn.getAttribute('aria-label')).toBe('Next slide');

        const thumbnails = element.querySelectorAll('.carousel-thumbnail');
        expect(thumbnails[0].getAttribute('role')).toBe('tab');
    });

    test('keyboard ArrowRight advances slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[1].classList.contains('active')).toBe(true);
    });

    test('keyboard ArrowLeft goes to previous slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[2].classList.contains('active')).toBe(true);
    });

    test('keyboard ArrowDown advances slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[1].classList.contains('active')).toBe(true);
    });

    test('keyboard ArrowUp goes to previous slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[2].classList.contains('active')).toBe(true);
    });

    test('keyboard Home goes to first slide', () => {
        element = createCarouselDOM();
        init(element);

        // First go to slide 2
        const nextBtn = element.querySelector('.carousel-button-right');
        nextBtn.click();
        nextBtn.click();

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
    });

    test('keyboard End goes to last slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[2].classList.contains('active')).toBe(true);
    });

    test('Home/End with thumbnails clicks them', () => {
        element = createCarouselDOM({ withThumbnails: true });
        init(element);

        const thumbnails = element.querySelectorAll('.carousel-thumbnail');
        const clickSpyLast = jest.spyOn(thumbnails[2], 'click');
        const clickSpyFirst = jest.spyOn(thumbnails[0], 'click');

        const container = element.querySelector('.carousel-container');
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
        expect(clickSpyLast).toHaveBeenCalled();

        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
        expect(clickSpyFirst).toHaveBeenCalled();
    });

    test('touch swipe right goes to previous slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');

        container.dispatchEvent(new TouchEvent('touchstart', {
            changedTouches: [{ screenX: 100 }]
        }));
        container.dispatchEvent(new TouchEvent('touchend', {
            changedTouches: [{ screenX: 200 }]
        }));

        // Swipe right = go to previous (wraps to last)
        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[2].classList.contains('active')).toBe(true);
    });

    test('touch swipe left goes to next slide', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');

        container.dispatchEvent(new TouchEvent('touchstart', {
            changedTouches: [{ screenX: 200 }]
        }));
        container.dispatchEvent(new TouchEvent('touchend', {
            changedTouches: [{ screenX: 100 }]
        }));

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[1].classList.contains('active')).toBe(true);
    });

    test('small touch movements do not trigger navigation', () => {
        element = createCarouselDOM();
        init(element);

        const container = element.querySelector('.carousel-container');

        container.dispatchEvent(new TouchEvent('touchstart', {
            changedTouches: [{ screenX: 100 }]
        }));
        container.dispatchEvent(new TouchEvent('touchend', {
            changedTouches: [{ screenX: 120 }]
        }));

        // Movement under threshold - should stay on first slide
        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
    });

    test('works when container is the element itself', () => {
        element = createCarouselDOM({ containerIsElement: true });
        init(element);

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
    });

    test('button keyboard Enter triggers click', () => {
        element = createCarouselDOM();
        init(element);

        const nextBtn = element.querySelector('.carousel-button-right');
        const clickSpy = jest.spyOn(nextBtn, 'click');
        nextBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(clickSpy).toHaveBeenCalled();
    });

    test('button keyboard Space triggers click', () => {
        element = createCarouselDOM();
        init(element);

        const prevBtn = element.querySelector('.carousel-button-left');
        const clickSpy = jest.spyOn(prevBtn, 'click');
        prevBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        expect(clickSpy).toHaveBeenCalled();
    });

    test('thumbnail keyboard Enter triggers click', () => {
        element = createCarouselDOM({ withThumbnails: true });
        init(element);

        const thumb = element.querySelectorAll('.carousel-thumbnail')[1];
        const clickSpy = jest.spyOn(thumb, 'click');
        thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(clickSpy).toHaveBeenCalled();
    });

    test('slides get aria-hidden attributes', () => {
        element = createCarouselDOM();
        init(element);

        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[0].getAttribute('aria-hidden')).toBe('false');
        expect(slides[1].getAttribute('aria-hidden')).toBe('true');
        expect(slides[2].getAttribute('aria-hidden')).toBe('true');
    });

    test('slider transform is set on navigation', () => {
        element = createCarouselDOM();
        init(element);

        const slider = element.querySelector('.carousel-slider');
        expect(slider.style.transform).toBe('translateX(0cqw)');

        const nextBtn = element.querySelector('.carousel-button-right');
        nextBtn.click();
        expect(slider.style.transform).toBe('translateX(-100cqw)');
    });

    test('sets up lazy loading for images with data-src', () => {
        element = createCarouselDOM();
        const slide = element.querySelector('.carousel-slide');
        const img = document.createElement('img');
        img.setAttribute('data-src', 'image.jpg');
        slide.appendChild(img);

        init(element);

        expect(global.IntersectionObserver).toHaveBeenCalled();
    });

    test('initializes on DOMContentLoaded if document is loading', () => {
        // Simulate loading state
        Object.defineProperty(document, 'readyState', {
            value: 'loading',
            writable: true,
            configurable: true
        });

        const addEventSpy = jest.spyOn(document, 'addEventListener');

        element = createCarouselDOM();
        init(element);

        expect(addEventSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));

        // Restore
        Object.defineProperty(document, 'readyState', {
            value: 'complete',
            writable: true,
            configurable: true
        });
        addEventSpy.mockRestore();
    });

    test('carousel without buttons uses controller methods for keyboard nav', () => {
        element = createCarouselDOM({ withButtons: false });
        init(element);

        const container = element.querySelector('.carousel-container');

        // ArrowRight without buttons should still advance
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        const slides = element.querySelectorAll('.carousel-slide');
        expect(slides[1].classList.contains('active')).toBe(true);

        // ArrowLeft
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        expect(slides[0].classList.contains('active')).toBe(true);
    });
});
