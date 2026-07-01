<?php
/**
 * Per-renderer tests: initial context, root directives, and child
 * post-processing.
 *
 * @package Block_Actions
 */

use Block_Actions\Action_Renderer;
use Block_Actions\Renderers\Carousel;
use Block_Actions\Renderers\Modal_Toggle;
use Block_Actions\Renderers\Toggle_Visibility;
use Block_Actions\Renderers\Scroll_To_Top;
use Block_Actions\Renderers\Smooth_Scroll;
use Block_Actions\Renderers\Copy_To_Clipboard;

class Test_Renderers extends WP_UnitTestCase {

	/**
	 * Position a processor at the root element, run context + directives,
	 * and return [ context, updated HTML ].
	 */
	private function run_root( Action_Renderer $renderer, string $html ): array {
		$p = new \WP_HTML_Tag_Processor( $html );
		$p->next_tag();
		$block = array(
			'blockName' => 'core/button',
			'attrs'     => array(),
		);
		$ctx  = $renderer->get_initial_context( $p, $block );
		$renderer->apply_directives( $p, $block );
		return array( $ctx, $p->get_updated_html() );
	}

	/* ---- Carousel ---- */

	public function test_carousel_wrap_around_defaults_true(): void {
		list( $ctx ) = $this->run_root( new Carousel(), '<div class="carousel-container"></div>' );
		$this->assertTrue( $ctx['wrapAround'] );
		$this->assertSame( 0, $ctx['currentIndex'] );
	}

	public function test_carousel_wrap_around_false_from_attribute(): void {
		list( $ctx ) = $this->run_root( new Carousel(), '<div data-wrap-around="false" class="carousel-container"></div>' );
		$this->assertFalse( $ctx['wrapAround'] );
	}

	/**
	 * Hand-authored / pattern markup may spell the toggle as off/no/0 (any
	 * case). All disable wrap; an unrelated value leaves the default on.
	 *
	 * @dataProvider data_wrap_around_spellings
	 */
	public function test_carousel_wrap_around_spellings( string $value, bool $expected ): void {
		list( $ctx ) = $this->run_root( new Carousel(), '<div data-wrap-around="' . $value . '" class="carousel-container"></div>' );
		$this->assertSame( $expected, $ctx['wrapAround'] );
	}

	public function data_wrap_around_spellings(): array {
		return array(
			'off'      => array( 'off', false ),
			'no'       => array( 'no', false ),
			'zero'     => array( '0', false ),
			'False'    => array( 'False', false ),
			'unknown'  => array( 'maybe', true ),
			'explicit' => array( 'true', true ),
		);
	}

	public function test_carousel_root_directives(): void {
		list( , $html ) = $this->run_root( new Carousel(), '<div class="carousel-container"></div>' );
		$this->assertStringContainsString( 'data-wp-init="callbacks.init"', $html );
		$this->assertStringContainsString( 'data-wp-on--keydown="actions.handleKeydown"', $html );
	}

	public function test_carousel_post_process_children(): void {
		$html = '<div class="carousel-container">'
			. '<div class="carousel-slider">'
			. '<div class="carousel-slide"></div><div class="carousel-slide"></div>'
			. '</div>'
			. '<button class="carousel-button-left"></button>'
			. '<button class="carousel-button-right"></button>'
			. '<div class="carousel-thumbnail"></div><div class="carousel-thumbnail"></div>'
			. '</div>';
		$out = ( new Carousel() )->post_process_html( $html );

		// Container a11y.
		$this->assertStringContainsString( 'role="region"', $out );
		$this->assertStringContainsString( 'tabindex="0"', $out );
		// Navigation buttons (real <button> → native disabled binding).
		$this->assertStringContainsString( 'data-wp-on--click="actions.prevSlide"', $out );
		$this->assertStringContainsString( 'data-wp-bind--disabled="state.isPrevDisabled"', $out );
		$this->assertStringContainsString( 'data-wp-on--click="actions.nextSlide"', $out );
		$this->assertStringContainsString( 'data-wp-bind--disabled="state.isNextDisabled"', $out );
		// Slides: numbered "Slide X of Y" labels + active binding.
		$this->assertStringContainsString( 'Slide 1 of 2', $out );
		$this->assertStringContainsString( 'Slide 2 of 2', $out );
		$this->assertStringContainsString( 'data-wp-class--active="state.isSlideActive"', $out );
		// Slider transform + thumbnails.
		$this->assertStringContainsString( 'data-wp-style--transform="state.sliderTransform"', $out );
		$this->assertStringContainsString( 'data-wp-on--click="actions.goToSlide"', $out );
	}

