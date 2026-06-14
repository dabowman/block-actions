<?php
/**
 * Modal Dialog support: the force_dialog_for_modal_groups render filter
 * and shipped pattern registration.
 *
 * @package Block_Actions
 */

class Test_Modal_Dialog extends WP_UnitTestCase {

	private function force_dialog( string $content, array $block ): string {
		return \Block_Actions\force_dialog_for_modal_groups( $content, $block );
	}

	private function modal_group( string $tag = 'div' ): array {
		return array(
			'blockName' => 'core/group',
			'attrs'     => array( 'className' => 'block-actions-modal' ),
		);
	}

	public function test_modal_group_div_becomes_dialog(): void {
		$content = '<div class="wp-block-group block-actions-modal"><p>x</p></div>';
		$out     = $this->force_dialog( $content, $this->modal_group() );
		$this->assertStringContainsString( '<dialog', $out );
		$this->assertStringContainsString( '</dialog>', $out );
		$this->assertStringNotContainsString( '<div class="wp-block-group', $out );
	}

	public function test_group_without_modal_class_is_untouched(): void {
		$content = '<div class="wp-block-group"><p>x</p></div>';
		$block   = array(
			'blockName' => 'core/group',
			'attrs'     => array( 'className' => 'something-else' ),
		);
		$this->assertSame( $content, $this->force_dialog( $content, $block ) );
	}

	public function test_non_group_block_is_untouched(): void {
		$content = '<div class="wp-block-button block-actions-modal"><a>x</a></div>';
		$block   = array(
			'blockName' => 'core/button',
			'attrs'     => array( 'className' => 'block-actions-modal' ),
		);
		$this->assertSame( $content, $this->force_dialog( $content, $block ) );
	}

	public function test_already_dialog_is_untouched(): void {
		$content = '<dialog class="wp-block-group block-actions-modal"><p>x</p></dialog>';
		$this->assertSame( $content, $this->force_dialog( $content, $this->modal_group() ) );
	}

	public function test_empty_content_is_untouched(): void {
		$this->assertSame( '', $this->force_dialog( '', $this->modal_group() ) );
	}

	public function test_modal_pattern_registered(): void {
		// register_block_patterns() runs on init during the test boot.
		$registry = WP_Block_Patterns_Registry::get_instance();
		$this->assertTrue( $registry->is_registered( 'block-actions/modal-with-trigger' ) );
	}
}
