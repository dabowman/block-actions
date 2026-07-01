<?php
/**
 * Generic theme action renderer.
 *
 * Used for theme-provided actions that don't have a dedicated renderer.
 * Applies generic init and click directives and forwards data-* attributes as context.
 *
 * @since 2.0.0
 * @package Block_Actions
 */

namespace Block_Actions\Renderers;

use Block_Actions\Action_Renderer;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Theme Action renderer.
 *
 * @since 2.0.0
 */
class Theme_Action extends Action_Renderer {

	/**
	 * Get initial context for a generic theme action.
	 *
	 * Forwards block attributes as context.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		$context = array();
		$attrs   = $block['attrs'] ?? array();

		if ( isset( $attrs['customData'] ) && is_scalar( $attrs['customData'] ) ) {
			$context['customData'] = is_string( $attrs['customData'] )
				? sanitize_text_field( $attrs['customData'] )
				: $attrs['customData'];
		}

		// Forward actionData fields as context so theme actions can read
		// data set in the editor. Keys are validated (not normalised) so
		// camelCase identifiers survive — theme JS expects exact keys.
		if ( ! empty( $attrs['actionData'] ) && is_array( $attrs['actionData'] ) ) {
			foreach ( $attrs['actionData'] as $key => $value ) {
				if ( ! is_string( $key ) || 1 !== preg_match( '/^[A-Za-z_][A-Za-z0-9_]*$/', $key ) ) {
					continue;
				}
				if ( ! is_scalar( $value ) ) {
					continue;
				}
				$context[ $key ] = is_string( $value )
					? sanitize_text_field( $value )
					: $value;
			}
		}

		return $context;
	}

	/**
	 * Apply generic directives to the root element.
	 *
	 * Every theme action gets init + click. A manifest (`{id}.json`) may
	 * declare additional `data-wp-*` directives — e.g. keydown handlers or
	 * extra bindings — which are validated at discovery time and injected
	 * here. The action id is read back off the element's data-action so a
	 * single shared renderer instance can serve every theme action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	public function apply_directives( \WP_HTML_Tag_Processor $processor, array $block ): void {
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
		$processor->set_attribute( 'data-wp-on--click', 'actions.handleClick' );

		$action_id = $processor->get_attribute( 'data-action' );
		if ( ! is_string( $action_id ) ) {
			return;
		}

		$action = $this->find_action( $action_id );
		if ( null === $action ) {
			return;
		}

		$directives = $action['manifest']['directives'] ?? array();
		foreach ( $directives as $name => $value ) {
			$processor->set_attribute( $name, $value );
		}
	}

	/**
	 * Enqueue the theme action's ES script module on demand.
	 *
	 * Theme action files live in the active theme (not the build/
	 * directory), so the generic build-path lookup in the parent doesn't
	 * apply. Resolve the discovered id → URL map and enqueue the matching
	 * module during render, so a theme's action JS only loads on pages
	 * where a block actually uses it.
	 *
	 * @since 3.0.0
	 *
	 * @param string $action_id The action identifier.
	 * @return void
	 */
	public function enqueue_view_script( string $action_id ): void {
		$action = $this->find_action( $action_id );
		if ( null === $action ) {
			return;
		}

		$version = file_exists( $action['path'] )
			? (string) filemtime( $action['path'] )
			: \Block_Actions\VERSION;

		wp_enqueue_script_module(
			'block-actions-theme-' . $action_id,
			$action['url'],
			array( '@wordpress/interactivity' ),
			$version
		);
	}

	/**
	 * Enqueue the theme action's sidecar stylesheet, if one ships.
	 *
	 * The parent implementation looks in the plugin's own
	 * `assets/actions/` — a location a theme action can never occupy.
	 * Theme actions instead ship CSS as a sidecar next to the action
	 * file (`my-action.js` + `my-action.css`), resolved from the same
	 * discovered path/url the script enqueue uses.
	 *
	 * @since 3.0.0
	 *
	 * @param string $action_id The action identifier.
	 * @return void
	 */
	public function enqueue_view_style( string $action_id ): void {
		$action = $this->find_action( $action_id );
		if ( null === $action ) {
			return;
		}

		$css_path = substr( $action['path'], 0, -3 ) . '.css';
		if ( ! file_exists( $css_path ) ) {
			return;
		}

		$handle = "block-actions-{$action_id}";
		wp_enqueue_style(
			$handle,
			substr( $action['url'], 0, -3 ) . '.css',
			array(),
			(string) filemtime( $css_path )
		);
		wp_style_add_data( $handle, 'path', $css_path );
	}

	/**
	 * Resolve a discovered theme action by its canonical ID.
	 *
	 * Builds an id → action map once per request from the (already cached)
	 * discovery list so the on-demand enqueue is O(1) per render rather than
	 * re-scanning the list for every block that carries a theme action.
	 *
	 * @since 3.0.0
	 *
	 * @param string $action_id The canonical action identifier.
	 * @return array|null The discovered action entry, or null if not found.
	 */
	private function find_action( string $action_id ): ?array {
		static $map = null;

		if ( null === $map ) {
			$map = array();
			foreach ( \Block_Actions\discover_theme_actions() as $action ) {
				// Discovery already de-duplicates IDs, so the first writer
				// wins and this can't clobber a distinct action.
				if ( ! isset( $map[ $action['id'] ] ) ) {
					$map[ $action['id'] ] = $action;
				}
			}
		}

		return $map[ $action_id ] ?? null;
	}
}
