<?php
/**
 * Plugin Name: Block Actions
 * Description: Extend blocks with custom actions and data attributes.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Author: WPVIP
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: block-actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Translations are auto-loaded by WordPress.org for this plugin slug.

/**
 * Helper to read asset metadata with filemtime fallback.
 *
 * @param string $asset_filename Asset metadata filename.
 * @param string $script_filename Script file for mtime fallback.
 * @return array{dependencies: array, version: string}
 */
function get_asset_meta( string $asset_filename, string $script_filename ): array {
	$asset_path = plugin_dir_path( __FILE__ ) . $asset_filename;
	$script_path = plugin_dir_path( __FILE__ ) . $script_filename;
	$deps = array();
	$ver = file_exists( $script_path ) ? (string) filemtime( $script_path ) : '1.0.0';
	if ( file_exists( $asset_path ) ) {
		$asset = include $asset_path;
		$deps = isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array();
		$ver = isset( $asset['version'] ) ? (string) $asset['version'] : $ver;
	}
	return array(
		'dependencies' => $deps,
		'version' => $ver,
	);
}

/**
 * Enqueue block editor assets.
 */
function enqueue_block_editor_assets(): void {
	$asset = get_asset_meta( 'build/block-extensions.asset.php', 'build/block-extensions.js' );

	wp_enqueue_script(
		'block-actions-editor',
		plugin_dir_url( __FILE__ ) . 'build/block-extensions.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_block_editor_assets' );

/**
 * Get plugin settings with defaults.
 *
 * @return array
 */
function get_plugin_settings(): array {
	$defaults = array(
		'enable_frontend' => true,
		'enable_csp' => false,
	);
	$options = (array) get_option( 'block_actions_settings', array() );
	return wp_parse_args( $options, $defaults );
}

/**
 * Enqueue frontend assets and localize config.
 */
function enqueue_frontend_assets(): void {
	$settings = get_plugin_settings();
	if ( empty( $settings['enable_frontend'] ) ) {
		return;
	}

	$asset = get_asset_meta( 'build/frontend.asset.php', 'build/frontend.js' );

	wp_enqueue_script(
		'block-actions-frontend',
		plugin_dir_url( __FILE__ ) . 'build/frontend.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_localize_script( 'block-actions-frontend', 'blockActions', array(
		'restUrl' => esc_url_raw( rest_url() ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'debug' => defined( 'WP_DEBUG' ) && WP_DEBUG,
	) );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_frontend_assets' );

/**
 * Add security headers (CSP opt-in via setting/filter), and safe defaults.
 */
function add_security_headers(): void {
	if ( is_admin() ) {
		return;
	}

	$settings = get_plugin_settings();
	$enable_csp = (bool) apply_filters( 'block_actions_enable_csp', (bool) $settings['enable_csp'] );

	if ( $enable_csp ) {
		// Example policy; adjust via filter for production as needed.
		$csp = (string) apply_filters( 'block_actions_csp_header', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content;" );
		header( 'Content-Security-Policy: ' . $csp );
	}

	// Other security headers.
	header( 'X-Content-Type-Options: nosniff' );
	header( 'Referrer-Policy: strict-origin-when-cross-origin' );
}
add_action( 'send_headers', __NAMESPACE__ . '\\add_security_headers' );

/**
 * Register settings and admin page.
 */
function register_settings(): void {
	register_setting( 'block_actions', 'block_actions_settings', array( 'type' => 'array', 'sanitize_callback' => __NAMESPACE__ . '\\sanitize_settings' ) );

	add_options_page(
		__( 'Block Actions', 'block-actions' ),
		__( 'Block Actions', 'block-actions' ),
		'manage_options',
		'block-actions',
		__NAMESPACE__ . '\\render_settings_page'
	);
}
add_action( 'admin_menu', __NAMESPACE__ . '\\register_settings' );

/**
 * Sanitize settings.
 *
 * @param array $input Raw input.
 * @return array
 */
function sanitize_settings( array $input ): array {
	return array(
		'enable_frontend' => ! empty( $input['enable_frontend'] ),
		'enable_csp' => ! empty( $input['enable_csp'] ),
	);
}

/**
 * Render settings page.
 */
function render_settings_page(): void { ?>
	<div class="wrap">
		<h1><?php echo esc_html( __( 'Block Actions Settings', 'block-actions' ) ); ?></h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'block_actions' ); ?>
			<?php $settings = get_plugin_settings(); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php echo esc_html( __( 'Enable frontend script', 'block-actions' ) ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="block_actions_settings[enable_frontend]" value="1" <?php checked( $settings['enable_frontend'] ); ?> />
							<?php echo esc_html( __( 'Load the frontend initializer on the site', 'block-actions' ) ); ?>
						</label>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php echo esc_html( __( 'Enable Content Security Policy', 'block-actions' ) ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="block_actions_settings[enable_csp]" value="1" <?php checked( $settings['enable_csp'] ); ?> />
							<?php echo esc_html( __( 'Send CSP header (advanced). Configure via filters.', 'block-actions' ) ); ?>
						</label>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
<?php }
