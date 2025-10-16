<?php
/**
 * Plugin Name: block actions
 * Description: Adds custom data attributes to all blocks for Tag Heuer demo.
 * Version: 1.0
 * Author: WPVIP
 * License: GPL2
 */

namespace TagHeuer\BlockExtensions;

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

use RemoteDataBlocks\REST\RemoteDataController;
/**
 * Enqueue block editor assets.
 */
function enqueue_block_editor_assets(): void {
    $asset_file = include plugin_dir_path(__FILE__) . 'build/block-extensions.asset.php';

    wp_enqueue_script(
        'block-actions',
        plugin_dir_url(__FILE__) . 'build/block-extensions.js',
        $asset_file['dependencies'],
        $asset_file['version']
    );
}
add_action('enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_block_editor_assets');

/**
 * Enqueue frontend assets with security features
 */
function tag_heuer_enqueue_frontend_actions(): void {
    $asset_file = include plugin_dir_path(__FILE__) . 'build/frontend.asset.php';

    // Enqueue the frontend script
    wp_enqueue_script(
        'tag-heuer-frontend-actions',
        plugin_dir_url(__FILE__) . 'build/frontend.js',
        $asset_file['dependencies'],
        $asset_file['version'],
        true
    );

    // Define UUIDs for different environments
    $uuids = [
        'local' => defined( 'SF_TH_UUID' ) ? constant( 'SF_TH_UUID' ) : '',
        'production' => defined( 'SF_TH_UUID_PROD' ) ? constant( 'SF_TH_UUID_PROD' ) : ''
    ];

    // Check if we're in production using VIP_GO_APP_ENVIRONMENT constant
    $is_local = defined( 'VIP_GO_APP_ENVIRONMENT' ) && 'local' === constant( 'VIP_GO_APP_ENVIRONMENT' );

    // Get appropriate UUID based on environment
    $data_source_uuid = $is_local ? $uuids['local'] : $uuids['production'];

    // Add security nonce and configuration
    wp_localize_script('tag-heuer-frontend-actions', 'tagHeuerActions', [
        'restUrl' => remove_query_arg('_envelope', RemoteDataController::get_url() ),
        'nonce' => wp_create_nonce('tag-heuer-actions'),
        'debug' => defined('WP_DEBUG') && WP_DEBUG,
        'dataSourceUuid' => $data_source_uuid,
    ]);

}
add_action('wp_enqueue_scripts', __NAMESPACE__ . '\\tag_heuer_enqueue_frontend_actions');

/**
 * Add security headers
 */
function add_security_headers(): void {
    if (!is_admin()) {
        // Content Security Policy is disabled for development
        // Uncomment the following line to enable CSP in production:
        // header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data: https://tagheuer.remotedatablocks.com; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; child-src 'none'; frame-src 'self'; worker-src 'self'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content;");

        // Other security headers are still enabled
        // XSS Protection
        header('X-XSS-Protection: 1; mode=block');
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}
add_action('send_headers', __NAMESPACE__ . '\\add_security_headers');

/**
 * Helper function to detect production environment
 */
function is_prod_environment(): bool {
    // Method 1: Check WP_ENVIRONMENT_TYPE constant (WP 5.5+)
    if (defined('WP_ENVIRONMENT_TYPE') && WP_ENVIRONMENT_TYPE === 'production') {
        return true;
    }

    // Method 2: Check URL pattern for production domain
    $current_url = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    if (strpos($current_url, 'remotedatablocks.com') !== false) {
        return true;
    }

    // Method 3: Check for specific production constants
    if (defined('VIP_GO_ENV') && VIP_GO_ENV === 'production') {
        return true;
    }

    return false;
}
