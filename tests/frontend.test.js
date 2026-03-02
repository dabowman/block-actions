/**
 * @jest-environment jsdom
 */

// Mock the actions registry module (uses webpack require.context)
jest.mock('../src/actions', () => [
    { id: 'test-builtin', label: 'Test Builtin', init: jest.fn() }
]);

// Mock BaseAction
jest.mock('../src/actions/base-action', () => ({
    BaseAction: class MockBaseAction {
        constructor(el) { this.element = el; }
    }
}));

describe('frontend', () => {
    let consoleSpy;

    beforeEach(() => {
        // Reset modules so each test gets a fresh registry
        jest.resetModules();

        // Clean DOM
        document.body.innerHTML = '';
        delete window.BlockActions;

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

    function loadModule() {
        // Re-mock after resetModules
        jest.mock('../src/actions', () => [
            { id: 'test-builtin', label: 'Test Builtin', init: jest.fn() }
        ]);
        jest.mock('../src/actions/base-action', () => ({
            BaseAction: class MockBaseAction {
                constructor(el) { this.element = el; }
            }
        }));
        return require('../src/frontend');
    }

    test('exposes global BlockActions API', () => {
        loadModule();
        expect(window.BlockActions).toBeDefined();
        expect(window.BlockActions.registerAction).toBeInstanceOf(Function);
        expect(window.BlockActions.getRegisteredActions).toBeInstanceOf(Function);
        expect(window.BlockActions.BaseAction).toBeDefined();
    });

    test('registerAction succeeds with valid params', () => {
        loadModule();
        const result = window.BlockActions.registerAction('my-action', 'My Action', () => {});
        expect(result).toBe(true);
    });

    test('registerAction returns false for empty id', () => {
        loadModule();
        const result = window.BlockActions.registerAction('', 'Label', () => {});
        expect(result).toBe(false);
    });

    test('registerAction returns false for non-string id', () => {
        loadModule();
        const result = window.BlockActions.registerAction(123, 'Label', () => {});
        expect(result).toBe(false);
    });

    test('registerAction returns false for empty label', () => {
        loadModule();
        const result = window.BlockActions.registerAction('id', '', () => {});
        expect(result).toBe(false);
    });

    test('registerAction returns false for non-string label', () => {
        loadModule();
        const result = window.BlockActions.registerAction('id', null, () => {});
        expect(result).toBe(false);
    });

    test('registerAction returns false for non-function init', () => {
        loadModule();
        const result = window.BlockActions.registerAction('id', 'Label', 'not-a-function');
        expect(result).toBe(false);
    });

    test('registerAction returns false for duplicate id', () => {
        loadModule();
        window.BlockActions.registerAction('dup', 'Dup', () => {});
        const result = window.BlockActions.registerAction('dup', 'Dup 2', () => {});
        expect(result).toBe(false);
    });

    test('registerAction returns false when builtin id is reused', () => {
        loadModule();
        const result = window.BlockActions.registerAction('test-builtin', 'Override', () => {});
        expect(result).toBe(false);
    });

    test('getRegisteredActions returns built-in actions', () => {
        loadModule();
        const actions = window.BlockActions.getRegisteredActions();
        expect(actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'test-builtin', label: 'Test Builtin' })
            ])
        );
    });

    test('getRegisteredActions includes theme actions after registration', () => {
        loadModule();
        window.BlockActions.registerAction('theme-one', 'Theme One', () => {});
        const actions = window.BlockActions.getRegisteredActions();
        expect(actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'theme-one', label: 'Theme One' })
            ])
        );
    });

    test('DOMContentLoaded triggers initActions and calls init for known actions', () => {
        // Variables referenced in jest.mock factory must be prefixed with 'mock'
        const mockInitFn = jest.fn();
        jest.mock('../src/actions', () => [
            { id: 'scroll-action', label: 'Scroll', init: mockInitFn }
        ]);
        jest.mock('../src/actions/base-action', () => ({
            BaseAction: class { constructor(el) { this.element = el; } }
        }));

        const el = document.createElement('div');
        el.setAttribute('data-action', 'scroll-action');
        document.body.appendChild(el);

        require('../src/frontend');

        // Trigger DOMContentLoaded
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        expect(mockInitFn).toHaveBeenCalledWith(el);
    });

    test('initActions skips elements with unknown action ids', () => {
        loadModule();

        const el = document.createElement('div');
        el.setAttribute('data-action', 'nonexistent');
        document.body.appendChild(el);

        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Unknown action: nonexistent'),
            ''
        );
    });

    test('initActions skips elements with empty action attribute', () => {
        loadModule();

        const el = document.createElement('div');
        el.setAttribute('data-action', '');
        document.body.appendChild(el);

        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);

        // Empty action ID should be silently skipped
    });

    test('log error always outputs regardless of debug flag', () => {
        window.blockActions = { debug: false, nonce: '', restUrl: '' };
        loadModule();

        const el = document.createElement('div');
        el.setAttribute('data-action', 'missing');
        document.body.appendChild(el);
        document.dispatchEvent(new Event('DOMContentLoaded'));

        expect(consoleSpy.error).toHaveBeenCalled();
    });

    test('log info and warning suppressed when debug is false', () => {
        window.blockActions = { debug: false, nonce: '', restUrl: '' };
        loadModule();

        document.dispatchEvent(new Event('DOMContentLoaded'));

        expect(consoleSpy.log).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
});