	public function test_carousel_non_button_nav_uses_class_binding(): void {
		$html = '<div class="carousel-container"><div class="carousel-button-left"></div></div>';
		$out  = ( new Carousel() )->post_process_html( $html );
		// A non-button control can't use the disabled attribute, so it gets
		// a class + aria-disabled binding and a button role instead.
		$this->assertStringContainsString( 'data-wp-class--disabled="state.isPrevDisabled"', $out );
		$this->assertStringContainsString( 'data-wp-bind--aria-disabled="state.isPrevDisabled"', $out );
		$this->assertStringContainsString( 'role="button"', $out );
	}

	public function test_carousel_core_button_wrapper_wires_inner_control(): void {
		// Real core/button markup: the author-facing class lands on the
		// wrapper div; the interactive control is the inner <button>.
		$html = '<div class="carousel-container">'
			. '<div class="wp-block-button carousel-button-left">'
			. '<button type="button" class="wp-block-button__link">Previous</button>'
			. '</div>'
			. '</div>';
		$out  = ( new Carousel() )->post_process_html( $html );

		// The inner <button> carries the directives + native disabled binding.
		$p         = new \WP_HTML_Tag_Processor( $out );
		$found_btn = false;
		while ( $p->next_tag() ) {
			if ( $p->has_class( 'wp-block-button' ) && ! $p->has_class( 'wp-block-button__link' ) ) {
				// The wrapper must stay inert: no second tab stop, no
				// nested-interactive role, no click handler.
				$this->assertNull( $p->get_attribute( 'role' ) );
				$this->assertNull( $p->get_attribute( 'tabindex' ) );
				$this->assertNull( $p->get_attribute( 'data-wp-on--click' ) );
			}
			if ( 'BUTTON' === $p->get_tag() ) {
				$found_btn = true;
				$this->assertSame( 'actions.prevSlide', $p->get_attribute( 'data-wp-on--click' ) );
				$this->assertSame( 'state.isPrevDisabled', $p->get_attribute( 'data-wp-bind--disabled' ) );
				$this->assertSame( 'Previous slide', $p->get_attribute( 'aria-label' ) );
			}
		}
		$this->assertTrue( $found_btn );
	}

	/* ---- Modal Toggle ---- */

	public function test_modal_toggle_context_and_directives(): void {
		list( $ctx, $html ) = $this->run_root( new Modal_Toggle(), '<button data-modal="my-modal">Open</button>' );
		$this->assertSame( 'my-modal', $ctx['modalId'] );
		$this->assertFalse( $ctx['isOpen'] );
		$this->assertStringContainsString( 'data-wp-on--click="actions.toggle"', $html );
		$this->assertStringContainsString( 'data-wp-bind--aria-expanded="context.isOpen"', $html );
		$this->assertStringContainsString( 'aria-haspopup="dialog"', $html );
		$this->assertStringContainsString( 'aria-controls="my-modal"', $html );
	}

	/* ---- Toggle Visibility ---- */

	public function test_toggle_visibility_context_directives_and_label(): void {
		$renderer = new Toggle_Visibility();
		list( $ctx, $html ) = $this->run_root( $renderer, '<div data-target="panel"><a class="wp-block-button__link">x</a></div>' );
		$this->assertSame( 'panel', $ctx['targetId'] );
		$this->assertTrue( $ctx['isVisible'] );
		$this->assertStringContainsString( 'data-wp-bind--aria-controls="context.targetId"', $html );

		$processed = $renderer->post_process_html( $html );
		$this->assertStringContainsString( 'data-wp-text="state.buttonLabel"', $processed );
	}

	/* ---- Scroll To Top / Smooth Scroll (feedback pattern) ---- */

	public function test_scroll_to_top_directives_and_label(): void {
		$renderer = new Scroll_To_Top();
		list( , $html ) = $this->run_root( $renderer, '<div><a>Top</a></div>' );
		$this->assertStringContainsString( 'data-wp-on--click="actions.scrollToTop"', $html );
		$this->assertStringContainsString( 'data-wp-text="state.buttonText"', $renderer->post_process_html( $html ) );
	}

	public function test_smooth_scroll_offset_is_int(): void {
		list( $ctx ) = $this->run_root( new Smooth_Scroll(), '<div data-target="sec" data-offset="80"><a>Go</a></div>' );
		$this->assertSame( 'sec', $ctx['targetId'] );
		$this->assertSame( 80, $ctx['offset'] );
	}

	/* ---- Copy To Clipboard ---- */

	public function test_copy_to_clipboard_context_and_feedback_bindings(): void {
		$renderer = new Copy_To_Clipboard();
		list( $ctx, $html ) = $this->run_root( $renderer, '<div data-copy-text="hi"><a>Copy</a></div>' );
		$this->assertSame( 'hi', $ctx['copyText'] );
		$this->assertSame( 'idle', $ctx['status'] );

		$processed = $renderer->post_process_html( $html );
		$this->assertStringContainsString( 'data-wp-text="state.buttonText"', $processed );
		$this->assertStringContainsString( 'data-wp-style--background-color="state.backgroundColor"', $processed );
	}
}
