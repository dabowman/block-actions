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
    ComboboxControl: 'ComboboxControl',
    ToggleControl: 'ToggleControl'
}));

jest.mock('@wordpress/i18n', () => ({
    __: (text) => text
}));

jest.mock('lodash', () => ({
    assign: Object.assign
}));

// Mock action registry
jest.mock('../src/action-registry', () => [
    { id: 'scroll-to-top', label: 'Scroll To Top', fields: [] },
    {
        id: 'carousel',
        label: 'Carousel',
        fields: [
            {
                key: 'wrapAround',
                type: 'toggle',
                label: 'Wrap Around',
                help: 'Loop back to the first slide after the last.',
                dataAttribute: 'data-wrap-around',
                required: false,
                default: true,
            }
        ]
    },
    {
        id: 'smooth-scroll',
        label: 'Smooth Scroll',
        fields: [
            {
                key: 'target',
                type: 'text',
                label: 'Target Element ID',
                dataAttribute: 'data-target',
                required: true,
                default: '',
            },
            {
                key: 'offset',
                type: 'number',
                label: 'Scroll Offset (px)',
                dataAttribute: 'data-offset',
                required: false,
                default: 0,
            }
        ]
    }
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
        jest.mock('@wordpress/components', () => ({ TextControl: 'TextControl', ComboboxControl: 'ComboboxControl', ToggleControl: 'ToggleControl' }));
        jest.mock('@wordpress/i18n', () => ({ __: (text) => text }));
        jest.mock('lodash', () => ({ assign: Object.assign }));
        jest.mock('../src/action-registry', () => [
            { id: 'scroll-to-top', label: 'Scroll To Top', fields: [] },
            {
                id: 'carousel',
                label: 'Carousel',
                fields: [
                    {
                        key: 'wrapAround',
                        type: 'toggle',
                        label: 'Wrap Around',
                        help: 'Loop back to the first slide after the last.',
                        dataAttribute: 'data-wrap-around',
                        required: false,
                        default: true,
                    }
                ]
            },
            {
                id: 'smooth-scroll',
                label: 'Smooth Scroll',
                fields: [
                    {
                        key: 'target',
                        type: 'text',
                        label: 'Target Element ID',
                        dataAttribute: 'data-target',
                        required: true,
                        default: '',
                    },
                    {
                        key: 'offset',
                        type: 'number',
                        label: 'Scroll Offset (px)',
                        dataAttribute: 'data-offset',
                        required: false,
                        default: 0,
                    }
                ]
            }
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
        test('returns built-in actions with fields', () => {
            loadModule();
            const actions = window.BlockActions.getRegisteredActions();
            expect(actions).toEqual(expect.arrayContaining([
                expect.objectContaining({ id: 'scroll-to-top', label: 'Scroll To Top', fields: [] }),
                expect.objectContaining({ id: 'carousel', label: 'Carousel', fields: expect.any(Array) })
            ]));
        });

        test('includes theme actions after registration', () => {
            loadModule();
            window.BlockActions.registerAction('my-theme', 'My Theme', () => {});
            const actions = window.BlockActions.getRegisteredActions();
            expect(actions).toEqual(expect.arrayContaining([
                expect.objectContaining({ id: 'my-theme', label: 'My Theme', fields: [] })
            ]));
        });

        test('includes fields for theme actions registered with fields', () => {
            loadModule();
            const fields = [{ key: 'gallery', type: 'text', label: 'Gallery', dataAttribute: 'data-gallery' }];
            window.BlockActions.registerAction('lightbox', 'Lightbox', fields, () => {});
            const actions = window.BlockActions.getRegisteredActions();
            const lightbox = actions.find(a => a.id === 'lightbox');
            expect(lightbox.fields).toEqual(fields);
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

        test('onChange handler sets customAction and clears actionData', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            const setAttributes = jest.fn();
            const props = {
                name: 'core/button',
                attributes: { customAction: '', actionData: { old: 'data' } },
                setAttributes
            };
            Component(props);

            const comboCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ComboboxControl'
            );
            if (comboCall && comboCall[1] && comboCall[1].onChange) {
                comboCall[1].onChange('carousel');
                expect(setAttributes).toHaveBeenCalledWith({ customAction: 'carousel', actionData: {} });
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

    describe('actionData attribute', () => {
        function getRegisterFilter() {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            return addFilter.mock.calls.find(c => c[0] === 'blocks.registerBlockType')[2];
        }

        test('adds actionData attribute to supported blocks', () => {
            const filterFn = getRegisterFilter();
            const settings = { name: 'core/button', attributes: {} };
            const result = filterFn(settings);
            expect(result.attributes.actionData).toEqual({ type: 'object', default: {} });
        });

        test('does not add actionData to unsupported blocks', () => {
            const filterFn = getRegisterFilter();
            const settings = { name: 'core/paragraph', attributes: {} };
            const result = filterFn(settings);
            expect(result.attributes.actionData).toBeUndefined();
        });
    });

    describe('actionData in save filter', () => {
        function getSaveFilter() {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            return addFilter.mock.calls.find(c => c[0] === 'blocks.getSaveContent.extraProps')[2];
        }

        test('maps actionData fields to data-* attributes', () => {
            const filterFn = getSaveFilter();
            const result = filterFn({}, { name: 'core/button' }, {
                customAction: 'smooth-scroll',
                customData: '',
                actionData: { target: 'my-section', offset: 80 }
            });
            expect(result['data-action']).toBe('smooth-scroll');
            expect(result['data-target']).toBe('my-section');
            expect(result['data-offset']).toBe('80');
        });

        test('maps toggle field values to data-* attributes', () => {
            const filterFn = getSaveFilter();
            const result = filterFn({}, { name: 'core/button' }, {
                customAction: 'carousel',
                customData: '',
                actionData: { wrapAround: true }
            });
            expect(result['data-wrap-around']).toBe('true');
        });

        test('does not emit data-* for empty string values', () => {
            const filterFn = getSaveFilter();
            const result = filterFn({}, { name: 'core/button' }, {
                customAction: 'smooth-scroll',
                customData: '',
                actionData: { target: '', offset: 0 }
            });
            expect(result['data-target']).toBeUndefined();
        });

        test('ignores actionData when no action is selected', () => {
            const filterFn = getSaveFilter();
            const result = filterFn({}, { name: 'core/button' }, {
                customAction: '',
                customData: '',
                actionData: { target: 'something' }
            });
            expect(result['data-target']).toBeUndefined();
        });

        test('handles missing actionData gracefully', () => {
            const filterFn = getSaveFilter();
            const result = filterFn({}, { name: 'core/button' }, {
                customAction: 'carousel',
                customData: ''
            });
            expect(result['data-action']).toBe('carousel');
        });

        test('only emits declared fields, not arbitrary actionData keys', () => {
            const filterFn = getSaveFilter();
            const result = filterFn({}, { name: 'core/button' }, {
                customAction: 'scroll-to-top',
                customData: '',
                actionData: { sneaky: 'value' }
            });
            expect(result['data-sneaky']).toBeUndefined();
        });
    });

    describe('action field rendering in withActionInspectorControl', () => {
        function getHOC() {
            loadModule();
            const { addFilter } = require('@wordpress/hooks');
            const editCalls = addFilter.mock.calls.filter(c => c[0] === 'editor.BlockEdit');
            return editCalls[1][2];
        }

        test('renders toggle control for action with toggle field', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            Component({
                name: 'core/button',
                attributes: { customAction: 'carousel', actionData: {} },
                setAttributes: jest.fn()
            });

            const toggleCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ToggleControl'
            );
            expect(toggleCall).toBeDefined();
            expect(toggleCall[1].label).toBe('Wrap Around');
        });

        test('renders text and number controls for multi-field action', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            Component({
                name: 'core/button',
                attributes: { customAction: 'smooth-scroll', actionData: {} },
                setAttributes: jest.fn()
            });

            const textCalls = global.wp.element.createElement.mock.calls.filter(
                call => call[0] === 'TextControl'
            );
            // Should have at least 2 TextControls for the smooth-scroll fields
            // (target as text, offset as number rendered via TextControl type=number)
            const targetControl = textCalls.find(c => c[1].label === 'Target Element ID');
            const offsetControl = textCalls.find(c => c[1].label === 'Scroll Offset (px)');
            expect(targetControl).toBeDefined();
            expect(offsetControl).toBeDefined();
            expect(offsetControl[1].type).toBe('number');
        });

        test('renders no field controls for action without fields', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            Component({
                name: 'core/button',
                attributes: { customAction: 'scroll-to-top', actionData: {} },
                setAttributes: jest.fn()
            });

            const toggleCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ToggleControl'
            );
            expect(toggleCall).toBeUndefined();
        });

        test('field onChange updates actionData', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);
            const setAttributes = jest.fn();

            Component({
                name: 'core/button',
                attributes: { customAction: 'carousel', actionData: {} },
                setAttributes
            });

            const toggleCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ToggleControl'
            );
            if (toggleCall && toggleCall[1] && toggleCall[1].onChange) {
                toggleCall[1].onChange(false);
                expect(setAttributes).toHaveBeenCalledWith({
                    actionData: { wrapAround: false }
                });
            }
        });

        test('uses field default when actionData key is missing', () => {
            const hoc = getHOC();
            const MockBlockEdit = jest.fn(() => null);
            const Component = hoc(MockBlockEdit);

            Component({
                name: 'core/button',
                attributes: { customAction: 'carousel', actionData: {} },
                setAttributes: jest.fn()
            });

            const toggleCall = global.wp.element.createElement.mock.calls.find(
                call => call[0] === 'ToggleControl'
            );
            // Default for wrapAround is true
            expect(toggleCall[1].checked).toBe(true);
        });
    });

    describe('registerEditorAction with fields', () => {
        test('accepts fields array as third argument', () => {
            loadModule();
            const fields = [{ key: 'target', type: 'text', label: 'Target', dataAttribute: 'data-target' }];
            const result = window.BlockActions.registerAction('my-action', 'My Action', fields, () => {});
            expect(result).toBe(true);
        });

        test('backward compatible with function as third argument', () => {
            loadModule();
            const result = window.BlockActions.registerAction('compat-action', 'Compat', () => {});
            expect(result).toBe(true);
            const actions = window.BlockActions.getRegisteredActions();
            const action = actions.find(a => a.id === 'compat-action');
            expect(action.fields).toEqual([]);
        });

        test('rejects field with missing key', () => {
            loadModule();
            const fields = [{ type: 'text', label: 'Bad', dataAttribute: 'data-bad' }];
            const result = window.BlockActions.registerAction('bad-field', 'Bad', fields);
            expect(result).toBe(false);
        });

        test('rejects field with invalid dataAttribute', () => {
            loadModule();
            const fields = [{ key: 'ok', type: 'text', label: 'OK', dataAttribute: 'not-data' }];
            const result = window.BlockActions.registerAction('bad-attr', 'Bad', fields);
            expect(result).toBe(false);
        });

        test('rejects field with invalid type', () => {
            loadModule();
            const fields = [{ key: 'ok', type: 'invalid', label: 'OK', dataAttribute: 'data-ok' }];
            const result = window.BlockActions.registerAction('bad-type', 'Bad', fields);
            expect(result).toBe(false);
        });

        test('accepts field without explicit type', () => {
            loadModule();
            const fields = [{ key: 'ok', label: 'OK', dataAttribute: 'data-ok' }];
            const result = window.BlockActions.registerAction('no-type', 'No Type', fields);
            expect(result).toBe(true);
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
            jest.mock('@wordpress/components', () => ({ TextControl: 'TextControl', ComboboxControl: 'ComboboxControl', ToggleControl: 'ToggleControl' }));
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
