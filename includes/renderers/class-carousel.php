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
		// The editor's "Wrap Around" toggle serializes to data-wrap-around
		// ("true"/"false"). Absent attribute means the default: wrap. Common
		// falsy spellings are honored too so hand-authored / pattern markup
		// (data-wrap-around="off") behaves as expected rather than silently
		// enabling wrap.
		$wrap     = $processor->get_attribute( 'data-wrap-around' );
		$wrap_off = is_string( $wrap )
			&& in_array( strtolower( $wrap ), array( 'false', '0', 'no', 'off' ), true );
		return array(
			'currentIndex' => 0,
			'isAnimating'  => false,
			'totalSlides'  => 0,
			'wrapAround'   => ! $wrap_off,
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
				++$total_slides;
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
				$this->set_default_tabindex( $p );
				$container_set = true;
				continue;
			}

			if ( $p->has_class( 'carousel-button-left' ) ) {
				$this->apply_nav_button( $p, 'actions.prevSlide', __( 'Previous slide', 'block-actions' ), 'state.isPrevDisabled' );
				continue;
			}

			if ( $p->has_class( 'carousel-button-right' ) ) {
				$this->apply_nav_button( $p, 'actions.nextSlide', __( 'Next slide', 'block-actions' ), 'state.isNextDisabled' );
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
				++$slide_index;
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
				$this->set_default_tabindex( $p );
				++$thumb_index;
				continue;
			}

			if ( $p->has_class( 'carousel-slider' ) ) {
				$p->set_attribute( 'data-wp-style--transform', 'state.sliderTransform' );
			}
		}

		return $p->get_updated_html();
	}

	/**
	 * Apply navigation directives and disabled-state bindings to a prev/next
	 * control. core/button serializes the author-facing class onto the
	 * wrapper `<div class="wp-block-button">` while the interactive control
	 * is the inner `<button>`/`<a>` — directives, the label, and the native
	 * `disabled` binding belong on the control, so descend to it when the
	 * matched element is that wrapper (the wrapper itself gets no role or
	 * tabindex: it wraps a real control, and a second stop would be a
	 * nested-interactive violation). A real <button> uses the native
	 * `disabled` attribute; any other element gets a button role plus
	 * class + aria-disabled bindings (it can't carry the boolean disabled
	 * attribute).
	 *
	 * @since 3.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $p            Processor positioned at the matched element.
	 * @param string                 $click_action The data-wp-on--click action reference.
	 * @param string                 $label        Accessible label for the control.
	 * @param string                 $disabled     The disabled-state getter reference.
	 * @return void
	 */
	private function apply_nav_button( \WP_HTML_Tag_Processor $p, string $click_action, string $label, string $disabled ): void {
		if ( $p->has_class( 'wp-block-button' ) && ! $p->next_tag() ) {
			return; // Empty button wrapper — nothing to wire.
		}

		$p->set_attribute( 'data-wp-on--click', $click_action );
		$p->set_attribute( 'aria-label', $label );

		if ( 'BUTTON' === $p->get_tag() ) {
			$p->set_attribute( 'data-wp-bind--disabled', $disabled );
			return;
		}

		$p->set_attribute( 'role', 'button' );
		$p->set_attribute( 'data-wp-class--disabled', $disabled );
		$p->set_attribute( 'data-wp-bind--aria-disabled', $disabled );
		$this->set_default_tabindex( $p );
	}

	/**
	 * Make the current element keyboard-focusable unless the author already
	 * set an explicit tabindex. One definition of the default so the
	 * container, thumbnail, and non-button nav branches can't drift.
	 *
	 * @since 3.0.0
	 *
	 * @param \WP_HTML_Tag_Processor $p Processor positioned at the element.
	 * @return void
	 */
	private function set_default_tabindex( \WP_HTML_Tag_Processor $p ): void {
		if ( null === $p->get_attribute( 'tabindex' ) ) {
			$p->set_attribute( 'tabindex', '0' );
		}
	}
}
