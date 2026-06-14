<?php
/**
 * Smoke test: the test environment boots and the plugin loads.
 *
 * @package Block_Actions
 */

class Test_Smoke extends WP_UnitTestCase {

	public function test_plugin_loaded(): void {
		$this->assertTrue( defined( 'Block_Actions\\VERSION' ) );
		$this->assertSame( '3.0.0', \Block_Actions\VERSION );
	}

	public function test_transformer_class_available(): void {
		$this->assertTrue( class_exists( '\\Block_Actions\\Directive_Transformer' ) );
		$this->assertTrue( class_exists( '\\Block_Actions\\Renderers\\Carousel' ) );
	}

	public function test_wp_version_meets_minimum(): void {
		$this->assertTrue(
			version_compare( get_bloginfo( 'version' ), \Block_Actions\MIN_WP_VERSION, '>=' ),
			'Test WordPress should satisfy the plugin minimum.'
		);
	}
}
