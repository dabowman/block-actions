<?php
/**
 * Modal Toggle action renderer.
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
 * Modal Toggle renderer.
 *
 * @since 2.0.0
 */
class Modal_Toggle extends Action_Renderer {

	/**
	 * Get initial context for the modal-toggle action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		$modal = $processor->get_attribute( 'data-modal' );
		return array(
			'modalId' => is_string( $modal ) ? $modal : '',
			'isOpen'  => false,
		);
	}

	/**
	 * Apply directives to the root element.
	 *
	 * Static a11y attributes on the trigger are server-rendered:
	 * - aria-haspopup="dialog" flags the control as a dialog opener.
	 * - aria-controls points at the modal element id.
	 * - aria-expanded is bound reactively to context.isOpen.
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
		$processor->set_attribute( 'data-wp-bind--aria-expanded', 'context.isOpen' );
		$processor->set_attribute( 'aria-haspopup', 'dialog' );

		$modal_id = $processor->get_attribute( 'data-modal' );
		if ( is_string( $modal_id ) && '' !== $modal_id ) {
			$processor->set_attribute( 'aria-controls', $modal_id );
		}
	}
}
