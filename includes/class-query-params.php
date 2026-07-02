<?php
/**
 * Query Loop action URL-parameter handling.
 *
 * The query actions are URL-driven: every filter/search/page state is a
 * real GET URL, the server renders the matching result markup, and the
 * Interactivity Router swaps the query's region. This class owns the
 * server half of that contract:
 *
 *   ?bq-{queryId}-tax-{taxonomy}={term-slug}   → tax_query clause (AND)
 *   ?bq-{queryId}-s={search}                   → s
 *   ?query-{queryId}-page={n}                  → core's own param, untouched
 *
 * No nonces anywhere on this path — these are public reads, and a nonce
 * in markup would break full-page caching (a hard requirement of the
 * design, not an omission). Exposure equals core taxonomy archives.
 *
 * @since 3.1.0
 * @package Block_Actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Query params mapper and core-interop hooks.
 *
 * @since 3.1.0
 */
class Query_Params {

	/**
	 * The four query action ids.
	 *
	 * @var string[]
	 */
	const QUERY_ACTIONS = array(
		'query-filter',
		'query-live-search',
		'query-paginate',
		'query-infinite-scroll',
	);

	/**
	 * Action ids hosted on the core/query block itself.
	 *
	 * A query becomes filterable/searchable by carrying one of these —
	 * that opt-in is the security boundary: a crafted URL can never
	 * reshape a query that didn't opt in.
	 *
	 * @var string[]
	 */
	const QUERY_HOSTED_ACTIONS = array( 'query-paginate', 'query-infinite-scroll' );

	/**
	 * Query ids that opted into query actions this request.
	 *
	 * `query_loop_block_query_vars` receives the inner post-template /
	 * pagination block — whose CONTEXT carries queryId but whose attrs
	 * are its own, not the query's. The opt-in (customAction on the
	 * core/query block) is therefore recorded here when render_block_data
	 * sees the query block, just before its children render.
	 *
	 * @var array<int, true>
	 */
	private static $opted_in = array();

	/**
	 * Wire the hooks.
	 *
	 * @since 3.1.0
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'query_loop_block_query_vars', array( __CLASS__, 'map_query_vars' ), 10, 2 );
		add_filter( 'render_block_data', array( __CLASS__, 'force_plain_pagination' ) );
	}

	/**
	 * Whether a parsed core/query block has opted into query actions.
	 *
	 * @since 3.1.0
	 *
	 * @param array $attrs Block attributes.
	 * @return bool True when the block carries a query-hosted action.
	 */
	public static function is_actions_query( array $attrs ): bool {
		$action = $attrs['customAction'] ?? '';
		return is_string( $action ) && in_array( $action, self::QUERY_HOSTED_ACTIONS, true );
	}

	/**
	 * Map bq-{id}-* URL params into the block query's vars.
	 *
	 * Runs on `query_loop_block_query_vars` (custom, non-inherited
	 * queries only — WordPress never calls it for inherit:true, so
	 * inherited queries are structurally unfilterable here). Taxonomies
	 * are validated against registered public taxonomies; terms and
	 * search strings are sanitized. Queries that didn't opt in are
	 * never touched.
	 *
	 * @since 3.1.0
	 *
	 * @param array     $query The query vars built by core.
	 * @param \WP_Block $block The query block instance.
	 * @return array Possibly-extended query vars.
	 */
	public static function map_query_vars( array $query, \WP_Block $block ): array {
		// $block is the inner post-template/pagination block; the query's
		// id arrives via block context. Only queries recorded as opted-in
		// (see force_plain_pagination) are ever reshaped.
		$query_id = absint( $block->context['queryId'] ?? 0 );
		if ( ! isset( self::$opted_in[ $query_id ] ) ) {
			return $query;
		}

		$prefix = "bq-{$query_id}-";

		$public_taxonomies = get_taxonomies( array( 'public' => true ) );
		$tax_clauses       = array();

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Public read-only filtering; nonces are deliberately absent (page-cache requirement).
		foreach ( wp_unslash( $_GET ) as $key => $value ) {
			if ( ! is_string( $key ) || ! is_string( $value ) || '' === $value ) {
				continue;
			}
			if ( 0 !== strpos( $key, $prefix ) ) {
				continue;
			}
			$suffix = substr( $key, strlen( $prefix ) );

			if ( 's' === $suffix ) {
				$query['s'] = sanitize_text_field( $value );
				continue;
			}

			if ( 0 === strpos( $suffix, 'tax-' ) ) {
				$taxonomy = substr( $suffix, 4 );
				if ( ! in_array( $taxonomy, $public_taxonomies, true ) ) {
					continue;
				}
				$term = sanitize_title( $value );
				if ( '' === $term ) {
					continue;
				}
				$tax_clauses[] = array(
					'taxonomy' => $taxonomy,
					'field'    => 'slug',
					'terms'    => array( $term ),
				);
			}
		}
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( $tax_clauses ) {
			$existing = isset( $query['tax_query'] ) && is_array( $query['tax_query'] )
				? $query['tax_query']
				: array();
			// Different taxonomies compose (AND), and any author-configured
			// taxonomy filter on the block keeps applying on top.
			$query['tax_query'] = array_merge( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- The whole feature is taxonomy filtering.
				array( 'relation' => 'AND' ),
				$existing ? array( $existing ) : array(),
				$tax_clauses
			);
		}

		return $query;
	}

	/**
	 * Force core's enhanced pagination OFF for actions-enabled queries.
	 *
	 * Core's enhancedPagination mounts its own store and router region on
	 * the same element this plugin needs — one navigation owner per query,
	 * so the block-actions region wins and core renders plain pagination
	 * links (which the query store then drives).
	 *
	 * @since 3.1.0
	 *
	 * @param array $parsed_block The block being rendered.
	 * @return array Possibly-modified block.
	 */
	public static function force_plain_pagination( $parsed_block ) {
		if ( ! is_array( $parsed_block ) || ( $parsed_block['blockName'] ?? '' ) !== 'core/query' ) {
			return $parsed_block;
		}
		if ( self::is_actions_query( $parsed_block['attrs'] ?? array() ) ) {
			$parsed_block['attrs']['enhancedPagination'] = false;
			// Record the opt-in for map_query_vars, which runs while this
			// query's inner blocks render (they only see context).
			self::$opted_in[ absint( $parsed_block['attrs']['queryId'] ?? 0 ) ] = true;
		}
		return $parsed_block;
	}

	/**
	 * Whether the current request already filters some query to this
	 * taxonomy term.
	 *
	 * Used to server-render a filter trigger's initial aria-pressed. The
	 * trigger's target query is resolved client-side, so this matches the
	 * `bq-*-tax-{taxonomy}` param for ANY query id — correct whenever the
	 * page has one filtered query (the overwhelming case), and corrected
	 * at hydration by the reactive binding otherwise.
	 *
	 * @since 3.1.0
	 *
	 * @param string $taxonomy Taxonomy name.
	 * @param string $term     Term slug.
	 * @return bool True when an equivalent filter param is in the URL.
	 */
	public static function is_term_active_in_request( string $taxonomy, string $term ): bool {
		if ( '' === $taxonomy || '' === $term ) {
			return false;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Public read-only state reflection.
		foreach ( wp_unslash( $_GET ) as $key => $value ) {
			if ( ! is_string( $key ) || ! is_string( $value ) ) {
				continue;
			}
			if ( 1 === preg_match( '/^bq-\d+-tax-' . preg_quote( $taxonomy, '/' ) . '$/', $key )
				&& sanitize_title( $value ) === $term ) {
				return true;
			}
		}
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		return false;
	}
}
