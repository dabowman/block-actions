/**
 * Rate Limiter Utility Tests
 */

import {
	createRateLimiter,
	getRateLimiter,
} from '../../../src/stores/utils/rate-limiter';

describe( 'Rate Limiter', () => {
	beforeEach( () => {
		jest.useFakeTimers();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	describe( 'createRateLimiter', () => {
		it( 'should allow executions up to the limit', () => {
			const limiter = createRateLimiter( 5 );
			for ( let i = 0; i < 5; i++ ) {
				expect( limiter.canExecute() ).toBe( true );
			}
			expect( limiter.canExecute() ).toBe( false );
		} );

		it( 'should reset after 1 second', () => {
			const limiter = createRateLimiter( 5 );
			for ( let i = 0; i < 5; i++ ) {
				limiter.canExecute();
			}
			expect( limiter.canExecute() ).toBe( false );

			jest.advanceTimersByTime( 1001 );
			expect( limiter.canExecute() ).toBe( true );
		} );

		it( 'should respect custom max per second', () => {
			const limiter = createRateLimiter( 2 );
			expect( limiter.canExecute() ).toBe( true );
			expect( limiter.canExecute() ).toBe( true );
			expect( limiter.canExecute() ).toBe( false );
		} );

		it( 'should use default of 5 per second', () => {
			const limiter = createRateLimiter();
			for ( let i = 0; i < 5; i++ ) {
				expect( limiter.canExecute() ).toBe( true );
			}
			expect( limiter.canExecute() ).toBe( false );
		} );
	} );

	describe( 'getRateLimiter', () => {
		it( 'should return the same limiter for the same element', () => {
			const el = document.createElement( 'div' );
			const limiter1 = getRateLimiter( el );
			const limiter2 = getRateLimiter( el );
			expect( limiter1 ).toBe( limiter2 );
		} );

		it( 'should return different limiters for different elements', () => {
			const el1 = document.createElement( 'div' );
			const el2 = document.createElement( 'div' );
			const limiter1 = getRateLimiter( el1 );
			const limiter2 = getRateLimiter( el2 );
			expect( limiter1 ).not.toBe( limiter2 );
		} );

		it( 'should create limiter with specified max per second', () => {
			const el = document.createElement( 'div' );
			const limiter = getRateLimiter( el, 3 );
			expect( limiter.canExecute() ).toBe( true );
			expect( limiter.canExecute() ).toBe( true );
			expect( limiter.canExecute() ).toBe( true );
			expect( limiter.canExecute() ).toBe( false );
		} );
	} );
} );
