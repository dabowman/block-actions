<?php
/**
 * Toggle Visibility action renderer.
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
 * Toggle Visibility renderer.
 *
 * @since 2.0.0
 */
class Toggle_Visibility extends Action_Renderer {

	/**
	 * Get initial context for the toggle-visibility action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		$target = $processor->get_attribute( 'data-target' );
		return array(
			'targetId'  => is_string( $target ) ? $target : '',
			'isVisible' => true,
			'showLabel' => __( 'Show', 'block-actions' ),
			'hideLabel' => __( 'Hide', 'block-actions' ),
		);
	}

	/**
	 * Apply directives to the root element.
	 *
	 * aria-expanded and aria-controls are bound declaratively so they
	 * stay in sync with context.isVisible without imperative DOM writes.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	public function apply_directives( \WP_HTML_Tag_Processor $processor, array $block ): void {
		$processor->set_attribute( 'data-wp-on--click', 'actions.toggle' );
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
		$processor->set_attribute( 'data-wp-bind--aria-expanded', 'context.isVisible' );
		$processor->set_attribute( 'data-wp-bind--aria-controls', 'context.targetId' );
	}

	/**
	 * Apply data-wp-text to the inner anchor so the button label swaps
	 * reactively when context.isVisible flips. If the block has no
	 * anchor (e.g. a core/group toggle), the label stays as authored.
	 *
	 * @since 2.1.0
	 *
	 * @param string $html The block HTML after initial directive injection.
	 * @return string Modified HTML.
	 */
	public function post_process_html( string $html ): string {
		$p = new \WP_HTML_Tag_Processor( $html );
		while ( $p->next_tag() ) {
			if ( 'A' === $p->get_tag() ) {
				$p->set_attribute( 'data-wp-text', 'state.buttonLabel' );
				break;
			}
		}
		return $p->get_updated_html();
	}
}
