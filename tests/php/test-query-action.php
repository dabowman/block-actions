<?php
/**
 * Query Loop action tests: renderer output, URL-param → query-var
 * mapping, core interop, and cache-safety invariants.
 *
 * @package Block_Actions
 */

use Block_Actions\Query_Params;
use Block_Actions\Renderers\Query_Action;

class Test_Query_Action extends WP_UnitTestCase {

	public function tear_down() {
		$_GET = array();
		parent::tear_down();
	}

	/**
	 * Run the renderer's root pipeline the way the transformer does.
	 */
	private function run_root( string $html, array $attrs = array() ): array {
		$renderer = new Query_Action();
		$p        = new \WP_HTML_Tag_Processor( $html );
		$p->next_tag();
		$block = array(
			'blockName' => 'core/query',
			'attrs'     => $attrs,
		);
		$ctx   = $renderer->get_initial_context( $p, $block );
		$renderer->apply_directives( $p, $block );
		return array( $ctx, $renderer->post_process_html( $p->get_updated_html() ), $renderer );
	}

	/**
	 * Mirror the real pipeline: render_block_data sees the core/query
	 * block (recording the opt-in), then query_loop_block_query_vars
	 * receives an INNER block whose context carries the queryId.
	 */
	private function inner_block_for_query( array $query_attrs ): WP_Block {
		Query_Params::force_plain_pagination(
			array(
				'blockName' => 'core/query',
				'attrs'     => $query_attrs,
			)
		);
		return new WP_Block(
			array(
				'blockName' => 'core/post-template',
				'attrs'     => array(),
			),
			array(
				'queryId' => absint( $query_attrs['queryId'] ?? 0 ),
				'query'   => $query_attrs['query'] ?? array(),
			)
		);
	}

	/* ---- Renderer: query-hosted actions ---- */

	public function test_paginate_injects_region_and_loading_bindings(): void {
		list( $ctx, $html ) = $this->run_root(
			'<div class="wp-block-query" data-action="query-paginate"></div>',
			array( 'queryId' => 7 )
		);

		$this->assertSame( 7, $ctx['queryId'] );
		$this->assertStringContainsString( 'data-wp-router-region="block-actions-query-7"', $html );
		$this->assertStringContainsString( 'data-wp-class--is-loading="state.isLoading"', $html );
		$this->assertStringContainsString( 'data-wp-bind--aria-busy="state.isLoading"', $html );
	}

	public function test_shared_namespace_for_all_query_actions(): void {
		$renderer = new Query_Action();
		foreach ( Query_Params::QUERY_ACTIONS as $id ) {
			$this->assertSame( 'block-actions/query', $renderer->get_namespace( $id ) );
		}
	}

	public function test_pagination_links_get_navigation_directives(): void {
		$html = '<div class="wp-block-query" data-action="query-paginate">'
			. '<nav class="wp-block-query-pagination">'
			. '<a class="wp-block-query-pagination-previous" href="/?query-1-page=1">Prev</a>'
			. '<a class="page-numbers" href="/?query-1-page=3">3</a>'
			. '<a class="wp-block-query-pagination-next" href="/?query-1-page=3">Next</a>'
			. '<a class="unrelated" href="/elsewhere">x</a>'
			. '</nav></div>';
		list( , $out ) = $this->run_root( $html, array( 'queryId' => 1 ) );

		$p     = new \WP_HTML_Tag_Processor( $out );
		$wired = array();
		while ( $p->next_tag( 'a' ) ) {
			if ( 'actions.navigate' === $p->get_attribute( 'data-wp-on--click' ) ) {
				$wired[] = (string) $p->get_attribute( 'href' );
				$this->assertSame( 'actions.prefetch', $p->get_attribute( 'data-wp-on-async--mouseenter' ) );
			}
		}
		$this->assertCount( 3, $wired );
		$this->assertNotContains( '/elsewhere', $wired );
	}

	public function test_infinite_scroll_appends_sentinel_and_init(): void {
		list( , $html ) = $this->run_root(
			'<div class="wp-block-query" data-action="query-infinite-scroll"><ul class="wp-block-post-template"></ul></div>',
			array( 'queryId' => 2 )
		);

		$this->assertStringContainsString( 'data-wp-init="callbacks.initInfiniteScroll"', $html );
		$this->assertStringContainsString( 'class="ba-query-sentinel"', $html );
		// Sentinel sits INSIDE the region root.
		$this->assertMatchesRegularExpression( '/ba-query-sentinel[^>]*><\/div><\/div>$/', $html );
	}

	/* ---- Renderer: triggers ---- */

