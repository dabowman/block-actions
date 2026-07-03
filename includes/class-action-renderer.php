<?php
/**
 * Abstract base class for action renderers.
 *
 * Each action implements get_initial_context() and apply_directives()
 * to declare how its Interactivity API directives should be injected.
 *
 * @since 2.0.0
 * @package Block_Actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Abstract Action Renderer.
 *
 * @since 2.0.0
 */
abstract class Action_Renderer {

	/**
	 * Get the initial context data for this action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor positioned at the root element.
	 * @param array                  $block     The parsed block data.
	 * @return array Associative array of context data to inject as data-wp-context.
	 */
	abstract public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array;

	/**
	 * Apply action-specific directives to the root element.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor positioned at the root element.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	abstract public function apply_directives( \WP_HTML_Tag_Processor $processor, array $block ): void;

	/**
	 * The Interactivity API store namespace for this action.
	 *
	 * Defaults to one store per action id. Renderers that serve several
	 * action ids from a single store (the query actions all live in
	 * `block-actions/query`) override this.
	 *
	 * @since 3.1.0
	 *
	 * @param string $action_id The action identifier.
	 * @return string The `data-wp-interactive` namespace.
	 */
	public function get_namespace( string $action_id ): string {
		return 'block-actions/' . $action_id;
	}

	/**
	 * Post-process the full HTML to add directives to child elements.
	 *
	 * Override this for complex actions (like carousel) that need
	 * directives on nested elements.
	 *
	 * @since 2.0.0
	 *
	 * @param string $html The full block HTML after initial directive injection.
	 * @return string Modified HTML with child directives added.
	 */
	public function post_process_html( string $html ): string {
		return $html;
	}

	/**
	 * Enqueue the view script module for this action.
	 *
	 * The webpack build emits ES modules for the Interactivity API view
	 * stores. They import '@wordpress/interactivity' and must be
	 * registered with wp_enqueue_script_module() so core resolves the
	 * external module import to its registered runtime.
	 *
	 * @since 2.0.0
	 *
	 * @param string $action_id The action identifier.
	 * @return void
	 */
	public function enqueue_view_script( string $action_id ): void {
		$module_id  = "block-actions/{$action_id}-view";
		$js_path    = "build/actions/{$action_id}/view.js";
		$asset_path = "build/actions/{$action_id}/view.asset.php";

		if ( ! file_exists( DIR . $js_path ) ) {
			return;
		}

		$asset = file_exists( DIR . $asset_path )
			? include DIR . $asset_path
			: array(
				'dependencies' => array( '@wordpress/interactivity' ),
				'version'      => filemtime( DIR . $js_path ),
			);

		wp_enqueue_script_module(
			$module_id,
			URL . $js_path,
			$asset['dependencies'],
			$asset['version']
		);
	}

	/**
	 * Enqueue the action's minimal functional stylesheet, if one ships.
	 *
	 * Action CSS lives in `assets/actions/{action_id}.css`. The primary
	 * enqueue happens early on `enqueue_block_assets` (see
	 * `Block_Actions\enqueue_action_styles()`) so the CSS lands in the
	 * document <head> and reaches the editor iframe. This render-time
	 * call is the FALLBACK for contexts the head-time content scan can't
	 * see — actions living in template parts, `do_blocks()` output, or
	 * feeds — where a late stylesheet still beats none. The shared handle
	 * makes the second call a no-op when the head pass already ran.
	 *
	 * @since 3.0.0
	 *
	 * @param string $action_id The action identifier.
	 * @return void
	 */
	public function enqueue_view_style( string $action_id ): void {
		$css_path = "assets/actions/{$action_id}.css";

		if ( ! file_exists( DIR . $css_path ) ) {
			return;
		}

		$handle = "block-actions-{$action_id}";
		wp_enqueue_style(
			$handle,
			URL . $css_path,
			array(),
			(string) filemtime( DIR . $css_path )
		);
		// Registering the file path lets core inline these tiny
		// stylesheets into <head> (wp_maybe_inline_styles) when possible.
		wp_style_add_data( $handle, 'path', DIR . $css_path );
	}
}
