/**
 * @jest-environment jsdom
 */

import { BaseAction } from '../../src/actions/base-action';

describe('smooth-scroll action', () => {
    let element;
    let link;
    let target;
    let consoleSpy;

    beforeEach(() => {
        jest.resetModules();

        element = document.createElement('div');
        link = document.createElement('a');
        link.textContent = 'Scroll Down';
        element.appendChild(link);
        element.setAttribute('data-action', 'smooth-scroll');
        element.setAttribute('data-target', 'target-section');

        target = document.createElement('div');
        target.id = 'target-section';
        document.body.appendChild(target);

        // Mock getBoundingClientRect
        target.getBoundingClientRect = jest.fn(() => ({
            top: 500, bottom: 600, left: 0, right: 100, width: 100, height: 100
        }));

        window.scrollTo = jest.fn();
        Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });

        window.BlockActions = {
            BaseAction: BaseAction,
            registerAction: jest.fn()
        };

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
        document.body.innerHTML = '';
        delete window.BlockActions;
    });

    function loadAction() {
        require('../../src/actions/smooth-scroll');
        return window.BlockActions.registerAction.mock.calls[0][2];
    }

    test('registers with BlockActions', () => {
        require('../../src/actions/smooth-scroll');
        expect(window.BlockActions.registerAction).toHaveBeenCalledWith(
            'smooth-scroll',
            'Smooth Scroll',
            expect.any(Function)
        );
    });

    test('click scrolls to target element', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 500,
            behavior: 'smooth'
        });
    });

    test('respects data-offset attribute', () => {
        element.setAttribute('data-offset', '100');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 400,
            behavior: 'smooth'
        });
    });

    test('shows Scrolling... text during scroll', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(link.textContent).toBe('Scrolling...');
    });

    test('resets text after 1 second', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        jest.advanceTimersByTime(1000);
        expect(link.textContent).toBe('Scroll Down');
    });

    test('logs error when data-target is missing', () => {
        element.removeAttribute('data-target');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('No data-target'),
            expect.anything()
        );
    });

    test('shows error text when target missing', () => {
        element.removeAttribute('data-target');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(link.textContent).toBe('Error: No target');
    });

    test('logs error when target element not found', () => {
        element.setAttribute('data-target', 'nonexistent');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('not found'),
            expect.anything()
        );
    });

    test('shows error text when target not found', () => {
        element.setAttribute('data-target', 'nonexistent');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(link.textContent).toBe('Error: Target not found');
    });

    test('error text resets after 2 seconds', () => {
        element.removeAttribute('data-target');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(link.textContent).toBe('Error: No target');
        jest.advanceTimersByTime(2000);
        expect(link.textContent).toBe('Scroll Down');
    });
});