	public function test_filter_trigger_context_and_control_wiring(): void {
		$html     = '<div class="wp-block-button" data-action="query-filter" data-query="my-grid" data-taxonomy="category" data-term="news">'
			. '<button class="wp-block-button__link">News</button></div>';
		$renderer = new Query_Action();
		$p        = new \WP_HTML_Tag_Processor( $html );
		$p->next_tag();
		$block = array(
			'blockName' => 'core/button',
			'attrs'     => array(),
		);
		$ctx   = $renderer->get_initial_context( $p, $block );
		$renderer->apply_directives( $p, $block );
		$out = $renderer->post_process_html( $p->get_updated_html() );

		$this->assertSame( 'my-grid', $ctx['targetQuery'] );
		$this->assertSame( 'category', $ctx['taxonomy'] );
		$this->assertSame( 'news', $ctx['term'] );

		$this->assertStringContainsString( 'data-wp-on--click="actions.applyFilter"', $out );
		$this->assertStringContainsString( 'data-wp-on-window--popstate="actions.syncUrl"', $out );

		// The inner control (not the wrapper) carries the active-state
		// bindings + a truthful first paint.
		$p2 = new \WP_HTML_Tag_Processor( $out );
		while ( $p2->next_tag() ) {
			if ( 'BUTTON' === $p2->get_tag() ) {
				$this->assertSame( 'state.isFilterActive', $p2->get_attribute( 'data-wp-bind--aria-pressed' ) );
				$this->assertSame( 'false', $p2->get_attribute( 'aria-pressed' ) );
			}
		}
	}

	public function test_filter_trigger_active_first_paint_from_url(): void {
		$_GET['bq-3-tax-category'] = 'news';

		$html     = '<div class="wp-block-button" data-action="query-filter" data-taxonomy="category" data-term="news">'
			. '<button class="wp-block-button__link">News</button></div>';
		$renderer = new Query_Action();
		$p        = new \WP_HTML_Tag_Processor( $html );
		$p->next_tag();
		$block = array(
			'blockName' => 'core/button',
			'attrs'     => array(),
		);
		$renderer->get_initial_context( $p, $block );
		$renderer->apply_directives( $p, $block );
		$out = $renderer->post_process_html( $p->get_updated_html() );

		$this->assertStringContainsString( 'aria-pressed="true"', $out );
	}

	public function test_search_trigger_wires_the_input(): void {
		$html     = '<form class="wp-block-search" data-action="query-live-search" data-query="my-list" data-min-chars="2">'
			. '<input type="search" name="s" class="wp-block-search__input" /></form>';
		$renderer = new Query_Action();
		$p        = new \WP_HTML_Tag_Processor( $html );
		$p->next_tag();
		$block = array(
			'blockName' => 'core/search',
			'attrs'     => array(),
		);
		$ctx   = $renderer->get_initial_context( $p, $block );
		$renderer->apply_directives( $p, $block );
		$out = $renderer->post_process_html( $p->get_updated_html() );

		$this->assertSame( 300, $ctx['debounce'] );
		$this->assertSame( 2, $ctx['minChars'] );
		$this->assertStringContainsString( 'data-wp-on--input="actions.search"', $out );
	}

	/* ---- Transformer integration: dynamic blocks via customAction ---- */

	public function test_transformer_reads_action_from_block_attrs(): void {
		$transformer = new Block_Actions\Directive_Transformer();
		$transformer->register_renderer( 'query-live-search', new Query_Action() );

		// core/search has no saved wrapper — data-action arrives via the
		// customAction attribute and is mirrored into the markup.
		$out = $transformer->transform(
			'<form class="wp-block-search"><input type="search" name="s" /></form>',
			array(
				'blockName' => 'core/search',
				'attrs'     => array( 'customAction' => 'query-live-search' ),
			)
		);

		$this->assertStringContainsString( 'data-action="query-live-search"', $out );
		$this->assertStringContainsString( 'data-wp-interactive="block-actions/query"', $out );
		$this->assertStringContainsString( 'data-wp-on--input="actions.search"', $out );
	}

	/* ---- Query var mapping ---- */

	public function test_maps_tax_and_search_params_for_opted_in_query(): void {
		register_taxonomy( 'genre', 'post', array( 'public' => true ) );
		$_GET = array(
			'bq-5-tax-category' => 'news',
			'bq-5-tax-genre'    => 'jazz',
			'bq-5-s'            => 'coffee',
			'bq-9-tax-category' => 'other-query',
		);

		$block = $this->inner_block_for_query(
			array(
				'queryId'      => 5,
				'customAction' => 'query-paginate',
			)
		);
		$query = Query_Params::map_query_vars( array( 'post_type' => 'post' ), $block );

		$this->assertSame( 'coffee', $query['s'] );
		$this->assertSame( 'AND', $query['tax_query']['relation'] );
		$clauses = array_filter( $query['tax_query'], 'is_array' );
		$this->assertCount( 2, $clauses );
		foreach ( $clauses as $clause ) {
			$this->assertNotSame( 'other-query', $clause['terms'][0] );
		}

		unregister_taxonomy( 'genre' );
	}

