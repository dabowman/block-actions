<?php
/**
 * Directive Transformer.
 *
 * Generic render_block filter that detects data-action attributes
 * and injects Interactivity API directives via registered renderers.
 *
 * @since 2.0.0
 * @package Block_Actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Directive Transformer class.
 *
 * @since 2.0.0
 */
class Directive_Transformer {

	/**
	 * Registered action renderers.
	 *
	 * @since 2.0.0
	 *
	 * @var array<string, Action_Renderer>
	 */
	private array $renderers = [];

	/**
	 * Register a renderer for a specific action ID.
	 *
	 * @since 2.0.0
	 *
	 * @param string          $action_id The action identifier (e.g. 'scroll-to-top').
	 * @param Action_Renderer $renderer  The renderer instance.
	 * @return void
	 */
	public function register_renderer( string $action_id, Action_Renderer $renderer ): void {
		$this->renderers[ $action_id ] = $renderer;
	}

	/**
	 * Transform block content by injecting Interactivity API directives.
	 *
	 * Hooked to the render_block filter. Uses WP_HTML_Tag_Processor
	 * for safe, standards-compliant HTML manipulation.
	 *
	 * @since 2.0.0
	 *
	 * @param string $block_content The block HTML content.
	 * @param array  $block         The parsed block data.
	 * @return string Modified block content with directives injected.
	 */
	public function transform( string $block_content, array $block ): string {
		if ( empty( $block_content ) ) {
			return $block_content;
		}

		$processor = new \WP_HTML_Tag_Processor( $block_content );
		if ( ! $processor->next_tag() ) {
			return $block_content;
		}

		$action_id = $processor->get_attribute( 'data-action' );
		if ( ! $action_id || ! isset( $this->renderers[ $action_id ] ) ) {
			return $block_content;
		}

		try {
			$renderer  = $this->renderers[ $action_id ];
			$namespace = 'block-actions/' . $action_id;

			// Set the interactive namespace.
			$processor->set_attribute( 'data-wp-interactive', $namespace );

			// Inject initial context from the renderer.
			$context = $renderer->get_initial_context( $processor, $block );
			if ( ! empty( $context ) ) {
				$processor->set_attribute(
					'data-wp-context',
					wp_json_encode( $context, JSON_HEX_TAG | JSON_HEX_AMP )
				);
			}

			// Apply action-specific directives to the root element.
			$renderer->apply_directives( $processor, $block );

			// Enqueue the view script module.
			$renderer->enqueue_view_script( $action_id );

			$html = $processor->get_updated_html();

			// Allow the renderer to post-process for child element directives.
			$html = $renderer->post_process_html( $html );

			return $html;
		} catch ( \Throwable $e ) {
			// Log the error but return original content so the page still renders.
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( sprintf( '[Block Actions] Renderer error for action "%s": %s', $action_id, $e->getMessage() ) );
			return $block_content;
		}
	}

	/**
	 * Get all registered renderer IDs.
	 *
	 * @since 2.0.0
	 *
	 * @return string[] Array of registered action IDs.
	 */
	public function get_registered_ids(): array {
		return array_keys( $this->renderers );
	}
}
