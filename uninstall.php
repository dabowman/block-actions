<?php
/**
 * Block Actions uninstall handler.
 *
 * Runs when the plugin is deleted from the WordPress admin. Cleans up
 * options the plugin wrote so nothing lingers in wp_options.
 *
 * @since 2.1.0
 * @package Block_Actions
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'block_actions_settings' );
