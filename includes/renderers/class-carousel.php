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
	 * Inject directives and accessibility attributes onto carousel
	 * child elements. Two passes: the first counts slides/thumbs so
	 * we can emit "Slide X of Y" labels; the second applies directives
	 * and ARIA attributes.
	 *
	 * @since 2.0.0
	 *
	 * @param string $html The block HTML after initial directive injection.
	 * @return string Modified HTML with child directives and a11y attrs.
	 */
	public function post_process_html( string $html ): string {
		$pre          = new \WP_HTML_Tag_Processor( $html );
		$total_slides = 0;
		while ( $pre->next_tag() ) {
			if ( $pre->has_class( 'carousel-slide' ) ) {
				$total_slides++;
			}
		}

		$p             = new \WP_HTML_Tag_Processor( $html );
		$slide_index   = 0;
		$thumb_index   = 0;
		$container_set = false;

		while ( $p->next_tag() ) {
			if ( ! $container_set && $p->has_class( 'carousel-container' ) ) {
				$p->set_attribute( 'role', 'region' );
				$p->set_attribute( 'aria-label', __( 'Image carousel', 'block-actions' ) );
				if ( null === $p->get_attribute( 'tabindex' ) ) {
					$p->set_attribute( 'tabindex', '0' );
				}
				$container_set = true;
				continue;
			}

			if ( $p->has_class( 'carousel-button-left' ) ) {
				$p->set_attribute( 'data-wp-on--click', 'actions.prevSlide' );
				$p->set_attribute( 'aria-label', __( 'Previous slide', 'block-actions' ) );
				if ( 'BUTTON' !== $p->get_tag() ) {
					$p->set_attribute( 'role', 'button' );
					if ( null === $p->get_attribute( 'tabindex' ) ) {
						$p->set_attribute( 'tabindex', '0' );
					}
				}
				continue;
			}

			if ( $p->has_class( 'carousel-button-right' ) ) {
				$p->set_attribute( 'data-wp-on--click', 'actions.nextSlide' );
				$p->set_attribute( 'aria-label', __( 'Next slide', 'block-actions' ) );
				if ( 'BUTTON' !== $p->get_tag() ) {
					$p->set_attribute( 'role', 'button' );
					if ( null === $p->get_attribute( 'tabindex' ) ) {
						$p->set_attribute( 'tabindex', '0' );
					}
				}
				continue;
			}

			if ( $p->has_class( 'carousel-slide' ) ) {
				$p->set_attribute(
					'data-wp-context',
					wp_json_encode( array( 'slideIndex' => $slide_index ), JSON_HEX_TAG | JSON_HEX_AMP )
				);
				$p->set_attribute( 'data-wp-class--active', 'state.isSlideActive' );
				$p->set_attribute( 'data-wp-bind--aria-hidden', 'state.isSlideAriaHidden' );
				$p->set_attribute( 'role', 'tabpanel' );
				$p->set_attribute( 'aria-roledescription', __( 'slide', 'block-actions' ) );
				/* translators: 1: current slide index (1-based), 2: total slides */
				$p->set_attribute( 'aria-label', sprintf( __( 'Slide %1$d of %2$d', 'block-actions' ), $slide_index + 1, $total_slides ) );
				$slide_index++;
				continue;
			}

			if ( $p->has_class( 'carousel-thumbnail' ) ) {
				$p->set_attribute(
					'data-wp-context',
					wp_json_encode( array( 'slideIndex' => $thumb_index ), JSON_HEX_TAG | JSON_HEX_AMP )
				);
				$p->set_attribute( 'data-wp-on--click', 'actions.goToSlide' );
				$p->set_attribute( 'data-wp-class--active', 'state.isSlideActive' );
				$p->set_attribute( 'role', 'tab' );
				/* translators: %d: slide index (1-based) */
				$p->set_attribute( 'aria-label', sprintf( __( 'Show slide %d', 'block-actions' ), $thumb_index + 1 ) );
				if ( null === $p->get_attribute( 'tabindex' ) ) {
					$p->set_attribute( 'tabindex', '0' );
				}
				$thumb_index++;
				continue;
			}

			if ( $p->has_class( 'carousel-slider' ) ) {
				$p->set_attribute( 'data-wp-style--transform', 'state.sliderTransform' );
			}
		}

		return $p->get_updated_html();
	}
}
