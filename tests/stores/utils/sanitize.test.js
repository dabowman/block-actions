/**
 * Sanitize Utility Tests
 */

import {
	sanitizeText,
	validateStyle,
} from '../../../src/stores/utils/sanitize';

describe( 'Sanitize Utility', () => {
	describe( 'sanitizeText', () => {
		it( 'should return text as-is for safe strings', () => {
			expect( sanitizeText( 'Hello World' ) ).toBe( 'Hello World' );
		} );

		it( 'should strip HTML tags', () => {
			expect( sanitizeText( '<b>Bold</b>' ) ).toBe( 'Bold' );
		} );

		it( 'should strip script tags', () => {
			expect( sanitizeText( '<script>alert("xss")</script>' ) ).toBe(
				''
			);
		} );

		it( 'should return empty string for non-string input', () => {
			expect( sanitizeText( 123 ) ).toBe( '' );
			expect( sanitizeText( null ) ).toBe( '' );
			expect( sanitizeText( undefined ) ).toBe( '' );
		} );
	} );

	describe( 'validateStyle', () => {
		it( 'should allow valid hex colors for backgroundColor', () => {
			expect( validateStyle( 'backgroundColor', '#ff0000' ) ).toBe(
				'#ff0000'
			);
		} );

		it( 'should allow named colors', () => {
			expect( validateStyle( 'backgroundColor', 'red' ) ).toBe( 'red' );
		} );

		it( 'should allow valid opacity', () => {
			expect( validateStyle( 'opacity', '0.5' ) ).toBe( '0.5' );
			expect( validateStyle( 'opacity', '1' ) ).toBe( '1' );
			expect( validateStyle( 'opacity', '0' ) ).toBe( '0' );
		} );

		it( 'should reject disallowed properties', () => {
			expect( validateStyle( 'position', 'absolute' ) ).toBeNull();
		} );

		it( 'should reject invalid values', () => {
			expect(
				validateStyle( 'backgroundColor', 'url(javascript:alert(1))' )
			).toBeNull();
		} );

		it( 'should allow valid rgb colors', () => {
			expect(
				validateStyle( 'backgroundColor', 'rgb(255, 128, 0)' )
			).toBe( 'rgb(255, 128, 0)' );
		} );

		it( 'should reject out-of-range rgb values', () => {
			expect(
				validateStyle( 'backgroundColor', 'rgb(256, 0, 0)' )
			).toBeNull();
			expect(
				validateStyle( 'backgroundColor', 'rgb(999, 999, 999)' )
			).toBeNull();
		} );

		it( 'should allow valid rgba colors', () => {
			expect(
				validateStyle( 'backgroundColor', 'rgba(255, 128, 0, 0.5)' )
			).toBe( 'rgba(255, 128, 0, 0.5)' );
			expect(
				validateStyle( 'color', 'rgba(0, 0, 0, 1)' )
			).toBe( 'rgba(0, 0, 0, 1)' );
		} );

		it( 'should reject rgba with out-of-range alpha', () => {
			expect(
				validateStyle( 'backgroundColor', 'rgba(0, 0, 0, 1.5)' )
			).toBeNull();
		} );
	} );
} );
