<?php
/**
 * Copy to Clipboard action renderer.
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
 * Copy to Clipboard renderer.
 *
 * @since 2.0.0
 */
class Copy_To_Clipboard extends Action_Renderer {

	/**
	 * Get initial context for the copy-to-clipboard action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		$copy_text = $processor->get_attribute( 'data-copy-text' );
		return array(
			'copyText'       => is_string( $copy_text ) ? $copy_text : '',
			'originalText'   => '',
			'status'         => 'idle',
			'copiedText'     => __( 'Copied!', 'block-actions' ),
			'copyFailedText' => __( 'Copy failed', 'block-actions' ),
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
		$processor->set_attribute( 'data-wp-on--click', 'actions.copy' );
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
	}

	/**
	 * Bind the anchor's text and background-color to state getters so
	 * feedback renders reactively from context.status without imperative
	 * DOM mutation from the store.
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
				$p->set_attribute( 'data-wp-style--background-color', 'state.backgroundColor' );
				break;
			}
		}
		return $p->get_updated_html();
	}
}
