/**
 * API Utility
 *
 * Nonce-authenticated fetch wrapper for WordPress REST API requests.
 *
 * @since 2.0.0
 */

/**
 * Make an authenticated API request to WordPress.
 *
 * @since 2.0.0
 *
 * @param {string} endpoint API endpoint URL.
 * @param {Object} data     Request body data.
 * @return {Promise<Object>} Promise resolving to the JSON response.
 */
export async function apiRequest( endpoint, data = {} ) {
    const nonce = window?.blockActions?.nonce || '';

    const response = await fetch( endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce,
        },
        body: JSON.stringify( data ),
        credentials: 'same-origin',
    } );

    if ( ! response.ok ) {
        throw new Error( `API request failed: ${ response.statusText }` );
    }

    return await response.json();
}

/**
 * Centralized logging utility.
 *
 * @since 2.0.0
 *
 * @param {string}      type    Log type: 'error', 'warning', or 'info'.
 * @param {string}      message Log message.
 * @param {Error|null} [error]  Optional error object.
 * @return {void}
 */
export function log( type, message, error = null ) {
    const prefix = '[Block Actions]';
    const debug = !! window?.blockActions?.debug;

    if ( type === 'error' ) {
        console.error( `${ prefix } ${ message }`, error || '' );
        return;
    }

    if ( debug ) {
        if ( type === 'warning' ) {
            console.warn( `${ prefix } ${ message }` );
        } else {
            console.log( `${ prefix } ${ message }` );
        }
    }
}
