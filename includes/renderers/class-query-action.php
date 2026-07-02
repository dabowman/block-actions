<?php
/**
 * Query Loop action renderer.
 *
 * One renderer serves all four query actions (they share the
 * `block-actions/query` store and the URL-driven navigation engine):
 *
 *   - query-paginate / query-infinite-scroll host on the core/query
 *     block itself: the renderer injects the router region and wires
 *     the (plain, enhanced-pagination-disabled) pagination links.
 *   - query-filter hosts on a core/button trigger; query-live-search
 *     hosts on core/search (or a core/group containing an input). Both
 *     build URLs client-side and navigate the target query's region.
 *
 * @since 3.1.0
 * @package Block_Actions
 */

namespace Block_Actions\Renderers;

use Block_Actions\Action_Renderer;
use Block_Actions\Query_Params;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Query action renderer.
 *
 * @since 3.1.0
 */
class Query_Action extends Action_Renderer {

	/**
	 * The action id of the block currently being rendered.
	 *
	 * Set in get_initial_context()/apply_directives() (which see the
	 * processor) and consumed by post_process_html() (which only sees
	 * HTML). Calls are sequential per block within transform(), so this
	 * never leaks across blocks.
	 *
	 * @since 3.1.0
	 *
	 * @var string
	 */
	private string $current_action = '';

	/**
	 * All four actions share one store.
	 *
	 * @since 3.1.0
	 *
	 * @param string $action_id The action identifier.
	 * @return string The store namespace.
	 */
	public function get_namespace( string $action_id ): string {
		return 'block-actions/query';
	}

	/**
	 * Read a string data attribute off the current element.
	 *
	 * @since 3.1.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The processor.
	 * @param string                 $name      Attribute name.
	 * @return string The value, or '' when absent/boolean.
	 */
	private function attr( \WP_HTML_Tag_Processor $processor, string $name ): string {
		$value = $processor->get_attribute( $name );
		return is_string( $value ) ? $value : '';
	}

	/**
	 * Read a trigger config value: markup data attribute first, block
	 * actionData attribute as fallback.
	 *
	 * Static blocks (core/button) carry field values as data-*
	 * attributes written by the editor's save filter. DYNAMIC blocks
	 * (core/search) have no saved wrapper — their field values only
	 * exist in the block's actionData attribute, so the renderer must
	 * read them from there or a pattern's Target Query silently
	 * vanishes.
	 *
	 * @since 3.1.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The processor.
	 * @param array                  $block     The parsed block data.
	 * @param string                 $attr_name Markup attribute name.
	 * @param string                 $data_key  actionData key.
	 * @return string The value, or ''.
	 */
	private function config( \WP_HTML_Tag_Processor $processor, array $block, string $attr_name, string $data_key ): string {
		$value = $this->attr( $processor, $attr_name );
		if ( '' !== $value ) {
			return $value;
		}
		$data  = $block['attrs']['actionData'] ?? array();
		$value = $data[ $data_key ] ?? '';
		return is_scalar( $value ) ? (string) $value : '';
	}

	/**
	 * Sanitize an anchor reference: conservative charset, case preserved
	 * (HTML ids are case-sensitive — sanitize_key() would lowercase a
	 * camelCase anchor into an unresolvable one).
	 *
	 * @since 3.1.0
	 *
	 * @param string $anchor Raw anchor value.
	 * @return string Sanitized anchor.
	 */
	private function sanitize_anchor( string $anchor ): string {
		return (string) preg_replace( '/[^A-Za-z0-9_-]/', '', $anchor );
	}

