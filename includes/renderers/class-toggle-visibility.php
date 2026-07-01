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
	 * Whether the block currently being rendered is a core/button.
	 *
	 * Set in apply_directives() (which receives the parsed block) and
	 * consumed by post_process_html() (which only receives HTML). The
	 * transformer calls both sequentially for the same block, so this
	 * never leaks across blocks.
	 *
	 * @since 3.0.0
	 *
	 * @var bool
	 */
	private bool $is_button_block = false;

	/**
	 * Whether the trigger declares its target as initially hidden.
	 *
	 * The renderer can't see the target block (it lives elsewhere on the
	 * page), so a pre-collapsed panel is declared on the trigger via
	 * `data-start-hidden="true"` — the "Panel starts hidden" toggle in
	 * the editor.
	 *
	 * @since 3.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @return bool True when the target starts hidden.
	 */
	private function starts_hidden( \WP_HTML_Tag_Processor $processor ): bool {
		$hint = $processor->get_attribute( 'data-start-hidden' );
		return is_string( $hint )
			&& in_array( strtolower( $hint ), array( 'true', '1', 'yes', 'on' ), true );
	}

	/**
	 * Get initial context for the toggle-visibility action.
	 *
	 * `isVisible` seeds from the trigger's `data-start-hidden` hint so a
	 * pre-collapsed panel isn't announced as expanded at first paint
	 * (and the label getter derives "Show" instead of flashing "Hide").
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
			'isVisible' => ! $this->starts_hidden( $processor ),
			'showLabel' => __( 'Show', 'block-actions' ),
			'hideLabel' => __( 'Hide', 'block-actions' ),
		);
	}

	/**
	 * Apply directives to the root element.
	 *
	 * The aria-expanded and aria-controls attributes are bound
	 * declaratively so they stay in sync with context.isVisible without
	 * imperative DOM writes — and ALSO set literally, because bindings
	 * only take effect at hydration and the static server HTML must
	 * already carry the truth (non-JS visitors and the first paint see
	 * the raw attributes).
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

		$processor->set_attribute(
			'aria-expanded',
			$this->starts_hidden( $processor ) ? 'false' : 'true'
		);
		$target = $processor->get_attribute( 'data-target' );
		if ( is_string( $target ) && '' !== $target ) {
			$processor->set_attribute( 'aria-controls', $target );
		}

		$this->is_button_block = 'core/button' === ( $block['blockName'] ?? '' );
	}

	/**
	 * Apply data-wp-text to the trigger's own control so the button label
	 * swaps reactively when context.isVisible flips.
	 *
	 * The binding targets the block's OWN control only: the root element
	 * itself when it is an <a>/<button> (hand-authored triggers), or the
	 * inner control of a core/button block. A core/group trigger keeps
	 * every authored label — binding "the first descendant button" would
	 * hijack the label of an unrelated nested CTA.
	 *
	 * @since 2.1.0
	 *
	 * @param string $html The block HTML after initial directive injection.
	 * @return string Modified HTML.
	 */
	public function post_process_html( string $html ): string {
		$p = new \WP_HTML_Tag_Processor( $html );
		if ( ! $p->next_tag() ) {
			return $html;
		}

		$tag = $p->get_tag();
		if ( 'A' === $tag || 'BUTTON' === $tag ) {
			$p->set_attribute( 'data-wp-text', 'state.buttonLabel' );
			return $p->get_updated_html();
		}

		if ( ! $this->is_button_block ) {
			return $html;
		}

		while ( $p->next_tag() ) {
			$tag = $p->get_tag();
			if ( 'A' === $tag || 'BUTTON' === $tag ) {
				$p->set_attribute( 'data-wp-text', 'state.buttonLabel' );
				break;
			}
		}
		return $p->get_updated_html();
	}
}
