<?php
/**
 * Carousel action renderer.
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
 * Carousel renderer.
 *
 * @since 2.0.0
 */
class Carousel extends Action_Renderer {

	/**
	 * Get initial context for the carousel action.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		return array(
			'currentIndex' => 0,
			'isAnimating'  => false,
			'totalSlides'  => 0,
			'wrapAround'   => true,
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
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
		$processor->set_attribute( 'data-wp-on--keydown', 'actions.handleKeydown' );
	}

	/**
	 * Post-process HTML to add directives to carousel child elements.
	 *
	 * @since 2.0.0
	 *
	 * @param string $html The block HTML after initial processing.
	 * @return string Modified HTML with child directives.
	 */
	public function post_process_html( string $html ): string {
		$p           = new \WP_HTML_Tag_Processor( $html );
		$slide_index = 0;
		$thumb_index = 0;

		// Single pass: match each tag by class and apply appropriate directives.
		while ( $p->next_tag() ) {
			if ( $p->has_class( 'carousel-button-left' ) ) {
				$p->set_attribute( 'data-wp-on--click', 'actions.prevSlide' );
			} elseif ( $p->has_class( 'carousel-button-right' ) ) {
				$p->set_attribute( 'data-wp-on--click', 'actions.nextSlide' );
			} elseif ( $p->has_class( 'carousel-slide' ) ) {
				$p->set_attribute(
					'data-wp-context',
					wp_json_encode( array( 'slideIndex' => $slide_index ), JSON_HEX_TAG | JSON_HEX_AMP )
				);
				$p->set_attribute( 'data-wp-class--active', 'state.isSlideActive' );
				$p->set_attribute( 'data-wp-bind--aria-hidden', 'state.isSlideAriaHidden' );
				$slide_index++;
			} elseif ( $p->has_class( 'carousel-thumbnail' ) ) {
				$p->set_attribute(
					'data-wp-context',
					wp_json_encode( array( 'slideIndex' => $thumb_index ), JSON_HEX_TAG | JSON_HEX_AMP )
				);
				$p->set_attribute( 'data-wp-on--click', 'actions.goToSlide' );
				$p->set_attribute( 'data-wp-class--active', 'state.isSlideActive' );
				$thumb_index++;
			} elseif ( $p->has_class( 'carousel-slider' ) ) {
				$p->set_attribute( 'data-wp-style--transform', 'state.sliderTransform' );
			}
		}

		return $p->get_updated_html();
	}
}
