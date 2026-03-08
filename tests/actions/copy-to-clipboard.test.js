/**
 * @jest-environment jsdom
 */

import { BaseAction } from '../../src/actions/base-action';

describe('copy-to-clipboard action', () => {
    let element;
    let link;
    let consoleSpy;

    beforeEach(() => {
        jest.resetModules();

        element = document.createElement('div');
        link = document.createElement('a');
        link.textContent = 'Copy';
        element.appendChild(link);
        element.setAttribute('data-action', 'copy-to-clipboard');
        element.setAttribute('data-copy-text', 'Hello World');

        // Setup global BlockActions API
        window.BlockActions = {
            BaseAction: BaseAction,
            registerAction: jest.fn()
        };

        // Mock clipboard API
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn(() => Promise.resolve())
            }
        });

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
        delete window.BlockActions;
    });

    function loadAction() {
        require('../../src/actions/copy-to-clipboard');
    }

    test('registers with BlockActions', () => {
        loadAction();
        expect(window.BlockActions.registerAction).toHaveBeenCalledWith(
            'copy-to-clipboard',
            'Copy to Clipboard',
            expect.any(Function)
        );
    });

    test('init sets up click listener', () => {
        loadAction();
        const initFn = window.BlockActions.registerAction.mock.calls[0][2];
        const spy = jest.spyOn(link, 'addEventListener');
        initFn(element);
        expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('logs error when data-copy-text is missing', () => {
        element.removeAttribute('data-copy-text');
        loadAction();
        const initFn = window.BlockActions.registerAction.mock.calls[0][2];
        initFn(element);
        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('No data-copy-text'),
            expect.anything()
        );
    });

    test('click copies text to clipboard', async () => {
        loadAction();
        const initFn = window.BlockActions.registerAction.mock.calls[0][2];
        initFn(element);

        link.click();
        // Allow async to resolve
        await Promise.resolve();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello World');
    });

    test('click shows success feedback', async () => {
        loadAction();
        const initFn = window.BlockActions.registerAction.mock.calls[0][2];
        initFn(element);

        link.click();
        await Promise.resolve();
        await Promise.resolve();

        expect(link.textContent).toContain('Copied');
    });

    test('resets text after 2 seconds on success', async () => {
        loadAction();
        const initFn = window.BlockActions.registerAction.mock.calls[0][2];
        initFn(element);

        link.click();
        await Promise.resolve();
        await Promise.resolve();

        jest.advanceTimersByTime(2000);
        expect(link.textContent).toBe('Copy');
    });

    test('shows error feedback on clipboard failure', async () => {
        navigator.clipboard.writeText = jest.fn(() => Promise.reject(new Error('Denied')));

        loadAction();
        const initFn = window.BlockActions.registerAction.mock.calls[0][2];
        initFn(element);

        link.click();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(link.textContent).toBe('Copy failed');
    });
});
