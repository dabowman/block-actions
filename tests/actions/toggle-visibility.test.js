/**
 * @jest-environment jsdom
 */

import { BaseAction } from '../../src/actions/base-action';

describe('toggle-visibility action', () => {
    let element;
    let link;
    let target;
    let consoleSpy;

    beforeEach(() => {
        jest.resetModules();

        element = document.createElement('div');
        link = document.createElement('a');
        link.textContent = 'Toggle';
        element.appendChild(link);
        element.setAttribute('data-action', 'toggle-visibility');
        element.setAttribute('data-target', 'target-el');

        target = document.createElement('div');
        target.id = 'target-el';
        target.textContent = 'Visible Content';
        document.body.appendChild(target);

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
        require('../../src/actions/toggle-visibility');
        return window.BlockActions.registerAction.mock.calls[0][2];
    }

    test('registers with BlockActions', () => {
        require('../../src/actions/toggle-visibility');
        expect(window.BlockActions.registerAction).toHaveBeenCalledWith(
            'toggle-visibility',
            'Toggle Visibility',
            expect.any(Function)
        );
    });

    test('click hides visible target', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(target.style.display).toBe('none');
        expect(link.textContent).toBe('Show');
    });

    test('second click shows hidden target', () => {
        const initFn = loadAction();
        initFn(element);

        link.click(); // hide
        expect(target.style.display).toBe('none');

        link.click(); // show
        expect(target.style.display).toBe('');
        expect(link.textContent).toBe('Hide');
    });

    test('logs error when data-target is missing', () => {
        element.removeAttribute('data-target');
        const initFn = loadAction();
        initFn(element);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('No data-target'),
            expect.anything()
        );
    });

    test('logs error when target element not found', () => {
        element.setAttribute('data-target', 'nonexistent');
        const initFn = loadAction();
        initFn(element);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('not found'),
            expect.anything()
        );
    });

    test('handles initially hidden target', () => {
        target.style.display = 'none';
        const initFn = loadAction();
        initFn(element);

        // First click shows it
        link.click();
        expect(target.style.display).toBe('');
        expect(link.textContent).toBe('Hide');
    });

    test('click prevents default', () => {
        const initFn = loadAction();
        initFn(element);

        const event = new Event('click', { cancelable: true });
        const spy = jest.spyOn(event, 'preventDefault');
        link.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
    });
});
