/**
 * @jest-environment jsdom
 */

import init from '../../src/actions/scroll-to-top';

describe('scroll-to-top action', () => {
    let element;
    let link;
    let consoleSpy;

    beforeEach(() => {
        element = document.createElement('div');
        link = document.createElement('a');
        link.textContent = 'Back to Top';
        element.appendChild(link);
        element.setAttribute('data-action', 'scroll-to-top');

        window.scrollTo = jest.fn();

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
    });

    test('attaches click listener to target', () => {
        const spy = jest.spyOn(link, 'addEventListener');
        init(element);
        expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('click scrolls to top smoothly', () => {
        init(element);
        link.click();

        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 0,
            behavior: 'smooth'
        });
    });

    test('click updates text to Scrolling...', () => {
        init(element);
        link.click();
        expect(link.textContent).toBe('Scrolling...');
    });

    test('text resets after 500ms', () => {
        init(element);
        link.click();

        expect(link.textContent).toBe('Scrolling...');
        jest.advanceTimersByTime(500);
        expect(link.textContent).toBe('Back to Top');
    });

    test('click prevents default', () => {
        init(element);
        const event = new Event('click', { cancelable: true });
        const spy = jest.spyOn(event, 'preventDefault');
        link.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
    });

    test('rate limiting prevents excessive calls', () => {
        init(element);

        // 5 calls should succeed
        for (let i = 0; i < 5; i++) {
            link.click();
        }
        expect(window.scrollTo).toHaveBeenCalledTimes(5);

        // 6th should be rate limited
        link.click();
        expect(window.scrollTo).toHaveBeenCalledTimes(5);
    });
});
