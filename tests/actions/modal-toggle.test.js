/**
 * @jest-environment jsdom
 */

import { BaseAction } from '../../src/actions/base-action';

describe('modal-toggle action', () => {
    let element;
    let link;
    let modal;
    let consoleSpy;

    beforeEach(() => {
        jest.resetModules();

        element = document.createElement('div');
        link = document.createElement('a');
        link.textContent = 'Open Modal';
        element.appendChild(link);
        element.setAttribute('data-action', 'modal-toggle');
        element.setAttribute('data-modal', 'test-modal');

        modal = document.createElement('div');
        modal.id = 'test-modal';
        modal.setAttribute('hidden', '');
        const closeBtn = document.createElement('button');
        closeBtn.classList.add('modal-close');
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);

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
        require('../../src/actions/modal-toggle');
        return window.BlockActions.registerAction.mock.calls[0][2];
    }

    test('registers with BlockActions', () => {
        require('../../src/actions/modal-toggle');
        expect(window.BlockActions.registerAction).toHaveBeenCalledWith(
            'modal-toggle',
            'Modal Toggle',
            expect.any(Function)
        );
    });

    test('click opens hidden modal', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(modal.hasAttribute('hidden')).toBe(false);
        expect(modal.classList.contains('is-open')).toBe(true);
        expect(document.body.style.overflow).toBe('hidden');
    });

    test('click on open modal closes it', () => {
        const initFn = loadAction();
        initFn(element);

        // Open
        link.click();
        expect(modal.hasAttribute('hidden')).toBe(false);

        // Close
        link.click();
        expect(modal.hasAttribute('hidden')).toBe(true);
        expect(modal.classList.contains('is-open')).toBe(false);
        expect(document.body.style.overflow).toBe('');
    });

    test('close button closes modal', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.click();

        expect(modal.hasAttribute('hidden')).toBe(true);
    });

    test('Escape key closes modal', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(modal.hasAttribute('hidden')).toBe(true);
    });

    test('backdrop click closes modal', () => {
        const initFn = loadAction();
        initFn(element);
        link.click();

        // Click on modal itself (backdrop)
        modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(modal.hasAttribute('hidden')).toBe(true);
    });

    test('logs error when data-modal is missing', () => {
        element.removeAttribute('data-modal');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('No data-modal attribute'),
            expect.anything()
        );
    });

    test('logs error when modal element not found', () => {
        element.setAttribute('data-modal', 'nonexistent');
        const initFn = loadAction();
        initFn(element);
        link.click();

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('not found'),
            expect.anything()
        );
    });

    test('modal gets tabindex and focus on open', () => {
        const initFn = loadAction();
        initFn(element);
        const focusSpy = jest.spyOn(modal, 'focus');
        link.click();

        expect(modal.getAttribute('tabindex')).toBe('-1');
        expect(focusSpy).toHaveBeenCalled();
    });

    test('data-modal-close attribute also closes', () => {
        const closeBtn2 = document.createElement('button');
        closeBtn2.setAttribute('data-modal-close', '');
        modal.appendChild(closeBtn2);

        const initFn = loadAction();
        initFn(element);
        link.click();

        closeBtn2.click();
        expect(modal.hasAttribute('hidden')).toBe(true);
    });
});
