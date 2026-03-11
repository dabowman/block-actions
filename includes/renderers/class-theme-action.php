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

		if ( ! empty( $attrs['customData'] ) ) {
			$context['customData'] = sanitize_text_field( $attrs['customData'] );
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