	public function test_ignores_params_for_query_without_action(): void {
		$_GET = array( 'bq-55-tax-category' => 'news' );
		// The query renders WITHOUT opting in (no customAction recorded).
		$block = new WP_Block(
			array(
				'blockName' => 'core/post-template',
				'attrs'     => array(),
			),
			array( 'queryId' => 55 )
		);
		$query = Query_Params::map_query_vars( array( 'post_type' => 'post' ), $block );

		$this->assertArrayNotHasKey( 'tax_query', $query );
	}

	public function test_rejects_unknown_and_private_taxonomies(): void {
		register_taxonomy( 'internal', 'post', array( 'public' => false ) );
		$_GET = array(
			'bq-5-tax-bogus'    => 'x',
			'bq-5-tax-internal' => 'secret',
		);

		$block = $this->inner_block_for_query(
			array(
				'queryId'      => 5,
				'customAction' => 'query-paginate',
			)
		);
		$query = Query_Params::map_query_vars( array(), $block );

		$this->assertArrayNotHasKey( 'tax_query', $query );
		unregister_taxonomy( 'internal' );
	}

	public function test_sanitizes_term_and_search_values(): void {
		$_GET = array(
			'bq-5-tax-category' => 'News <script>',
			'bq-5-s'            => "coffee<script>alert(1)</script>",
		);

		$block = $this->inner_block_for_query(
			array(
				'queryId'      => 5,
				'customAction' => 'query-infinite-scroll',
			)
		);
		$query = Query_Params::map_query_vars( array(), $block );

		$this->assertStringNotContainsString( '<', $query['s'] );
		$clauses = array_filter( $query['tax_query'], 'is_array' );
		$clause  = reset( $clauses );
		$this->assertMatchesRegularExpression( '/^[a-z0-9-]+$/', $clause['terms'][0] );
	}

	public function test_author_configured_tax_query_is_preserved(): void {
		$_GET  = array( 'bq-5-tax-category' => 'news' );
		$block = $this->inner_block_for_query(
			array(
				'queryId'      => 5,
				'customAction' => 'query-paginate',
			)
		);

		$existing = array(
			array(
				'taxonomy' => 'post_tag',
				'field'    => 'slug',
				'terms'    => array( 'featured' ),
			),
		);
		$query    = Query_Params::map_query_vars( array( 'tax_query' => $existing ), $block );

		// Both the author's clause and the URL clause apply, ANDed.
		$this->assertSame( 'AND', $query['tax_query']['relation'] );
		$this->assertCount( 2, array_filter( $query['tax_query'], 'is_array' ) );
	}

	/* ---- Core interop ---- */

	public function test_enhanced_pagination_forced_off_for_actions_queries(): void {
		$parsed = array(
			'blockName' => 'core/query',
			'attrs'     => array(
				'queryId'            => 1,
				'customAction'       => 'query-paginate',
				'enhancedPagination' => true,
			),
		);
		$result = Query_Params::force_plain_pagination( $parsed );
		$this->assertFalse( $result['attrs']['enhancedPagination'] );

		// Queries without an action keep whatever they had.
		$plain = array(
			'blockName' => 'core/query',
			'attrs'     => array( 'enhancedPagination' => true ),
		);
		$this->assertTrue( Query_Params::force_plain_pagination( $plain )['attrs']['enhancedPagination'] );
	}

	/* ---- Cache safety ---- */

	public function test_rendered_markup_is_deterministic_and_nonce_free(): void {
		$html = '<div class="wp-block-query" data-action="query-paginate">'
			. '<nav class="wp-block-query-pagination"><a class="page-numbers" href="/?query-1-page=2">2</a></nav></div>';

		list( , $first )  = $this->run_root( $html, array( 'queryId' => 1 ) );
		list( , $second ) = $this->run_root( $html, array( 'queryId' => 1 ) );

		$this->assertSame( $first, $second );
		$this->assertStringNotContainsString( 'nonce', strtolower( $first ) );
	}

	/* ---- Patterns ---- */

	public function test_query_patterns_are_registered(): void {
		Block_Actions\register_block_patterns();
		$registry = WP_Block_Patterns_Registry::get_instance();
		$this->assertTrue( $registry->is_registered( 'block-actions/filterable-grid' ) );
		$this->assertTrue( $registry->is_registered( 'block-actions/live-search-list' ) );
		$this->assertTrue( $registry->is_registered( 'block-actions/infinite-scroll-feed' ) );
	}
}
