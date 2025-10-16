/**
 * @jest-environment jsdom
 */

import { BaseAction } from '../src/actions/base-action';

describe('BaseAction', () => {
    let element;
    let action;
    let consoleSpy;

    beforeEach(() => {
        // Setup test DOM
        element = document.createElement('div');
        const link = document.createElement('a');
        link.textContent = 'Test Button';
        element.appendChild(link);
        element.setAttribute('data-action', 'test-action');
        action = new BaseAction(element);

        // Reset fetch mock between tests
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            })
        );

        // Clear console mocks between tests
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };
    });

    afterEach(() => {
        // Clean up console spies
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
    });

    test('constructor initializes properly', () => {
        expect(action.element).toBe(element);
        expect(action.target).toBe(element.querySelector('a'));
        expect(action.originalText).toBe('Test Button');
        expect(action.isExecuting).toBe(false);
        expect(action.telemetry).toHaveProperty('startTime');
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

    test('setStyle warns on invalid values', () => {
        action.setStyle('backgroundColor', 'not-a-color');
        expect(consoleSpy.warn).toHaveBeenCalledWith(
            expect.stringContaining('Invalid style')
        );
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
        expect(action.telemetry.executions).toBe(1);
        expect(action.telemetry.lastExecuted).toBeTruthy();
    });

    test('API requests include nonce', async () => {
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

    // New tests for error handling
    test('logError sends telemetry data to WordPress', async () => {
        const error = new Error('Test error');
        await action.logError('Test message', error);

        expect(action.telemetry.errors).toBe(1);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('Test message')
            })
        );
        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Test message'),
            error
        );
    });

    // New tests for debug logging
    test('logInfo respects debug flag', () => {
        // Test when debug is false
        window.tagHeuerActions.debug = false;
        action.logInfo('test message');
        expect(consoleSpy.log).not.toHaveBeenCalled();

        // Test when debug is true
        window.tagHeuerActions.debug = true;
        action.logInfo('test message');
        expect(consoleSpy.log).toHaveBeenCalledWith(
            expect.stringContaining('test message')
        );
    });

    // New tests for API error handling
    test('apiRequest handles failed requests', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                statusText: 'Not Found'
            })
        );

        await expect(action.apiRequest('/test')).rejects.toThrow('API request failed');
        expect(action.telemetry.errors).toBe(1);
    });

    test('apiRequest handles network errors', async () => {
        global.fetch = jest.fn(() =>
            Promise.reject(new Error('Network error'))
        );

        await expect(action.apiRequest('/test')).rejects.toThrow('Network error');
        expect(action.telemetry.errors).toBe(1);
    });

    test('rate limiting warns when limit exceeded', () => {
        action.canExecute(); // First execution
        action.canExecute(); // Should be rate limited

        expect(consoleSpy.warn).toHaveBeenCalledWith(
            expect.stringContaining('Rate limit exceeded')
        );
    });

    test('rate limiting warns when maximum executions reached', () => {
        // Set executions to maximum
        action.telemetry.executions = 100;
        action.canExecute();

        expect(consoleSpy.warn).toHaveBeenCalledWith(
            expect.stringContaining('Maximum executions reached')
        );
    });
});