	/**
	 * Initial context per action.
	 *
	 * @since 3.1.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \WP_HTML_Tag_Processor $processor, array $block ): array {
		$action               = $this->attr( $processor, 'data-action' );
		$this->current_action = $action;

		switch ( $action ) {
			case 'query-paginate':
			case 'query-infinite-scroll':
				return array(
					'queryId'    => absint( $block['attrs']['queryId'] ?? 0 ),
					'action'     => $action,
					'isFetching' => false,
				);

			case 'query-filter':
				return array(
					'action'      => 'query-filter',
					'targetQuery' => $this->sanitize_anchor( $this->config( $processor, $block, 'data-query', 'targetQuery' ) ),
					'taxonomy'    => sanitize_key( $this->config( $processor, $block, 'data-taxonomy', 'taxonomy' ) ),
					'term'        => sanitize_title( $this->config( $processor, $block, 'data-term', 'term' ) ),
				);

			case 'query-live-search':
				$debounce = $this->config( $processor, $block, 'data-debounce', 'debounce' );
				return array(
					'action'      => 'query-live-search',
					'targetQuery' => $this->sanitize_anchor( $this->config( $processor, $block, 'data-query', 'targetQuery' ) ),
					'debounce'    => '' === $debounce ? 300 : absint( $debounce ),
					'minChars'    => absint( $this->config( $processor, $block, 'data-min-chars', 'minChars' ) ),
					'timer'       => 0,
				);
		}

		return array();
	}

	/**
	 * Root directives per action.
	 *
	 * @since 3.1.0
	 *
	 * @param \WP_HTML_Tag_Processor $processor The HTML tag processor.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	public function apply_directives( \WP_HTML_Tag_Processor $processor, array $block ): void {
		$action               = $this->attr( $processor, 'data-action' );
		$this->current_action = $action;

		switch ( $action ) {
			case 'query-paginate':
			case 'query-infinite-scroll':
				$query_id = absint( $block['attrs']['queryId'] ?? 0 );
				// The region id doubles as the client-side anchor→queryId
				// resolution channel: triggers parse the id back out of it.
				$processor->set_attribute( 'data-wp-router-region', "block-actions-query-{$query_id}" );
				if ( 'query-infinite-scroll' === $action ) {
					// NO reactive bindings on this region — deliberately.
					// Infinite scroll appends fetched posts imperatively,
					// and any signal-driven binding here would make the
					// hydrated island re-render on state changes: Preact
					// then reconciles against its original vdom, wiping
					// imperative classes and duplicating appended items.
					// Loading feedback is applied imperatively in loadMore.
					$processor->set_attribute( 'data-wp-init', 'callbacks.initInfiniteScroll' );
				} else {
					$processor->set_attribute( 'data-wp-class--is-loading', 'state.isLoading' );
					$processor->set_attribute( 'data-wp-bind--aria-busy', 'state.isLoading' );
				}
				break;

			case 'query-filter':
				$processor->set_attribute( 'data-wp-on--click', 'actions.applyFilter' );
				$processor->set_attribute( 'data-wp-on--mouseenter', 'actions.prefetchFilter' );
				$processor->set_attribute( 'data-wp-on-window--popstate', 'actions.syncUrl' );
				break;

			case 'query-live-search':
				// The input listener is wired on the inner <input> in
				// post_process_html(); popstate keeps state.currentSearch
				// honest across back/forward.
				$processor->set_attribute( 'data-wp-on-window--popstate', 'actions.syncUrl' );
				break;
		}
	}

	/**
	 * Child-element wiring per action.
	 *
	 * @since 3.1.0
	 *
	 * @param string $html The block HTML after root directive injection.
	 * @return string Modified HTML.
	 */
	public function post_process_html( string $html ): string {
		switch ( $this->current_action ) {
			case 'query-paginate':
			case 'query-infinite-scroll':
				$html = $this->wire_pagination_links( $html );
				if ( 'query-infinite-scroll' === $this->current_action ) {
					$html = $this->append_sentinel( $html );
				}
				return $html;

			case 'query-filter':
				return $this->wire_filter_control( $html );

			case 'query-live-search':
				return $this->wire_search_input( $html );
		}

		return $html;
	}

	/**
	 * Wire navigation + prefetch onto core's plain pagination links.
	 *
	 * With enhancedPagination forced off these are ordinary hrefs (the
	 * no-JS path); the directives upgrade them to region swaps.
	 *
	 * @since 3.1.0
	 *
	 * @param string $html The query block HTML.
	 * @return string Modified HTML.
	 */
	private function wire_pagination_links( string $html ): string {
		$p = new \WP_HTML_Tag_Processor( $html );
		while ( $p->next_tag( 'a' ) ) {
			if ( ! $p->has_class( 'wp-block-query-pagination-next' )
				&& ! $p->has_class( 'wp-block-query-pagination-previous' )
				&& ! $p->has_class( 'page-numbers' )
			) {
				continue;
			}
			$p->set_attribute( 'data-wp-on--click', 'actions.navigate' );
			$p->set_attribute( 'data-wp-on--mouseenter', 'actions.prefetch' );
		}
		return $p->get_updated_html();
	}

