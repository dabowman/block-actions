<?php
/**
 * Plugin Name: Block Actions
 * Description: Extend blocks with custom actions and data attributes.
 * Version: 3.0.0
 * Requires at least: 7.0
 * Requires PHP: 8.0
 * Author: dabowman
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: block-actions
 *
 * @package Block_Actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

const VERSION = '3.0.0';

/**
 * Minimum supported WordPress version.
 *
 * The Interactivity API surface this plugin builds on (withSyncEvent,
 * script module dependency resolution) plus the roadmap features
 * (unique directive IDs, router asset auto-loading, watch(), Abilities)
 * set the floor at 7.0.
 */
const MIN_WP_VERSION = '7.0';

if ( ! defined( 'Block_Actions\\DIR' ) ) {
	define( 'Block_Actions\\DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'Block_Actions\\URL' ) ) {
	define( 'Block_Actions\\URL', plugin_dir_url( __FILE__ ) );
}

if ( version_compare( get_bloginfo( 'version' ), MIN_WP_VERSION, '<' ) ) {
	add_action(
		'admin_notices',
		function (): void {
			printf(
				'<div class="notice notice-error"><p>%s</p></div>',
				esc_html(
					sprintf(
						/* translators: %s: minimum required WordPress version. */
						__( 'Block Actions requires WordPress %s or newer and is inactive on this site. Please update WordPress to use it.', 'block-actions' ),
						MIN_WP_VERSION
					)
				)
			);
		}
	);
	return;
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
	$asset_path  = plugin_dir_path( __FILE__ ) . $asset_filename;
	$script_path = plugin_dir_path( __FILE__ ) . $script_filename;
	$deps        = array();
	$ver         = file_exists( $script_path ) ? (string) filemtime( $script_path ) : '1.0.0';
	if ( file_exists( $asset_path ) ) {
		$asset = include $asset_path;
		$deps  = isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array();
		$ver   = isset( $asset['version'] ) ? (string) $asset['version'] : $ver;
	}
	return array(
		'dependencies' => $deps,
		'version'      => $ver,
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

	// CSS is enqueued separately via `enqueue_block_assets` so it reaches
	// the block editor's iframe canvas (WP 6.3+). See enqueue_editor_iframe_styles().

	// Pass discovered theme action IDs to the editor script so they appear
	// in the action selector. Theme action JS files are ES modules and
	// cannot be loaded as classic scripts in the editor; instead we pass
	// their metadata and let block-extensions.js register them.
	$theme_actions  = discover_theme_actions();
	$editor_actions = array();
	foreach ( $theme_actions as $action ) {
		// IDs are already canonical (sanitized at discovery time).
		$editor_actions[] = array(
			'id'    => $action['id'],
			'label' => ucwords( str_replace( array( '-', '_' ), ' ', $action['id'] ) ),
		);
	}
	if ( ! empty( $editor_actions ) ) {
		wp_localize_script( 'block-actions-editor', 'blockActionsThemeActions', $editor_actions );
	}
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_block_editor_assets' );

/**
 * Enqueue Modal Dialog variation styles on the frontend and inside
 * the block editor's iframe canvas.
 *
 * `enqueue_block_assets` fires on the frontend AND inside the editor
 * iframe (unlike `enqueue_block_editor_assets`, which only reaches the
 * outer admin page). The stylesheet contains two rule groups:
 *   - Shared UA resets so Group block supports aren't overridden.
 *   - Editor-only visibility overrides scoped via the
 *     `.block-editor-block-list__block` class Gutenberg injects.
 *
 * @since 3.0.0
 *
 * @return void
 */
function enqueue_modal_dialog_styles(): void {
	$css_path = plugin_dir_path( __FILE__ ) . 'build/block-extensions.css';
	if ( ! file_exists( $css_path ) ) {
		return;
	}

	wp_enqueue_style(
		'block-actions-modal-dialog',
		plugin_dir_url( __FILE__ ) . 'build/block-extensions.css',
		array(),
		(string) filemtime( $css_path )
	);
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\enqueue_modal_dialog_styles' );

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
 * Results are cached in a static variable to avoid repeated
 * filesystem lookups when called multiple times per request.
 *
 * @since 1.0.0
 *
 * @return array Array of action file information with 'id', 'path', and 'url'.
 */
function discover_theme_actions(): array {
	static $cached = null;
	if ( null !== $cached ) {
		return $cached;
	}

	$directories = get_action_directories();
	$actions     = array();

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

			// Canonical action ID. Derived once here and used everywhere
			// (editor dropdown, renderer registry, module handle) so a
			// mixed-case filename can't produce mismatched IDs.
			$action_id = sanitize_key( $filename );
			if ( '' === $action_id ) {
				continue;
			}
			if ( $action_id !== $filename && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( sprintf( '[Block Actions] Theme action file "%s.js" registered as "%s" — prefer kebab-case filenames so the ID matches the file.', $filename, $action_id ) );
			}

			// Determine URL based on directory location.
			$file_url  = '';
			$theme_dir = get_stylesheet_directory();
			$theme_uri = get_stylesheet_directory_uri();

			if ( strpos( $file_path, $theme_dir ) === 0 ) {
				$file_url = str_replace( $theme_dir, $theme_uri, $file_path );
			}

			if ( $file_url ) {
				$actions[] = array(
					'id'   => $action_id,
					'path' => $file_path,
					'url'  => $file_url,
				);
			}
		}
	}

	$cached = $actions;
	return $actions;
}

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
	$theme_actions  = discover_theme_actions();
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
 * Register block patterns shipped with the plugin.
 *
 * Scans `patterns/*.php`, reads the standard pattern headers, and
 * registers each via `register_block_pattern`. WP 6.4+ auto-discovers
 * patterns from themes but not from plugins — plugins still need to
 * register explicitly.
 *
 * @since 3.0.0
 *
 * @return void
 */
function register_block_patterns(): void {
	if ( ! function_exists( 'register_block_pattern' ) ) {
		return;
	}

	$files = glob( plugin_dir_path( __FILE__ ) . 'patterns/*.php' );
	if ( ! $files ) {
		return;
	}

	foreach ( $files as $file ) {
		$headers = get_file_data(
			$file,
			array(
				'title'       => 'Title',
				'slug'        => 'Slug',
				'description' => 'Description',
				'categories'  => 'Categories',
				'keywords'    => 'Keywords',
				'blockTypes'  => 'Block Types',
				'inserter'    => 'Inserter',
				'viewport'    => 'Viewport Width',
			)
		);

		if ( empty( $headers['slug'] ) || empty( $headers['title'] ) ) {
			continue;
		}

		ob_start();
		include $file;
		$content = (string) ob_get_clean();

		$args = array(
			'title'   => $headers['title'],
			'content' => $content,
		);
		if ( $headers['description'] ) {
			$args['description'] = $headers['description'];
		}
		if ( $headers['categories'] ) {
			$args['categories'] = array_map( 'trim', explode( ',', $headers['categories'] ) );
		}
		if ( $headers['keywords'] ) {
			$args['keywords'] = array_map( 'trim', explode( ',', $headers['keywords'] ) );
		}
		if ( $headers['blockTypes'] ) {
			$args['blockTypes'] = array_map( 'trim', explode( ',', $headers['blockTypes'] ) );
		}
		if ( 'no' === $headers['inserter'] || 'false' === $headers['inserter'] ) {
			$args['inserter'] = false;
		}
		if ( $headers['viewport'] && is_numeric( $headers['viewport'] ) ) {
			$args['viewportWidth'] = (int) $headers['viewport'];
		}

		register_block_pattern( $headers['slug'], $args );
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_block_patterns' );

/**
 * Defensive render-tag swap for Modal Dialog groups.
 *
 * Core Group's `tagName` attribute is a plain string at save/render
 * time — the UI dropdown's allowed-options list is only a client-side
 * convenience, and setting `tagName: 'dialog'` currently renders as
 * `<dialog>`. If a future WordPress release ever clamps tagName to an
 * enum that excludes `dialog`, our Modal Dialog variation would
 * silently degrade to `<div>` and the modal-toggle action would fail.
 *
 * This filter treats the `block-actions-modal` className as the
 * source of truth: any `core/group` with that class renders as a
 * `<dialog>` element regardless of what tagName is set to. It's a
 * no-op in the common case where the tag is already `<dialog>`.
 *
 * @since 3.0.0
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block data.
 * @return string Possibly tag-rewritten HTML.
 */
function force_dialog_for_modal_groups( string $block_content, array $block ): string {
	if ( 'core/group' !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	if ( '' === trim( $block_content ) ) {
		return $block_content;
	}
	$class = (string) ( $block['attrs']['className'] ?? '' );
	if ( false === strpos( $class, 'block-actions-modal' ) ) {
		return $block_content;
	}

	$processor = new \WP_HTML_Tag_Processor( $block_content );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}
	$tag = $processor->get_tag();
	if ( null === $tag || 'DIALOG' === $tag ) {
		return $block_content;
	}

	// WP_HTML_Tag_Processor can't rewrite tag names; fall back to
	// targeted regex on the outermost opening + closing tag.
	$quoted        = preg_quote( $tag, '/' );
	$block_content = preg_replace( '/^(\s*)<' . $quoted . '\b/i', '$1<dialog', $block_content, 1 );
	$block_content = preg_replace( '/<\/' . $quoted . '>(\s*)$/i', '</dialog>$1', $block_content, 1 );

	return $block_content;
}
add_filter( 'render_block', __NAMESPACE__ . '\\force_dialog_for_modal_groups', 20, 2 );

// Theme action script modules are enqueued on demand during render by the
// Theme_Action renderer (includes/renderers/class-theme-action.php), so a
// theme's action JS only loads on pages where a block actually uses it —
// matching how built-in action stores are enqueued.
