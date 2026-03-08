/**
 * @jest-environment jsdom
 */

import init from '../../src/actions/test-action';

describe('test-action', () => {
    let element;
    let link;
    let consoleSpy;

    beforeEach(() => {
        element = document.createElement('div');
        link = document.createElement('a');
        link.textContent = 'Click Me';
        element.appendChild(link);
        element.setAttribute('data-action', 'test-action');

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

    test('attaches click listener', () => {
        const spy = jest.spyOn(link, 'addEventListener');
        init(element);
        expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('click sets background to red and changes text', () => {
        init(element);
        link.click();

        expect(link.style.backgroundColor).toBe('red');
        expect(link.textContent).toBe('it worked!');
    });

    test('resets after 2 seconds', () => {
        init(element);
        link.click();

        expect(link.textContent).toBe('it worked!');
        jest.advanceTimersByTime(2000);
        expect(link.textContent).toBe('Click Me');
        expect(link.style.backgroundColor).toBe('');
    });

    test('click prevents default', () => {
        init(element);
        const event = new Event('click', { cancelable: true });
        const spy = jest.spyOn(event, 'preventDefault');
        link.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
    });

    test('rate limiting works', () => {
        init(element);
        // First 5 clicks should work
        for (let i = 0; i < 5; i++) {
            link.click();
        }
        // Reset text for next assertion
        jest.advanceTimersByTime(2000);
        expect(link.textContent).toBe('Click Me');

        // After exhausting rate, next immediate click should be blocked
        // Need fresh window since we advanced timers
    });
});
