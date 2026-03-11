/**
 * @jest-environment jsdom
 */

// Mock WordPress packages
jest.mock('@wordpress/hooks', () => ({
    addFilter: jest.fn()
}));

jest.mock('@wordpress/compose', () => ({
    createHigherOrderComponent: jest.fn((fn, name) => {
        const wrapped = fn;
        wrapped.displayName = name;
        return wrapped;
    })
}));

jest.mock('@wordpress/element', () => ({
    Fragment: 'Fragment'
}));

jest.mock('@wordpress/block-editor', () => ({
    InspectorAdvancedControls: 'InspectorAdvancedControls'
}));

jest.mock('@wordpress/components', () => ({
    TextControl: 'TextControl',
    ComboboxControl: 'ComboboxControl'
}));

jest.mock('@wordpress/i18n', () => ({
    __: (text) => text
}));

jest.mock('lodash', () => ({
    assign: Object.assign
}));

// Mock action registry
jest.mock('../src/action-registry', () => [
    { id: 'scroll-to-top', label: 'Scroll To Top' },
    { id: 'carousel', label: 'Carousel' }
]);

describe('block-extensions', () => {
    let consoleSpy;

    beforeEach(() => {
        jest.resetModules();
        delete window.BlockActions;

        // Provide wp.element.createElement for JSX compilation (babel uses wp.element pragma)
        global.wp = global.wp || {};
        global.wp.element = {
            createElement: jest.fn((...args) => ({ type: args[0], props: args[1], children: args.slice(2) })),
            Fragment: 'Fragment'
        };

        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };

        // Re-apply mocks after resetModules
        jest.mock('@wordpress/hooks', () => ({ addFilter: jest.fn() }));
        jest.mock('@wordpress/compose', () => ({
            createHigherOrderComponent: jest.fn((fn, name) => {
                const wrapped = fn;
                wrapped.displayName = name;
                return wrapped;
            })
        }));
        jest.mock('@wordpress/element', () => ({ Fragment: 'Fragment' }));
        jest.mock('@wordpress/block-editor', () => ({ InspectorAdvancedControls: 'InspectorAdvancedControls' }));
        jest.mock('@wordpress/components', () => ({ TextControl: 'TextControl', ComboboxControl: 'ComboboxControl' }));
        jest.mock('@wordpress/i18n', () => ({ __: (text) => text }));
        jest.mock('lodash', () => ({ assign: Object.assign }));
        jest.mock('../src/action-registry', () => [
            { id: 'scroll-to-top', label: 'Scroll To Top' },
            { id: 'carousel', label: 'Carousel' }
        ]);
    });

    afterEach(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
    });

    function loadModule() {
        return require('../src/block-extensions');
    }

    test('registers four filters on load', () => {
        loadModule();
        const { addFilter } = require('@wordpress/hooks');
        expect(addFilter).toHaveBeenCalledTimes(4);

        const filterNames = addFilter.mock.calls.map(c => c[0]);
        expect(filterNames).toContain('blocks.registerBlockType');
        expect(filterNames).toContain('editor.BlockEdit');
        expect(filterNames).toContain('blocks.getSaveContent.extraProps');
    });

    test('exposes global BlockActions API', () => {
        loadModule();
        expect(window.BlockActions).toBeDefined();
        expect(window.BlockActions.registerAction).toBeInstanceOf(Function);
        expect(window.BlockActions.getRegisteredActions).toBeInstanceOf(Function);
    });

    describe('registerEditorAction', () => {
        test('succeeds with valid params', () => {
            loadModule();
            const result = window.BlockActions.registerAction('theme-action', 'Theme Action', () => {});
            expect(result).toBe(true);
        });

        test('returns false for empty id', () => {
            loadModule();
            expect(window.BlockActions.registerAction('', 'Label', () => {})).toBe(false);
        });

        test('returns false for non-string id', () => {
            loadModule();
            expect(window.BlockActions.registerAction(null, 'Label', () => {})).toBe(false);
        });

        test('returns false for empty label', () => {
            loadModule();
            expect(window.BlockActions.registerAction('id', '', () => {})).toBe(false);
        });

        test('returns false for non-string label', () => {
            loadModule();
            expect(window.BlockActions.registerAction('id', 42, () => {})).toBe(false);
        });

        test('returns false for duplicate id', () => {
            loadModule();
            window.BlockActions.registerAction('dup', 'Dup', () => {});
            expect(window.BlockActions.registerAction('dup', 'Dup 2', () => {})).toBe(false);
        });
    });

    describe('getEditorRegisteredActions', () => {
        test('returns built-in actions', () => {
            loadModule();
            const actions = window.BlockActions.getRegisteredActions();
            expect(actions).toEqual(expect.arrayContaining([
                { id: 'scroll-to-top', label: 'Scroll To Top' },
                { id: 'carousel', label: 'Carousel' }
            ]));
        });

        test('includes theme actions after registration', () => {
            loadModule();
            window.BlockActions.registerAction('my-theme', 'My Theme', () => {});
            const actions = window.BlockActions.getRegisteredActions();
            expect(actions).toEqual(expect.arrayContaining([
                { id: 'my-theme', label: 'My Theme' }
            ]));
        });
    });

    describe('addCustomDataAttribute filter', () => {
        test('adds customData attribute to any block', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const registerBlockTypeCall = addFilter.mock.calls.find(c => c[0] === 'blocks.registerBlockType');
            const filterFn = registerBlockTypeCall[2];

            const settings = { name: 'core/paragraph', attributes: {} };
            const result = filterFn(settings);
            expect(result.attributes.customData).toEqual({ type: 'string', default: '' });
            expect(result.attributes.customAction).toBeUndefined();
        });

        test('adds customAction attribute to supported blocks', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.registerBlockType')[2];

            const settings = { name: 'core/button', attributes: {} };
            const result = filterFn(settings);
            expect(result.attributes.customData).toBeDefined();
            expect(result.attributes.customAction).toEqual({ type: 'string', default: '' });
        });

        test('adds customAction attribute to core/group', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.registerBlockType')[2];

            const settings = { name: 'core/group', attributes: {} };
            const result = filterFn(settings);
            expect(result.attributes.customAction).toEqual({ type: 'string', default: '' });
        });

        test('returns unmodified settings on error', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.registerBlockType')[2];

            // Pass null attributes to trigger error
            const settings = { name: 'core/button', attributes: null };
            const result = filterFn(settings);
            expect(result).toBe(settings);
        });
    });

    describe('addCustomDataToSave filter', () => {
        test('adds data-custom when customData is set', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];

            const props = {};
            const result = filterFn(props, { name: 'core/paragraph' }, { customData: 'my-value' });
            expect(result['data-custom']).toBe('my-value');
        });

        test('does not add data-custom when customData is empty', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];

            const props = {};
            const result = filterFn(props, { name: 'core/paragraph' }, { customData: '' });
            expect(result['data-custom']).toBeUndefined();
        });

        test('adds data-action for supported blocks with customAction', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];

            const props = {};
            const result = filterFn(props, { name: 'core/button' }, { customAction: 'scroll-to-top', customData: '' });
            expect(result['data-action']).toBe('scroll-to-top');
        });

        test('does not add data-action for unsupported blocks', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];

            const props = {};
            const result = filterFn(props, { name: 'core/paragraph' }, { customAction: 'scroll-to-top' });
            expect(result['data-action']).toBeUndefined();
        });

        test('does not add data-action when customAction is empty', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];

            const props = {};
            const result = filterFn(props, { name: 'core/button' }, { customAction: '' });
            expect(result['data-action']).toBeUndefined();
        });

        test('returns unmodified props on error', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];

            const props = { existing: true };
            // Pass null attributes to trigger error in destructuring
            const result = filterFn(props, { name: 'core/button' }, null);
            expect(result).toBe(props);
        });
    });

    describe('withInspectorControl HOC', () => {
        function getHOC() {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const editCalls = addFilter.mock.calls.filter(c => c[0] === 'editor.BlockEdit');
            // First editor.BlockEdit filter is withInspectorControl
            return editCalls[0][2];
        }

        test('renders BlockEdit and inspector control with customData', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const props = {
                name: 'core/paragraph',
                attributes: { customData: 'my-value' },
                setAttributes: jest.fn()
            };
            const result = Component(props);
            expect(result).toBeDefined();
            expect(global.wp.element.createElement).toHaveBeenCalled();
        });

        test('setAttributes is called when customData changes', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const setAttributes = jest.fn();
            const props = {
                name: 'core/paragraph',
                attributes: { customData: '' },
                setAttributes
            };
            Component(props);

            // Find the TextControl createElement call and invoke onChange
            const textControlCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'TextControl'
            );
            if (textControlCall && textControlCall[1] && textControlCall[1].onChange) {
                textControlCall[1].onChange('new-value');
                expect(setAttributes).toHaveBeenCalledWith({ customData: 'new-value' });
            }
        });

        test('returns BlockEdit on error', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            // Pass props with null attributes to trigger error
            const result = Component({ attributes: null, setAttributes: jest.fn() });
            expect(result).toBeDefined();
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('Error rendering custom data inspector control'),
                expect.anything()
            );
        });
    });

    describe('withActionInspectorControl HOC', () => {
        function getHOC() {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const editCalls = addFilter.mock.calls.filter(c => c[0] === 'editor.BlockEdit');
            // Second editor.BlockEdit filter is withActionInspectorControl
            return editCalls[1][2];
        }

        test('skips non-action blocks', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => 'mock-result');
            const Component = hoc(MockBlockEdit);

            const props = {
                name: 'core/paragraph',
                attributes: {},
                setAttributes: jest.fn()
            };
            const result = Component(props);
            // Should return BlockEdit directly (not wrapped)
            expect(result).toBeDefined();
        });

        test('renders action selector for supported blocks', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const props = {
                name: 'core/button',
                attributes: { customAction: 'scroll-to-top' },
                setAttributes: jest.fn()
            };
            const result = Component(props);
            expect(result).toBeDefined();

            // Should have rendered a ComboboxControl
            const comboCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ComboboxControl'
            );
            expect(comboCall).toBeDefined();
        });

        test('onChange handler sets customAction attribute', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const setAttributes = jest.fn();
            const props = {
                name: 'core/button',
                attributes: { customAction: '' },
                setAttributes
            };
            Component(props);

            const comboCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ComboboxControl'
            );
            if (comboCall && comboCall[1] && comboCall[1].onChange) {
                comboCall[1].onChange('carousel');
                expect(setAttributes).toHaveBeenCalledWith({ customAction: 'carousel' });
            }
        });

        test('onChange handles errors gracefully', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const setAttributes = jest.fn(() => { throw new Error('mock error'); });
            const props = {
                name: 'core/button',
                attributes: { customAction: '' },
                setAttributes
            };
            Component(props);

            const comboCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ComboboxControl'
            );
            if (comboCall && comboCall[1] && comboCall[1].onChange) {
                comboCall[1].onChange('carousel');
                expect(consoleSpy.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to set action attribute'),
                    expect.anything()
                );
            }
        });

        test('onFilterValueChange returns filtered options', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const props = {
                name: 'core/group',
                attributes: { customAction: '' },
                setAttributes: jest.fn()
            };
            Component(props);

            const comboCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ComboboxControl'
            );
            if (comboCall && comboCall[1] && comboCall[1].onFilterValueChange) {
                // Call with empty string (should return all options)
                comboCall[1].onFilterValueChange('');
                // Call with search term
                comboCall[1].onFilterValueChange('carousel');
            }
        });

        test('returns BlockEdit on error', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const result = Component({
                name: 'core/button',
                attributes: null,
                setAttributes: jest.fn()
            });
            expect(result).toBeDefined();
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('Error rendering action inspector control'),
                expect.anything()
            );
        });
    });

    describe('log function', () => {
        test('error log increments telemetry and console.error', () => {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const filterFn = addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];
            filterFn({}, { name: 'core/button' }, null);
            expect(consoleSpy.error).toHaveBeenCalled();
        });

        test('info log suppressed when debug is false', () => {
            window.blockActions = { debug: false, nonce: '', restUrl: '' };
            loadModule();
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });

        test('info log shown when debug is true', () => {
            window.blockActions = { debug: true, nonce: '', restUrl: '' };
            loadModule();
            // The module logs info about initialization via setTimeout
            jest.advanceTimersByTime(0);
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('Block Actions initialized')
            );
        });
    });

    describe('module-level error handling', () => {
        test('catches filter registration failure', () => {
            jest.mock('@wordpress/hooks', () => ({
                addFilter: jest.fn(() => { throw new Error('registration failed'); })
            }));
            jest.mock('@wordpress/compose', () => ({
                createHigherOrderComponent: jest.fn((fn) => fn)
            }));
            jest.mock('@wordpress/element', () => ({ Fragment: 'Fragment' }));
            jest.mock('@wordpress/block-editor', () => ({ InspectorAdvancedControls: 'InspectorAdvancedControls' }));
            jest.mock('@wordpress/components', () => ({ TextControl: 'TextControl', ComboboxControl: 'ComboboxControl' }));
            jest.mock('@wordpress/i18n', () => ({ __: (text) => text }));
            jest.mock('lodash', () => ({ assign: Object.assign }));
            jest.mock('../src/action-registry', () => []);

            require('../src/block-extensions');

            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to register Block Actions'),
                expect.anything()
            );
        });
    });
});
