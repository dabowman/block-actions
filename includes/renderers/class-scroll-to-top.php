<?php
/**
 * Scroll to Top action renderer.
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
 * Scroll to Top renderer.
 *
 * @since 2.0.0
 */
class Scroll_To_Top extends Action_Renderer {

	/**
	 * Get initial context for the scroll-to-top action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		return array(
			'originalText'  => '',
			'isScrolling'   => false,
			'scrollingText' => __( 'Scrolling...', 'block-actions' ),
		);
	}

	/**
	 * Apply directives to the root element.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	public function apply_directives( \WP_HTML_Tag_Processor $processor, array $block ): void {
		$processor->set_attribute( 'data-wp-on--click', 'actions.scrollToTop' );
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
	}
}
