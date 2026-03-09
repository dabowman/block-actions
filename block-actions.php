<?php
/**
 * Plugin Name: Block Actions
 * Description: Extend blocks with custom actions and data attributes.
 * Version: 2.0.0
 * Requires at least: 6.6
 * Requires PHP: 8.0
 * Author: dabowman
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: block-actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Load Interactivity API infrastructure.
require_once plugin_dir_path( __FILE__ ) . 'includes/class-action-renderer.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-directive-transformer.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-scroll-to-top.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-carousel.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-toggle-visibility.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-modal-toggle.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-smooth-scroll.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-copy-to-clipboard.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/renderers/class-theme-action.php';

// Translations are auto-loaded by WordPress.org for this plugin slug.

/**
 * Helper to read asset metadata with filemtime fallback.
 *
 * @since 1.0.0
 *
 * @param string $asset_filename  Asset metadata filename.
 * @param string $script_filename Script file for mtime fallback.
 * @return array{dependencies: array, version: string} Asset metadata with dependencies and version.
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
 *
 * @since 1.0.0
 *
 * @return void
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

	// Enqueue theme actions in editor so they appear in the action selector.
	$theme_actions = discover_theme_actions();
	foreach ( $theme_actions as $action ) {
		wp_enqueue_script(
			'block-action-editor-' . $action['id'],
			$action['url'],
			array( 'block-actions-editor' ),
			filemtime( $action['path'] ),
			true
		);
	}
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_block_editor_assets' );

/**
 * Get plugin settings with defaults.
 *
 * @since 1.0.0
 *
 * @return array Plugin settings with defaults applied.
 */
function get_plugin_settings(): array {
	$defaults = array(
		'enable_csp' => false,
	);
	$options = (array) get_option( 'block_actions_settings', array() );
	return wp_parse_args( $options, $defaults );
}

/**
 * Get action directories to scan for custom actions.
 *
 * @since 1.0.0
 *
 * @return array Array of directory paths to scan for actions.
 */
function get_action_directories(): array {
	$directories = array();

	// Add theme's /actions directory if it exists.
	$theme_dir = get_stylesheet_directory() . '/actions';
	if ( is_dir( $theme_dir ) ) {
		$directories[] = $theme_dir;
	}

	// Allow plugins/themes to add custom action directories.
	$directories = (array) apply_filters( 'block_actions_directories', $directories );

	return $directories;
}

/**
 * Discover action files in registered directories.
 *
 * @since 1.0.0
 *
 * @return array Array of action file information with 'id', 'path', and 'url'.
 */
function discover_theme_actions(): array {
	$directories = get_action_directories();
	$actions = array();

	foreach ( $directories as $directory ) {
		if ( ! is_dir( $directory ) ) {
			continue;
		}

		// Get all .js files in the directory (non-recursive).
		$files = glob( $directory . '/*.js' );
		if ( ! $files ) {
			continue;
		}

		foreach ( $files as $file_path ) {
			$filename = basename( $file_path, '.js' );

			// Skip files that start with underscore or dot.
			if ( strpos( $filename, '_' ) === 0 || strpos( $filename, '.' ) === 0 ) {
				continue;
			}

			// Determine URL based on directory location.
			$file_url = '';
			$theme_dir = get_stylesheet_directory();
			$theme_uri = get_stylesheet_directory_uri();

			if ( strpos( $file_path, $theme_dir ) === 0 ) {
				$file_url = str_replace( $theme_dir, $theme_uri, $file_path );
			}

			if ( $file_url ) {
				$actions[] = array(
					'id' => $filename,
					'path' => $file_path,
					'url' => $file_url,
				);
			}
		}
	}

	return $actions;
}

/**
 * Add security headers (CSP opt-in via setting/filter), and safe defaults.
 *
 * @since 1.0.0
 *
 * @return void
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
 *
 * @since 1.0.0
 *
 * @return void
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
 * @since 1.0.0
 *
 * @param array $input Raw input from settings form.
 * @return array Sanitized settings array.
 */
function sanitize_settings( array $input ): array {
	return array(
		'enable_csp' => ! empty( $input['enable_csp'] ),
	);
}

/**
 * Render settings page.
 *
 * @since 1.0.0
 *
 * @return void
 */
function render_settings_page(): void { ?>
	<div class="wrap">
		<h1><?php echo esc_html( __( 'Block Actions Settings', 'block-actions' ) ); ?></h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'block_actions' ); ?>
			<?php $settings = get_plugin_settings(); ?>
			<table class="form-table" role="presentation">
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

/**
 * Initialize the Interactivity API directive transformer.
 *
 * Registers all built-in action renderers and hooks into render_block.
 *
 * @since 2.0.0
 *
 * @return void
 */
function init_interactivity_api(): void {
	$transformer = new Directive_Transformer();

	// Register built-in action renderers.
	$transformer->register_renderer( 'scroll-to-top', new Renderers\Scroll_To_Top() );
	$transformer->register_renderer( 'carousel', new Renderers\Carousel() );
	$transformer->register_renderer( 'toggle-visibility', new Renderers\Toggle_Visibility() );
	$transformer->register_renderer( 'modal-toggle', new Renderers\Modal_Toggle() );
	$transformer->register_renderer( 'smooth-scroll', new Renderers\Smooth_Scroll() );
	$transformer->register_renderer( 'copy-to-clipboard', new Renderers\Copy_To_Clipboard() );

	// Register generic renderer for theme actions.
	$theme_actions = discover_theme_actions();
	$theme_renderer = new Renderers\Theme_Action();
	foreach ( $theme_actions as $action ) {
		if ( ! in_array( $action['id'], $transformer->get_registered_ids(), true ) ) {
			$transformer->register_renderer( $action['id'], $theme_renderer );
		}
	}

	// Hook into render_block to inject directives.
	add_filter(
		'render_block',
		function ( string $block_content, array $block ) use ( $transformer ): string {
			return $transformer->transform( $block_content, $block );
		},
		10,
		2
	);
}
add_action( 'init', __NAMESPACE__ . '\\init_interactivity_api' );

/**
 * Enqueue theme action script modules for the Interactivity API.
 *
 * Theme actions are enqueued as ES script modules with
 * '@wordpress/interactivity' as a dependency.
 *
 * @since 2.0.0
 *
 * @return void
 */
function enqueue_theme_action_modules(): void {
	$theme_actions = discover_theme_actions();
	foreach ( $theme_actions as $action ) {
		wp_enqueue_script_module(
			'block-actions-theme-' . $action['id'],
			$action['url'],
			array( '@wordpress/interactivity' )
		);
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_theme_action_modules' );