	/**
	 * Append the infinite-scroll sentinel inside the region root.
	 *
	 * The sentinel's IntersectionObserver drives fetch-and-append; the
	 * (JS-hidden) pagination block remains the no-JS fallback and the
	 * source of the next-page URL.
	 *
	 * @since 3.1.0
	 *
	 * @param string $html The query block HTML.
	 * @return string Modified HTML.
	 */
	private function append_sentinel( string $html ): string {
		$sentinel = '<div class="ba-query-sentinel" aria-hidden="true"></div>';
		// WP_HTML_Tag_Processor can't insert nodes; splice the sentinel in
		// before the root element's closing tag. The query block root is
		// always a <div> wrapper.
		$pos = strrpos( $html, '</div>' );
		if ( false === $pos ) {
			return $html;
		}
		return substr( $html, 0, $pos ) . $sentinel . substr( $html, $pos );
	}

	/**
	 * Wire the filter trigger's inner control: reactive active-state
	 * bindings plus a truthful first paint.
	 *
	 * Trigger markup lives OUTSIDE the router region, so a region swap
	 * never re-renders it — the reactive bindings are the source of
	 * truth after hydration; the server-rendered aria-pressed is first
	 * paint only.
	 *
	 * @since 3.1.0
	 *
	 * @param string $html The trigger block HTML.
	 * @return string Modified HTML.
	 */
	private function wire_filter_control( string $html ): string {
		$p = new \WP_HTML_Tag_Processor( $html );
		if ( ! $p->next_tag() ) {
			return $html;
		}

		$taxonomy = sanitize_key( $this->attr( $p, 'data-taxonomy' ) );
		$term     = sanitize_title( $this->attr( $p, 'data-term' ) );

		// core/button: descend from the wrapper to the inner control.
		if ( $p->has_class( 'wp-block-button' ) && ! $p->next_tag() ) {
			return $html;
		}

		$p->set_attribute( 'data-wp-bind--aria-pressed', 'state.isFilterActive' );
		$p->set_attribute( 'data-wp-class--is-active-filter', 'state.isFilterActive' );
		$p->set_attribute(
			'aria-pressed',
			Query_Params::is_term_active_in_request( $taxonomy, $term ) ? 'true' : 'false'
		);

		return $p->get_updated_html();
	}

	/**
	 * Wire the live-search input.
	 *
	 * Targets the first <input> (core/search's `.wp-block-search__input`,
	 * or any input inside a group trigger). The input keeps whatever GET
	 * fallback core gave it — with JS off, core/search still submits to
	 * the site search, a documented graceful degradation.
	 *
	 * @since 3.1.0
	 *
	 * @param string $html The trigger block HTML.
	 * @return string Modified HTML.
	 */
	private function wire_search_input( string $html ): string {
		$p = new \WP_HTML_Tag_Processor( $html );
		while ( $p->next_tag( 'input' ) ) {
			$type = $this->attr( $p, 'type' );
			if ( '' !== $type && ! in_array( $type, array( 'search', 'text' ), true ) ) {
				continue;
			}
			$p->set_attribute( 'data-wp-on--input', 'actions.search' );
			return $p->get_updated_html();
		}
		return $html;
	}

	/**
	 * All four ids resolve to the single query view module.
	 *
	 * The parent implementation derives the build path from the action
	 * id; the shared store lives at actions/query/view.js.
	 *
	 * @since 3.1.0
	 *
	 * @param string $action_id The action identifier.
	 * @return void
	 */
	public function enqueue_view_script( string $action_id ): void {
		parent::enqueue_view_script( 'query' );
	}

	/**
	 * All four ids share the single query stylesheet.
	 *
	 * @since 3.1.0
	 *
	 * @param string $action_id The action identifier.
	 * @return void
	 */
	public function enqueue_view_style( string $action_id ): void {
		parent::enqueue_view_style( 'query' );
	}
}
