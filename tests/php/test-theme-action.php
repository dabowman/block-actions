<?php
/**
 * Theme_Action renderer: context forwarding from block attributes.
 *
 * This is the security boundary for theme-provided actions — only
 * scalar values with identifier-safe keys are forwarded, strings are
 * sanitized, everything else is dropped.
 *
 * @package Block_Actions
 */

use Block_Actions\Renderers\Theme_Action;

class Test_Theme_Action extends WP_UnitTestCase {

	private function context_for( array $attrs ): array {
		$renderer  = new Theme_Action();
		$processor = new \WP_HTML_Tag_Processor( '<div></div>' );
		return $renderer->get_initial_context( $processor, array( 'attrs' => $attrs ) );
	}

	public function test_no_attrs_yields_empty_context(): void {
		$this->assertSame( array(), $this->context_for( array() ) );
	}

	public function test_custom_data_string_is_forwarded_and_sanitized(): void {
		$ctx = $this->context_for( array( 'customData' => '  hook<script>  ' ) );
		$this->assertArrayHasKey( 'customData', $ctx );
		$this->assertStringNotContainsString( '<script>', $ctx['customData'] );
	}

	public function test_camelcase_action_data_key_preserved(): void {
		$ctx = $this->context_for( array( 'actionData' => array( 'wrapAround' => 'true' ) ) );
		// Keys must NOT be lowercased — theme JS reads exact camelCase keys.
		$this->assertArrayHasKey( 'wrapAround', $ctx );
		$this->assertSame( 'true', $ctx['wrapAround'] );
	}

	public function test_invalid_key_is_dropped(): void {
		$ctx = $this->context_for(
			array(
				'actionData' => array(
					'bad-key'   => 'x',  // hyphen — not an identifier.
					'9leading'  => 'y',  // starts with a digit.
					'goodKey'   => 'z',
				),
			)
		);
		$this->assertArrayNotHasKey( 'bad-key', $ctx );
		$this->assertArrayNotHasKey( '9leading', $ctx );
		$this->assertArrayHasKey( 'goodKey', $ctx );
	}

	public function test_non_scalar_value_is_dropped(): void {
		$ctx = $this->context_for(
			array(
				'actionData' => array(
					'arr'    => array( 'nested' ),
					'scalar' => 'kept',
				),
			)
		);
		$this->assertArrayNotHasKey( 'arr', $ctx );
		$this->assertArrayHasKey( 'scalar', $ctx );
	}

	public function test_string_value_is_sanitized(): void {
		$ctx = $this->context_for( array( 'actionData' => array( 'note' => 'hi<script>alert(1)</script>' ) ) );
		$this->assertStringNotContainsString( '<script>', $ctx['note'] );
	}

	public function test_root_directives_applied(): void {
		$renderer  = new Theme_Action();
		$processor = new \WP_HTML_Tag_Processor( '<div data-action="x">y</div>' );
		$processor->next_tag();
		$renderer->apply_directives( $processor, array( 'attrs' => array() ) );
		$html = $processor->get_updated_html();
		$this->assertStringContainsString( 'data-wp-init="callbacks.init"', $html );
		// The click handler is no longer the renderer's job — the
		// transformer wires the trigger from get_entry_action().
		$this->assertStringNotContainsString( 'data-wp-on--click', $html );
		$this->assertSame( 'actions.handleClick', $renderer->get_entry_action( 'x' ) );
	}
}
