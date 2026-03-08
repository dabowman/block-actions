/**
 * API Utility Tests
 */

import { apiRequest, log } from '../../../src/stores/utils/api';

describe( 'API Utility', () => {
    beforeEach( () => {
        global.fetch = jest.fn();
        window.blockActions = {
            nonce: 'test-nonce',
            debug: true,
            restUrl: 'http://example.test/wp-json/',
        };
    } );

    describe( 'apiRequest', () => {
        it( 'should make authenticated POST request', async () => {
            global.fetch.mockResolvedValue( {
                ok: true,
                json: () => Promise.resolve( { success: true } ),
            } );

            const result = await apiRequest( '/wp-json/test', { key: 'value' } );

            expect( global.fetch ).toHaveBeenCalledWith( '/wp-json/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': 'test-nonce',
                },
                body: JSON.stringify( { key: 'value' } ),
                credentials: 'same-origin',
            } );
            expect( result ).toEqual( { success: true } );
        } );

        it( 'should throw on non-ok response', async () => {
            global.fetch.mockResolvedValue( {
                ok: false,
                statusText: 'Not Found',
            } );

            await expect( apiRequest( '/wp-json/test' ) ).rejects.toThrow(
                'API request failed: Not Found'
            );
        } );
    } );

    describe( 'log', () => {
        it( 'should log errors regardless of debug flag', () => {
            window.blockActions.debug = false;
            const spy = jest.spyOn( console, 'error' ).mockImplementation();
            log( 'error', 'test error' );
            expect( spy ).toHaveBeenCalledWith(
                '[Block Actions] test error',
                ''
            );
            spy.mockRestore();
        } );

        it( 'should log info only in debug mode', () => {
            window.blockActions.debug = true;
            const spy = jest.spyOn( console, 'log' ).mockImplementation();
            log( 'info', 'test info' );
            expect( spy ).toHaveBeenCalledWith(
                '[Block Actions] test info'
            );
            spy.mockRestore();
        } );

        it( 'should not log info when debug is off', () => {
            window.blockActions.debug = false;
            const spy = jest.spyOn( console, 'log' ).mockImplementation();
            log( 'info', 'test info' );
            expect( spy ).not.toHaveBeenCalled();
            spy.mockRestore();
        } );

        it( 'should log warnings in debug mode', () => {
            window.blockActions.debug = true;
            const spy = jest.spyOn( console, 'warn' ).mockImplementation();
            log( 'warning', 'test warning' );
            expect( spy ).toHaveBeenCalledWith(
                '[Block Actions] test warning'
            );
            spy.mockRestore();
        } );
    } );
} );
