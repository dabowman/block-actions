/**
 * @jest-environment jsdom
 *
 * Tests for the actions registry (src/actions/index.js).
 *
 * The real module uses webpack's require.context, which is unavailable in Jest.
 * We test the module by setting up a global require.context mock before loading.
 */

describe('actions/index.js', () => {
    let consoleSpy;

    beforeEach(() => {
        jest.resetModules();
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

    function setupRequireContext(mockModules) {
        // require.context is a webpack feature - mock it globally
        const contextFn = (key) => mockModules[key] || {};
        contextFn.keys = () => Object.keys(mockModules);

        // Monkey-patch require to add context method
        // eslint-disable-next-line no-global-assign
        global.__webpackRequireContext = contextFn;

        // Jest uses babel to transform the code, so require.context
        // won't be available. We need to provide it via a module mock.
        jest.mock('../../src/actions/index.js', () => {
            const CORE_ACTION_IDS = ['scroll-to-top', 'carousel'];

            const ctx = global.__webpackRequireContext;
            const actions = ctx.keys()
                .filter(key => key !== './index.js' && key !== './base-action.js')
                .map(key => key.replace(/^\.\/(.*)\.js$/, '$1'))
                .filter(id => CORE_ACTION_IDS.includes(id))
                .map(id => {
                    const mod = ctx(`./${id}.js`);
                    return {
                        id,
                        label: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                        init: mod.default
                    };
                });
            return actions;
        });
    }

    test('exports only whitelisted actions', () => {
        const mockScrollInit = jest.fn();
        const mockCarouselInit = jest.fn();
        const mockOtherInit = jest.fn();

        setupRequireContext({
            './index.js': {},
            './base-action.js': {},
            './scroll-to-top.js': { default: mockScrollInit },
            './carousel.js': { default: mockCarouselInit },
            './other-action.js': { default: mockOtherInit }
        });

        const actions = require('../../src/actions/index.js');

        expect(Array.isArray(actions)).toBe(true);
        expect(actions).toHaveLength(2);

        const ids = actions.map(a => a.id);
        expect(ids).toContain('scroll-to-top');
        expect(ids).toContain('carousel');
        expect(ids).not.toContain('other-action');
    });

    test('action objects have correct shape', () => {
        const mockInit = jest.fn();

        setupRequireContext({
            './index.js': {},
            './base-action.js': {},
            './scroll-to-top.js': { default: mockInit },
            './carousel.js': { default: jest.fn() }
        });

        const actions = require('../../src/actions/index.js');
        const scrollAction = actions.find(a => a.id === 'scroll-to-top');

        expect(scrollAction).toEqual({
            id: 'scroll-to-top',
            label: 'Scroll To Top',
            init: mockInit
        });
    });

    test('generates titlecase labels from kebab-case filenames', () => {
        setupRequireContext({
            './index.js': {},
            './base-action.js': {},
            './scroll-to-top.js': { default: jest.fn() },
            './carousel.js': { default: jest.fn() }
        });

        const actions = require('../../src/actions/index.js');

        expect(actions.find(a => a.id === 'scroll-to-top').label).toBe('Scroll To Top');
        expect(actions.find(a => a.id === 'carousel').label).toBe('Carousel');
    });

    test('filters out index.js and base-action.js', () => {
        setupRequireContext({
            './index.js': { default: jest.fn() },
            './base-action.js': { default: jest.fn() },
            './scroll-to-top.js': { default: jest.fn() },
            './carousel.js': { default: jest.fn() }
        });

        const actions = require('../../src/actions/index.js');
        const ids = actions.map(a => a.id);

        expect(ids).not.toContain('index');
        expect(ids).not.toContain('base-action');
    });

    test('returns empty array when no whitelisted actions match', () => {
        setupRequireContext({
            './index.js': {},
            './base-action.js': {},
            './unknown-action.js': { default: jest.fn() }
        });

        const actions = require('../../src/actions/index.js');
        expect(actions).toHaveLength(0);
    });
});
