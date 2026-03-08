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
    const allowedStyles = {
        backgroundColor:
            /^(#[0-9A-Fa-f]{6}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|[a-zA-Z]+)$/,
        color: /^(#[0-9A-Fa-f]{6}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|[a-zA-Z]+)$/,
        opacity: /^(0(\.\d+)?|1(\.0+)?)$/,
    };

    if ( ! allowedStyles[ property ] || ! allowedStyles[ property ].test( value ) ) {
        return null;
    }

    return value;
}
