/**
 * @jest-environment jsdom
 */

import { BaseAction } from '../src/actions/base-action';

describe('BaseAction', () => {
    let element;
    let action;

    beforeEach(() => {
        // Setup test DOM
        element = document.createElement('div');
        const link = document.createElement('a');
        link.textContent = 'Test Button';
        element.appendChild(link);
        element.setAttribute('data-action', 'test-action');
        action = new BaseAction(element);
    });

    test('constructor initializes properly', () => {
        expect(action.element).toBe(element);
        expect(action.target).toBe(element.querySelector('a'));
        expect(action.originalText).toBe('Test Button');
        expect(action.isExecuting).toBe(false);
        expect(action.telemetry).toHaveProperty('execCount');
    });

    test('setTextContent sanitizes input', () => {
        action.setTextContent('<script>alert("xss")</script>Hello');
        expect(action.target.textContent).toBe('Hello');
    });

    test('setStyle only allows whitelisted properties', () => {
        action.setStyle('backgroundColor', 'red');
        expect(action.target.style.backgroundColor).toBe('red');

        action.setStyle('position', 'absolute');
        expect(action.target.style.position).toBe('');
    });

    test('setStyle validates values', () => {
        action.setStyle('backgroundColor', 'red');
        expect(action.target.style.backgroundColor).toBe('red');

        action.setStyle('backgroundColor', 'javascript:alert(1)');
        expect(action.target.style.backgroundColor).toBe('red');
    });

    test('rate limiting works', () => {
        expect(action.canExecute()).toBe(true);
        expect(action.canExecute()).toBe(false);

        // Fast-forward time
        jest.advanceTimersByTime(1000);
        expect(action.canExecute()).toBe(true);
    });

    test('reset restores original state', () => {
        action.setTextContent('Changed');
        action.setStyle('backgroundColor', 'red');

        action.reset();

        expect(action.target.textContent).toBe('Test Button');
        expect(action.target.style.backgroundColor).toBe('');
    });

    test('telemetry tracks executions', () => {
        action.canExecute();
        expect(action.telemetry.execCount).toBe(1);
        expect(action.telemetry.lastExecTime).toBeTruthy();
    });

    test('API requests include nonce', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            })
        );

        await action.apiRequest('/test-endpoint', { data: 'test' });

        expect(global.fetch).toHaveBeenCalledWith(
            '/test-endpoint',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-WP-Nonce': expect.any(String)
                })
            })
        );
    });
});
