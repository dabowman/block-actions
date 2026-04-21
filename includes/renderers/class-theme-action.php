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
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	public function apply_directives( \WP_HTML_Tag_Processor $processor, array $block ): void {
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
		$processor->set_attribute( 'data-wp-on--click', 'actions.handleClick' );
	}
}
