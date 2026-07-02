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

// Strip pre-release suffixes before comparing: version_compare() sorts
// "7.0-beta2" / "7.0-RC1" BEFORE "7.0", so without this the guard would
// deactivate the plugin on the exact pre-release builds of the minimum
// version it targets (and again on every future minimum bump).
if ( version_compare( preg_replace( '/[-+].*$/', '', (string) get_bloginfo( 'version' ) ), MIN_WP_VERSION, '<' ) ) {
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
		// IDs are already canonical (sanitized at discovery time). A
		// manifest may override the auto-derived label and declare
		// inspector fields.
		$manifest         = is_array( $action['manifest'] ?? null ) ? $action['manifest'] : array();
		$editor_actions[] = array(
			'id'     => $action['id'],
			'label'  => $manifest['label'] ?? ucwords( str_replace( array( '-', '_' ), ' ', $action['id'] ) ),
			'fields' => $manifest['fields'] ?? array(),
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
 * Enqueue per-action functional stylesheets early, in the right places.
 *
 * Enqueuing action CSS from the `render_block` filter is too late for
 * the frontend <head> (the styles print in the footer → FOUC: the
 * disclosure panel flashes visible, carousel slides paint stacked) and
 * never runs in the editor canvas at all. This hook covers both:
 *
 * - Editor (`is_admin()`): every action is one insert away, so all
 *   action stylesheets are enqueued — each is a few hundred bytes of
 *   functional CSS.
 * - Frontend: the main query's post content is scanned for
 *   `data-action="{id}"` so only used actions' CSS is enqueued, in
 *   <head>. Actions living in template parts, `do_blocks()` output, or
 *   feeds are still covered by the render-time fallback in
 *   `Action_Renderer::enqueue_view_style()` (same handles — the second
 *   call is a no-op).
 *
 * Covers the plugin's `assets/actions/{id}.css` and theme-action
 * sidecar stylesheets (`my-action.js` + `my-action.css`).
 *
 * @since 3.0.0
 *
 * @return void
 */
function enqueue_action_styles(): void {
	$styles = array();
	$files  = glob( DIR . 'assets/actions/*.css' );
	foreach ( is_array( $files ) ? $files : array() as $file ) {
		$id            = basename( $file, '.css' );
		$styles[ $id ] = array(
			'path' => $file,
			'url'  => URL . 'assets/actions/' . basename( $file ),
		);
	}
	foreach ( discover_theme_actions() as $action ) {
		$css_path = substr( $action['path'], 0, -3 ) . '.css';
		if ( ! isset( $styles[ $action['id'] ] ) && file_exists( $css_path ) ) {
			$styles[ $action['id'] ] = array(
				'path' => $css_path,
				'url'  => substr( $action['url'], 0, -3 ) . '.css',
			);
		}
	}
	if ( empty( $styles ) ) {
		return;
	}

	$enqueue_all = is_admin();

	$haystack = '';
	if ( ! $enqueue_all && ! empty( $GLOBALS['wp_query']->posts ) ) {
		foreach ( $GLOBALS['wp_query']->posts as $queried_post ) {
			$haystack .= $queried_post->post_content ?? '';
		}
	}

	foreach ( $styles as $id => $style ) {
		if ( ! $enqueue_all && false === strpos( $haystack, 'data-action="' . $id . '"' ) ) {
			continue;
		}
		$handle = "block-actions-{$id}";
		wp_enqueue_style(
			$handle,
			$style['url'],
			array(),
			(string) filemtime( $style['path'] )
		);
		// Lets core inline these tiny stylesheets (wp_maybe_inline_styles).
		wp_style_add_data( $handle, 'path', $style['path'] );
	}
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\enqueue_action_styles' );

/**
 * Get action directories to scan for custom actions.
 *
 * Each entry is either a filesystem path (string) — whose URL is derived
 * automatically when it lives under the active theme, the parent theme,
 * or wp-content — or an explicit `array{ path: string, url: string }`
 * pair for locations outside those roots.
 *
 * @since 1.0.0
 *
 * @return array List of directory entries (string paths or { path, url } pairs).
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
 * Map a filesystem directory to its public URL.
 *
 * Resolves paths under the active (child) theme, the parent theme, or
 * wp-content (covering plugin directories). Returns '' when the path
 * lives outside every known web root — callers must then supply an
 * explicit `{ path, url }` pair via the block_actions_directories filter.
 *
 * @since 3.0.0
 *
 * @param string $path Absolute filesystem directory path.
 * @return string Base URL for the directory, or '' if it can't be mapped.
 */
function directory_to_url( string $path ): string {
	$path = wp_normalize_path( $path );

	// Most specific root first: child theme, then parent theme, then the
	// broad wp-content fallback.
	$roots = array(
		wp_normalize_path( get_stylesheet_directory() ) => get_stylesheet_directory_uri(),
		wp_normalize_path( get_template_directory() )   => get_template_directory_uri(),
		wp_normalize_path( WP_CONTENT_DIR )             => content_url(),
	);

	foreach ( $roots as $root_dir => $root_url ) {
		if ( '' === $root_dir ) {
			continue;
		}
		// Boundary-safe prefix match: `/themes/foo-extra` must not match
		// the root `/themes/foo` (the mangled URL would 404); only the
		// root itself or true descendants qualify.
		if ( $path === $root_dir || 0 === strpos( $path, $root_dir . '/' ) ) {
			return untrailingslashit( $root_url ) . substr( $path, strlen( $root_dir ) );
		}
	}

	return '';
}

/**
 * Normalize an action-directory entry to a { path, url } pair.
 *
 * @since 3.0.0
 *
 * @param string|array $entry A filesystem path, or an explicit { path, url } pair.
 * @return array|null `array{ path: string, url: string }`, or null if unmappable.
 */
function resolve_action_directory( $entry ): ?array {
	// Explicit { path, url } pair — used for locations outside the known roots.
	if ( is_array( $entry ) && isset( $entry['path'], $entry['url'] ) ) {
		return array(
			'path' => untrailingslashit( (string) $entry['path'] ),
			'url'  => untrailingslashit( (string) $entry['url'] ),
		);
	}

	if ( ! is_string( $entry ) || '' === $entry ) {
		return null;
	}

	$path = untrailingslashit( $entry );
	$url  = directory_to_url( $path );

	return '' !== $url ? array(
		'path' => $path,
		'url'  => untrailingslashit( $url ),
	) : null;
}

/**
 * Read and validate a theme action's optional manifest sidecar.
 *
 * A theme action `my-action.js` may ship a sibling `my-action.json`
 * declaring an editor `label`, inspector `fields`, and extra `directives`
 * to inject — so a theme action can have a custom label, configurable
 * fields, and directives beyond the generic init/click without writing a
 * separate editor script. Everything is validated: unknown keys are
 * dropped, and directives are restricted to `data-wp-*` so a manifest
 * can't inject arbitrary attributes.
 *
 * @since 3.0.0
 *
 * @param string $js_path Absolute path to the action's .js file.
 * @return array|null Validated manifest, or null when absent/invalid.
 */
function read_action_manifest( string $js_path ): ?array {
	$json_path = preg_replace( '/\.js$/', '.json', $js_path );
	if ( null === $json_path || ! is_string( $json_path ) || ! file_exists( $json_path ) ) {
		return null;
	}

	$data = json_decode( (string) file_get_contents( $json_path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( ! is_array( $data ) ) {
		return null;
	}

	$manifest = array();

	if ( isset( $data['label'] ) && is_string( $data['label'] ) ) {
		$manifest['label'] = sanitize_text_field( $data['label'] );
	}
	if ( isset( $data['fields'] ) && is_array( $data['fields'] ) ) {
		$manifest['fields'] = sanitize_manifest_fields( $data['fields'] );
	}
	if ( isset( $data['directives'] ) && is_array( $data['directives'] ) ) {
		$manifest['directives'] = sanitize_manifest_directives( $data['directives'] );
	}

	return empty( $manifest ) ? null : $manifest;
}

/**
 * Validate manifest inspector-field definitions.
 *
 * Mirrors the editor's field contract: an identifier-safe `key`, a `type`
 * of text|number|toggle, and a `dataAttribute` shaped like `data-*`.
 * Invalid entries are dropped.
 *
 * @since 3.0.0
 *
 * @param array $fields Raw fields array from the manifest.
 * @return array Sanitized field definitions.
 */
function sanitize_manifest_fields( array $fields ): array {
	$allowed_types = array( 'text', 'number', 'toggle', 'target' );
	$clean         = array();

	foreach ( $fields as $field ) {
		if ( ! is_array( $field ) ) {
			continue;
		}
		$key            = $field['key'] ?? '';
		$data_attribute = $field['dataAttribute'] ?? '';
		if ( ! is_string( $key ) || 1 !== preg_match( '/^[A-Za-z_][A-Za-z0-9_]*$/', $key ) ) {
			continue;
		}
		// A field maps to a PLAIN data-* attribute. `data-action` would let
		// an author-typed value overwrite the action routing id, and the
		// `data-wp-` namespace would smuggle a live Interactivity directive
		// past sanitize_manifest_directives — both reserved.
		if ( ! is_string( $data_attribute )
			|| 1 !== preg_match( '/^data-[a-z0-9-]+$/', $data_attribute )
			|| 'data-action' === $data_attribute
			|| 0 === strpos( $data_attribute, 'data-wp-' )
		) {
			continue;
		}

		$type  = isset( $field['type'] ) && in_array( $field['type'], $allowed_types, true ) ? $field['type'] : 'text';
		$entry = array(
			'key'           => $key,
			'type'          => $type,
			'label'         => isset( $field['label'] ) && is_string( $field['label'] ) ? sanitize_text_field( $field['label'] ) : $key,
			'dataAttribute' => $data_attribute,
		);
		if ( isset( $field['help'] ) && is_string( $field['help'] ) ) {
			$entry['help'] = sanitize_text_field( $field['help'] );
		}
		if ( isset( $field['required'] ) ) {
			$entry['required'] = (bool) $field['required'];
		}
		if ( isset( $field['default'] ) && is_scalar( $field['default'] ) ) {
			$entry['default'] = $field['default'];
		}
		if ( isset( $field['optional'] ) ) {
			$entry['optional'] = (bool) $field['optional'];
		}
		if ( isset( $field['targets'] ) && is_array( $field['targets'] ) ) {
			$targets = array();
			if ( isset( $field['targets']['blocks'] ) && is_array( $field['targets']['blocks'] ) ) {
				$targets['blocks'] = array_values( array_filter( $field['targets']['blocks'], 'is_string' ) );
			}
			if ( isset( $field['targets']['shape'] ) && is_string( $field['targets']['shape'] ) ) {
				$targets['shape'] = sanitize_key( $field['targets']['shape'] );
			}
			if ( $targets ) {
				$entry['targets'] = $targets;
			}
		}

		$clean[] = $entry;
	}

	return $clean;
}

/**
 * Validate manifest directive declarations.
 *
 * Only `data-wp-*` keys with string values survive — a manifest can add
 * Interactivity API directives (e.g. `data-wp-on--keydown` or the
 * window/document-scoped `data-wp-on-window--resize`) but cannot inject
 * arbitrary HTML attributes. The directives the transformer itself owns
 * are reserved: a manifest may only ADD behavior, never repoint the
 * store namespace, wipe the sanitized context, or replace the
 * init/click wiring the Theme_Action contract guarantees. (Suffixed
 * variants like `data-wp-init---extra` remain available for additive
 * handlers.)
 *
 * @since 3.0.0
 *
 * @param array $directives Raw directives map from the manifest.
 * @return array Sanitized directive map.
 */
function sanitize_manifest_directives( array $directives ): array {
	$reserved = array(
		'data-wp-interactive',
		'data-wp-context',
		'data-wp-init',
		'data-wp-on--click',
	);
	$clean    = array();
	foreach ( $directives as $key => $value ) {
		if ( ! is_string( $key ) || ! is_string( $value ) ) {
			continue;
		}
		if ( 1 !== preg_match( '/^data-wp-[a-z0-9-]+(--[a-z0-9-]+)*$/', $key ) ) {
			continue;
		}
		if ( in_array( $key, $reserved, true ) ) {
			continue;
		}
		$clean[ $key ] = $value;
	}
	return $clean;
}

/**
 * Log a developer diagnostic when WP_DEBUG is on.
 *
 * One home for the debug guard, the `[Block Actions]` prefix, and the
 * phpcs suppression, so the call sites can't drift apart.
 *
 * @since 3.0.0
 *
 * @param string $message The message to log (unprefixed).
 * @return void
 */
function debug_log( string $message ): void {
	if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( '[Block Actions] ' . $message );
	}
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
	$seen        = array();

	foreach ( $directories as $entry ) {
		$resolved = resolve_action_directory( $entry );
		if ( null === $resolved || ! is_dir( $resolved['path'] ) ) {
			continue;
		}

		// Get all .js files in the directory (non-recursive).
		$files = glob( $resolved['path'] . '/*.js' );
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
			if ( $action_id !== $filename ) {
				debug_log( sprintf( 'Theme action file "%s.js" registered as "%s" — prefer kebab-case filenames so the ID matches the file.', $filename, $action_id ) );
			}

			// Two files normalizing to the same ID (e.g. "Hero.js" + "hero.js"
			// on a case-sensitive filesystem) — or the same filename in two
			// registered directories — would otherwise both register; only
			// the first would ever load, silently. Keep the first and warn
			// so the collision is diagnosable.
			if ( isset( $seen[ $action_id ] ) ) {
				debug_log( sprintf( 'Theme action "%s" from "%s" is ignored — ID already provided by "%s". Use a unique filename.', $action_id, $file_path, $seen[ $action_id ] ) );
				continue;
			}

			$seen[ $action_id ] = $file_path;
			$actions[]          = array(
				'id'       => $action_id,
				'path'     => $file_path,
				'url'      => $resolved['url'] . '/' . basename( $file_path ),
				'manifest' => read_action_manifest( $file_path ),
			);
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
		// A built-in renderer with the same ID takes precedence. The theme
		// file would then never be enqueued (the built-in's enqueue path
		// runs instead), so warn rather than fail silently on upgrade.
		if ( in_array( $action['id'], $transformer->get_registered_ids(), true ) ) {
			debug_log( sprintf( 'Theme action "%s" is ignored because a built-in action with that ID already exists. Rename the theme action file to use a unique ID.', $action['id'] ) );
			continue;
		}
		$transformer->register_renderer( $action['id'], $theme_renderer );
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
