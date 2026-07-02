<?php
/**
 * Trigger × behavior model tests: tuple parsing/validation, trigger
 * directive injection, transformer byte-identity for the simple case,
 * and kses survival of the JSON attribute (spike #2 as regression).
 *
 * @package Block_Actions
 */

use Block_Actions\Interactions;
use Block_Actions\Directive_Transformer;
use Block_Actions\Renderers\Modal_Toggle;

class Test_Interactions extends WP_UnitTestCase {

	/* ---- parse() ---- */

	public function test_absent_attribute_yields_default_click(): void {
		$tuple = Interactions::parse( null, 'modal-toggle' );
		$this->assertSame( 'click', $tuple['trigger'] );
		$this->assertSame( array(), $tuple['conditions'] );
	}

	public function test_valid_tuple_parses(): void {
		$raw   = wp_json_encode(
			array(
				array(
					'action'     => 'modal-toggle',
					'trigger'    => 'timer',
					'delay'      => 2500,
					'conditions' => array(
						'minWidth'      => 782,
						'reducedMotion' => 'skip',
					),
				),
			)
		);
		$tuple = Interactions::parse( $raw, 'modal-toggle' );
		$this->assertSame( 'timer', $tuple['trigger'] );
		$this->assertSame( 2500, $tuple['delay'] );
		$this->assertSame( 782, $tuple['conditions']['minWidth'] );
		$this->assertSame( 'skip', $tuple['conditions']['reducedMotion'] );
	}

	public function test_unknown_trigger_falls_back_to_click(): void {
		$raw   = wp_json_encode( array( array( 'action' => 'x', 'trigger' => 'shake' ) ) );
		$tuple = Interactions::parse( $raw, 'x' );
		$this->assertSame( 'click', $tuple['trigger'] );
	}

	public function test_undeclared_trigger_falls_back_to_click(): void {
		$raw   = wp_json_encode( array( array( 'action' => 'x', 'trigger' => 'timer' ) ) );
		$tuple = Interactions::parse( $raw, 'x', array( 'click', 'hover' ) );
		$this->assertSame( 'click', $tuple['trigger'] );
	}

	public function test_unknown_condition_keys_are_dropped(): void {
		$raw   = wp_json_encode(
			array(
				array(
					'action'     => 'x',
					'trigger'    => 'load',
					'conditions' => array(
						'minWidth'  => '600px junk',
						'loggedIn'  => true,
						'evil'      => '<script>',
					),
				),
			)
		);
		$tuple = Interactions::parse( $raw, 'x' );
		$this->assertSame( array( 'minWidth' => 600 ), $tuple['conditions'] );
	}

	public function test_malformed_json_and_wrong_action_yield_default(): void {
		$this->assertSame( 'click', Interactions::parse( '{not json', 'x' )['trigger'] );
		$raw = wp_json_encode( array( array( 'action' => 'other', 'trigger' => 'timer' ) ) );
		$this->assertSame( 'click', Interactions::parse( $raw, 'x' )['trigger'] );
	}

	/* ---- apply_trigger() ---- */

	private function apply( array $tuple ): array {
		$p = new \WP_HTML_Tag_Processor( '<button data-action="t">x</button>' );
		$p->next_tag();
		$engine = Interactions::apply_trigger( $p, 'block-actions/t', 'actions.go', $tuple );
		return array( $engine, $p->get_updated_html() );
	}

	public function test_click_no_conditions_is_direct_and_engineless(): void {
		list( $engine, $html ) = $this->apply(
			array(
				'trigger'    => 'click',
				'delay'      => 4000,
				'conditions' => array(),
			)
		);
		$this->assertFalse( $engine );
		$this->assertStringContainsString( 'data-wp-on--click="actions.go"', $html );
		$this->assertStringNotContainsString( 'data-ba-', $html );
	}

	public function test_hover_always_pairs_focus(): void {
		list( $engine, $html ) = $this->apply(
			array(
				'trigger'    => 'hover',
				'delay'      => 4000,
				'conditions' => array(),
			)
		);
		$this->assertFalse( $engine );
		$this->assertStringContainsString( 'data-wp-on--mouseenter="actions.go"', $html );
		$this->assertStringContainsString( 'data-wp-on--focusin="actions.go"', $html );
	}

