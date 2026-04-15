/**
 * Sanitize Utility
 *
 * DOMPurify wrapper for XSS protection.
 *
 * @since 2.0.0
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize text content, stripping all HTML tags.
 *
 * @since 2.0.0
 *
 * @param {string} text Text to sanitize.
 * @return {string} Sanitized text with all tags removed.
 */
export function sanitizeText( text ) {
	if ( typeof text !== 'string' ) {
		return '';
	}
	return DOMPurify.sanitize( text, { ALLOWED_TAGS: [] } );
}

/**
 * Validate and return a CSS value if it matches the allowed pattern.
 *
 * @since 2.0.0
 *
 * @param {string} property CSS property name.
 * @param {string} value    CSS value.
 * @return {string|null} The value if valid, null otherwise.
 */
export function validateStyle( property, value ) {
	// RGB channel: 0-9, 10-99, 100-199, 200-249, 250-255
	const channel = '([0-9]|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])';
	const rgb = `rgb\\(${ channel },\\s*${ channel },\\s*${ channel }\\)`;
	const alpha = '(0(\\.\\d+)?|1(\\.0+)?)';
	const rgba = `rgba\\(${ channel },\\s*${ channel },\\s*${ channel },\\s*${ alpha }\\)`;
	const colorPattern = new RegExp(
		`^(#[0-9A-Fa-f]{6}|${ rgb }|${ rgba }|[a-zA-Z]+)$`
	);

	const allowedStyles = {
		backgroundColor: colorPattern,
		color: colorPattern,
		opacity: /^(0(\.\d+)?|1(\.0+)?)$/,
	};

	if (
		! allowedStyles[ property ] ||
		! allowedStyles[ property ].test( value )
	) {
		return null;
	}

	return value;
}
