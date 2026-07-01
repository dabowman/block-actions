<?php
/**
 * Tests for early action-stylesheet enqueuing (enqueue_action_styles).
 *
 * @package Block_Actions
 */

/**
 * @covers \Block_Actions\enqueue_action_styles
 */
class Test_Action_Styles extends WP_UnitTestCase {

	/**
	 * Dequeue everything the tests may have enqueued.
	 */
	public function tear_down() {
		foreach ( array( 'block-actions-carousel', 'block-actions-toggle-visibility' ) as $handle ) {
			wp_dequeue_style( $handle );
			wp_deregister_style( $handle );
		}
		parent::tear_down();
	}

	public function test_frontend_enqueues_styles_for_actions_in_query_content(): void {
		$post_id = self::factory()->post->create(
			array(
				'post_content' => '<!-- wp:group --><div class="wp-block-group" data-action="carousel">x</div><!-- /wp:group -->',
			)
		);
		$this->go_to( get_permalink( $post_id ) );

		Block_Actions\enqueue_action_styles();

		$this->assertTrue( wp_style_is( 'block-actions-carousel', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'block-actions-toggle-visibility', 'enqueued' ) );
	}

	public function test_frontend_enqueues_nothing_without_actions(): void {
		$post_id = self::factory()->post->create(
			array( 'post_content' => '<p>No actions here.</p>' )
		);
		$this->go_to( get_permalink( $post_id ) );

		Block_Actions\enqueue_action_styles();

		$this->assertFalse( wp_style_is( 'block-actions-carousel', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'block-actions-toggle-visibility', 'enqueued' ) );
	}

	public function test_render_time_fallback_still_enqueues(): void {
		// Content the head-time scan never saw (e.g. do_blocks output)
		// still gets its stylesheet from the render-time fallback.
		( new Block_Actions\Renderers\Carousel() )->enqueue_view_style( 'carousel' );
		$this->assertTrue( wp_style_is( 'block-actions-carousel', 'enqueued' ) );
	}
}
