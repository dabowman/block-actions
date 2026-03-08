/**
 * @jest-environment jsdom
 */

import init from '../../src/actions/example-rate-limited';

describe('example-rate-limited action', () => {
    let element;
    let consoleSpy;

    beforeEach(() => {
        element = document.createElement('div');
        const link = document.createElement('a');
        link.textContent = 'Toggle';
        element.appendChild(link);
        element.setAttribute('data-action', 'example-rate-limited');

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
        const spy = jest.spyOn(element, 'addEventListener');
        init(element);
        expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('click toggles is-active class on', () => {
        init(element);
        element.click();
        expect(element.classList.contains('is-active')).toBe(true);
    });

    test('click toggles text to Active State', () => {
        init(element);
        const link = element.querySelector('a');
        element.click();
        expect(link.textContent).toBe('Active State');
    });

    test('second click toggles back to original', () => {
        init(element);
        const link = element.querySelector('a');

        element.click();
        expect(element.classList.contains('is-active')).toBe(true);
        expect(link.textContent).toBe('Active State');

        element.click();
        expect(element.classList.contains('is-active')).toBe(false);
        expect(link.textContent).toBe('Toggle');
    });

    test('click prevents default', () => {
        init(element);
        const event = new Event('click', { cancelable: true });
        const spy = jest.spyOn(event, 'preventDefault');
        element.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
    });

    test('rate limiting prevents excessive toggles', () => {
        init(element);

        for (let i = 0; i < 5; i++) {
            element.click();
        }

        // 6th click should be rate limited
        const classStateBefore = element.classList.contains('is-active');
        element.click();
        expect(element.classList.contains('is-active')).toBe(classStateBefore);
    });
});
