<?php
/**
 * Smooth Scroll action renderer.
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
 * Smooth Scroll renderer.
 *
 * @since 2.0.0
 */
class Smooth_Scroll extends Action_Renderer {

	/**
	 * Get initial context for the smooth-scroll action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		$target = $processor->get_attribute( 'data-target' );
		$offset = $processor->get_attribute( 'data-offset' );
		return array(
			'targetId'      => is_string( $target ) ? $target : '',
			'offset'        => is_string( $offset ) ? (int) $offset : 0,
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
		$processor->set_attribute( 'data-wp-on--click', 'actions.scrollToTarget' );
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
	}

	/**
	 * Bind button label to state.buttonText on the inner anchor.
	 *
	 * @since 2.1.0
	 *
	 * @param string $html The block HTML.
	 * @return string Modified HTML.
	 */
	public function post_process_html( string $html ): string {
		$p = new \WP_HTML_Tag_Processor( $html );
		while ( $p->next_tag() ) {
			if ( 'A' === $p->get_tag() ) {
				$p->set_attribute( 'data-wp-text', 'state.buttonText' );
				break;
			}
		}
		return $p->get_updated_html();
	}
}
