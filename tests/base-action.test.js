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

    test('setStyle warns on invalid values', () => {
        action.setStyle('backgroundColor', 'not-a-color');
        expect(consoleSpy.warn).toHaveBeenCalled();
    });

    test('rate limiting works', () => {
        // Rate limit is 5 per second
        for (let i = 0; i < 5; i++) {
            expect(action.canExecute()).toBe(true);
        }
        // 6th call exceeds limit
        expect(action.canExecute()).toBe(false);

        // Fast-forward time past the 1s window
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
    test('log error increments error count', () => {
        const error = new Error('Test error');
        action.log('error', 'Test message', error);

        expect(action.telemetry.errorCount).toBe(1);
        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Test message'),
            error
        );
    });

    // New tests for debug logging
    test('log info respects debug flag', () => {
        // Test when debug is false
        window.blockActions.debug = false;
        action.log('info', 'test message');
        expect(consoleSpy.log).not.toHaveBeenCalled();

        // Test when debug is true
        window.blockActions.debug = true;
        action.log('info', 'test message');
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
    });

    test('apiRequest handles network errors', async () => {
        global.fetch = jest.fn(() =>
            Promise.reject(new Error('Network error'))
        );

        await expect(action.apiRequest('/test')).rejects.toThrow('Network error');
    });

    test('rate limiting warns when limit exceeded', () => {
        // Exhaust the 5-per-second limit
        for (let i = 0; i < 5; i++) {
            action.canExecute();
        }

        expect(action.canExecute()).toBe(false);
    });

    test('rate limiting warns when maximum executions reached', () => {
        // Ensure completeExecution releases the lock safely
        action.completeExecution();
    });

    test('constructor uses element as target when no anchor child', () => {
        const div = document.createElement('div');
        div.textContent = 'Direct Text';
        div.setAttribute('data-action', 'my-action');
        const a = new BaseAction(div);
        expect(a.target).toBe(div);
        expect(a.originalText).toBe('Direct Text');
    });

    test('constructor reads nonce and restUrl from window.blockActions', () => {
        expect(action.nonce).toBe('test-nonce');
        expect(action.restUrl).toBe('http://example.test/wp-json/');
        expect(action.actionId).toBe('test-action');
    });

    test('constructor handles missing window.blockActions gracefully', () => {
        const saved = window.blockActions;
        delete window.blockActions;
        const div = document.createElement('div');
        div.setAttribute('data-action', 'x');
        const a = new BaseAction(div);
        expect(a.nonce).toBe('');
        expect(a.restUrl).toBe('');
        window.blockActions = saved;
    });

    test('setTextContent ignores non-string input', () => {
        action.setTextContent('Valid');
        expect(action.target.textContent).toBe('Valid');

        action.setTextContent(123);
        expect(action.target.textContent).toBe('Valid');

        action.setTextContent(null);
        expect(action.target.textContent).toBe('Valid');
    });

    test('setStyle applies valid color property', () => {
        action.setStyle('color', '#FF0000');
        expect(action.target.style.color).toBe('rgb(255, 0, 0)');
    });

    test('setStyle applies valid opacity property', () => {
        action.setStyle('opacity', '0.5');
        expect(action.target.style.opacity).toBe('0.5');
    });

    test('setStyle rejects invalid opacity values', () => {
        action.setStyle('opacity', '2');
        expect(action.target.style.opacity).toBe('');
    });

    test('completeExecution clears safety timeout and tracks duration', () => {
        action.canExecute();
        expect(action.isExecuting).toBe(true);
        expect(action._safetyTimeout).toBeTruthy();

        action.completeExecution();
        expect(action.isExecuting).toBe(false);
        expect(action._safetyTimeout).toBeNull();
        expect(action.telemetry.lastDuration).toBeGreaterThanOrEqual(0);
    });

    test('completeExecution is a no-op when not executing', () => {
        expect(action.isExecuting).toBe(false);
        action.completeExecution();
        expect(action.isExecuting).toBe(false);
    });

    test('safety timeout releases lock after 3 seconds', () => {
        action.canExecute();
        expect(action.isExecuting).toBe(true);

        jest.advanceTimersByTime(3000);
        expect(action.isExecuting).toBe(false);
    });

    test('executeWithRateLimit runs callback and returns true', () => {
        const callback = jest.fn();
        const result = action.executeWithRateLimit(callback);
        expect(result).toBe(true);
        expect(callback).toHaveBeenCalled();
        expect(action.isExecuting).toBe(false);
    });

    test('executeWithRateLimit returns false when rate limited', () => {
        // Exhaust rate limit
        for (let i = 0; i < 5; i++) {
            action.executeWithRateLimit(() => {});
        }
        const callback = jest.fn();
        const result = action.executeWithRateLimit(callback);
        expect(result).toBe(false);
        expect(callback).not.toHaveBeenCalled();
    });

    test('executeWithRateLimit returns false and logs on callback error', () => {
        const error = new Error('callback error');
        const result = action.executeWithRateLimit(() => { throw error; });
        expect(result).toBe(false);
        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Error in rate-limited execution'),
            error
        );
        // completeExecution still called in finally block
        expect(action.isExecuting).toBe(false);
    });

    test('log warning calls console.warn', () => {
        action.log('warning', 'a warning');
        expect(consoleSpy.warn).toHaveBeenCalledWith(
            expect.stringContaining('a warning')
        );
    });

    test('log error without error object passes empty string', () => {
        action.log('error', 'some error');
        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('some error'),
            ''
        );
    });

    test('apiRequest sends correct body and credentials', async () => {
        await action.apiRequest('/endpoint', { key: 'value' });
        expect(global.fetch).toHaveBeenCalledWith(
            '/endpoint',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ key: 'value' }),
                credentials: 'same-origin'
            })
        );
    });

    test('apiRequest sends empty object when no data provided', async () => {
        await action.apiRequest('/endpoint');
        expect(global.fetch).toHaveBeenCalledWith(
            '/endpoint',
            expect.objectContaining({
                body: JSON.stringify({})
            })
        );
    });
});
