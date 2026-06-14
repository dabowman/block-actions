<?php
/**
 * Directive_Transformer tests.
 *
 * @package Block_Actions
 */

use Block_Actions\Directive_Transformer;
use Block_Actions\Action_Renderer;
use Block_Actions\Renderers\Copy_To_Clipboard;

class Test_Directive_Transformer extends WP_UnitTestCase {

	private Directive_Transformer $transformer;

	public function set_up(): void {
		parent::set_up();
		$this->transformer = new Directive_Transformer();
		$this->transformer->register_renderer( 'copy-to-clipboard', new Copy_To_Clipboard() );
	}

	private function block( string $name = 'core/button', array $attrs = array() ): array {
		return array(
			'blockName' => $name,
			'attrs'     => $attrs,
		);
	}

	public function test_empty_content_returned_as_is(): void {
		$this->assertSame( '', $this->transformer->transform( '', $this->block() ) );
	}

	public function test_block_without_data_action_is_untouched(): void {
		$html = '<div class="wp-block-button"><a class="wp-block-button__link">Hi</a></div>';
		$this->assertSame( $html, $this->transformer->transform( $html, $this->block() ) );
	}

	public function test_unregistered_action_is_untouched(): void {
		$html = '<div data-action="not-registered"><a>Hi</a></div>';
		$this->assertSame( $html, $this->transformer->transform( $html, $this->block() ) );
	}

	public function test_registered_action_injects_directives(): void {
		$html = '<div class="wp-block-button" data-action="copy-to-clipboard" data-copy-text="hello"><a class="wp-block-button__link">Copy</a></div>';
		$out  = $this->transformer->transform( $html, $this->block() );

		$this->assertStringContainsString( 'data-wp-interactive="block-actions/copy-to-clipboard"', $out );
		$this->assertStringContainsString( 'data-wp-context=', $out );
		$this->assertStringContainsString( 'data-wp-on--click="actions.copy"', $out );
		$this->assertStringContainsString( 'data-wp-init="callbacks.init"', $out );
		// post_process_html binds the inner anchor.
		$this->assertStringContainsString( 'data-wp-text="state.buttonText"', $out );
		// The configured copy text is forwarded into the context JSON.
		$this->assertStringContainsString( 'hello', $out );
	}

	public function test_context_json_is_escaped(): void {
		$html = '<div data-action="copy-to-clipboard" data-copy-text="&lt;script&gt;"><a>Copy</a></div>';
		$out  = $this->transformer->transform( $html, $this->block() );
		// JSON_HEX_TAG encoding means a literal "<script>" must never appear.
		$this->assertStringNotContainsString( '<script>', $out );
	}

	public function test_renderer_exception_is_isolated(): void {
		$throwing = new class() extends Action_Renderer {
			public function get_initial_context( \WP_HTML_Tag_Processor $p, array $b ): array {
				return array();
			}
			public function apply_directives( \WP_HTML_Tag_Processor $p, array $b ): void {
				throw new \RuntimeException( 'boom' );
			}
		};
		$this->transformer->register_renderer( 'boom', $throwing );

		$html = '<div data-action="boom"><a>Hi</a></div>';
		// A throwing renderer must not break the page: original content is returned.
		$this->assertSame( $html, $this->transformer->transform( $html, $this->block() ) );
	}

	public function test_get_registered_ids(): void {
		$ids = $this->transformer->get_registered_ids();
		$this->assertContains( 'copy-to-clipboard', $ids );
		$this->assertNotContains( 'nope', $ids );
	}
}
