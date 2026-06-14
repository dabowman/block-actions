<?php
/**
 * Action-directory URL mapping (Task 5.2).
 *
 * directory_to_url() and resolve_action_directory() are pure (no static
 * cache), so unlike discover_theme_actions() they can be unit-tested.
 *
 * @package Block_Actions
 */

class Test_Action_Directories extends WP_UnitTestCase {

	public function test_maps_active_theme_path(): void {
		$path = get_stylesheet_directory() . '/actions';
		$this->assertSame(
			untrailingslashit( get_stylesheet_directory_uri() ) . '/actions',
			\Block_Actions\directory_to_url( $path )
		);
	}

	public function test_maps_parent_theme_path(): void {
		$path = get_template_directory() . '/actions';
		$this->assertSame(
			untrailingslashit( get_template_directory_uri() ) . '/actions',
			\Block_Actions\directory_to_url( $path )
		);
	}

	public function test_maps_plugin_path_under_wp_content(): void {
		// WP_PLUGIN_DIR lives under WP_CONTENT_DIR, so it resolves via the
		// content_url() fallback even though it's neither theme.
		$path = WP_PLUGIN_DIR . '/my-plugin/actions';
		$expected = untrailingslashit( content_url() ) . '/plugins/my-plugin/actions';
		$this->assertSame( $expected, \Block_Actions\directory_to_url( $path ) );
	}

	public function test_unmappable_path_returns_empty(): void {
		$this->assertSame( '', \Block_Actions\directory_to_url( '/srv/elsewhere/actions' ) );
	}

	public function test_resolve_string_entry(): void {
		$resolved = \Block_Actions\resolve_action_directory( get_stylesheet_directory() . '/actions/' );
		$this->assertSame( get_stylesheet_directory() . '/actions', $resolved['path'] );
		$this->assertSame( untrailingslashit( get_stylesheet_directory_uri() ) . '/actions', $resolved['url'] );
	}

	public function test_resolve_explicit_path_url_pair(): void {
		$resolved = \Block_Actions\resolve_action_directory(
			array(
				'path' => '/srv/shared/block-actions/',
				'url'  => 'https://cdn.example.com/block-actions/',
			)
		);
		// Trailing slashes trimmed; an out-of-root path is accepted because
		// the URL was supplied explicitly.
		$this->assertSame( '/srv/shared/block-actions', $resolved['path'] );
		$this->assertSame( 'https://cdn.example.com/block-actions', $resolved['url'] );
	}

	public function test_resolve_unmappable_string_returns_null(): void {
		$this->assertNull( \Block_Actions\resolve_action_directory( '/srv/elsewhere/actions' ) );
	}
}