	public function test_timer_routes_through_the_engine(): void {
		list( $engine, $html ) = $this->apply(
			array(
				'trigger'    => 'timer',
				'delay'      => 2500,
				'conditions' => array(),
			)
		);
		$this->assertTrue( $engine );
		$this->assertStringContainsString( 'data-ba-entry="block-actions/t::actions.go"', $html );
		$this->assertStringContainsString( 'data-ba-trigger="timer"', $html );
		$this->assertStringContainsString( 'data-ba-delay="2500"', $html );
		$this->assertStringContainsString( 'data-wp-init--ba-trigger="block-actions/interactions::callbacks.initTrigger"', $html );
	}

	public function test_conditioned_click_routes_through_the_engine(): void {
		list( $engine, $html ) = $this->apply(
			array(
				'trigger'    => 'click',
				'delay'      => 4000,
				'conditions' => array(
					'minWidth'      => 782,
					'reducedMotion' => 'skip',
				),
			)
		);
		$this->assertTrue( $engine );
		$this->assertStringContainsString( 'data-wp-on--click="block-actions/interactions::actions.dispatch"', $html );
		$this->assertStringContainsString( 'data-ba-min-width="782"', $html );
		$this->assertStringContainsString( 'data-ba-reduced-motion="skip"', $html );
	}

	/* ---- Transformer integration ---- */

	public function test_simple_case_output_is_unchanged_by_the_migration(): void {
		// The default (click, no conditions) must compile to exactly what
		// renderers used to hardcode — the fast path is byte-stable.
		$transformer = new Directive_Transformer();
		$transformer->register_renderer( 'modal-toggle', new Modal_Toggle() );

		$out = $transformer->transform(
			'<button data-action="modal-toggle" data-modal="m">Open</button>',
			array(
				'blockName' => 'core/button',
				'attrs'     => array(),
			)
		);

		$this->assertStringContainsString( 'data-wp-on--click="actions.toggle"', $out );
		$this->assertStringNotContainsString( 'data-ba-', $out );
		$this->assertStringNotContainsString( 'block-actions/interactions', $out );
	}

	public function test_rich_tuple_swaps_the_trigger_via_transformer(): void {
		$transformer = new Directive_Transformer();
		$transformer->register_renderer( 'modal-toggle', new Modal_Toggle() );

		$tuple = wp_json_encode( array( array( 'action' => 'modal-toggle', 'trigger' => 'timer', 'delay' => 3000 ) ) );
		$out   = $transformer->transform(
			'<button data-action="modal-toggle" data-modal="m" data-interactions=\'' . $tuple . '\'>Open</button>',
			array(
				'blockName' => 'core/button',
				'attrs'     => array(),
			)
		);

		$this->assertStringNotContainsString( 'data-wp-on--click="actions.toggle"', $out );
		$this->assertStringContainsString( 'data-ba-entry="block-actions/modal-toggle::actions.toggle"', $out );
		$this->assertStringContainsString( 'data-ba-delay="3000"', $out );
	}

	public function test_structural_actions_are_untouched_by_trigger_wiring(): void {
		$carousel = new Block_Actions\Renderers\Carousel();
		$this->assertNull( $carousel->get_entry_action( 'carousel' ) );
	}

	/* ---- kses (spike #2 regression) ---- */

	public function test_data_interactions_survives_kses_semantically(): void {
		$json = wp_json_encode(
			array(
				array(
					'action'     => 'modal-toggle',
					'trigger'    => 'timer',
					'conditions' => array( 'minWidth' => 782 ),
				),
			)
		);
		$html = '<div data-interactions=\'' . $json . '\'><p>x</p></div>';

		// kses entity-encodes the quotes (Contributor/Author saves)…
		$ksesed = wp_kses_post( $html );
		$this->assertStringContainsString( 'data-interactions', $ksesed );

		// …and WP_HTML_Tag_Processor decodes the value back byte-identical.
		$p = new \WP_HTML_Tag_Processor( $ksesed );
		$p->next_tag();
		$this->assertSame( $json, $p->get_attribute( 'data-interactions' ) );
		$this->assertSame( 'timer', Interactions::parse( $p->get_attribute( 'data-interactions' ), 'modal-toggle' )['trigger'] );
	}
}
