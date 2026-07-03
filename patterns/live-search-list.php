<?php
/**
 * Title: Live-Search Post List
 * Slug: block-actions/live-search-list
 * Categories: posts
 * Keywords: search, query, posts, live, instant
 * Description: A search box wired to a Query Loop list — results update as you type, no page reload. With JavaScript off the box falls back to the site search.
 * Viewport Width: 800
 *
 * @package Block_Actions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">

<!-- wp:search {"label":<?php echo wp_json_encode( __( 'Search posts', 'block-actions' ) ); ?>,"showLabel":false,"placeholder":<?php echo wp_json_encode( __( 'Type to search…', 'block-actions' ) ); ?>,"buttonPosition":"no-button","customAction":"query-live-search","actionData":{"targetQuery":"ba-live-search-list","debounce":300,"minChars":2}} /-->

<!-- wp:query {"queryId":11,"query":{"perPage":8,"postType":"post","inherit":false},"anchor":"ba-live-search-list","customAction":"query-paginate"} -->
<div class="wp-block-query" id="ba-live-search-list" data-action="query-paginate"><!-- wp:post-template -->
<!-- wp:post-title {"isLink":true,"fontSize":"medium"} /-->
<!-- wp:post-date {"fontSize":"small"} /-->
<!-- /wp:post-template -->

<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"center"}} -->
<!-- wp:query-pagination-previous /-->
<!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->

<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p><?php esc_html_e( 'Nothing found. Try a different search.', 'block-actions' ); ?></p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results --></div>
<!-- /wp:query -->

</div>
<!-- /wp:group -->
