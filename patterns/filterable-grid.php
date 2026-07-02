<?php
/**
 * Title: Filterable Post Grid
 * Slug: block-actions/filterable-grid
 * Categories: posts
 * Keywords: filter, query, posts, grid, taxonomy, category
 * Description: Category filter buttons wired to a Query Loop grid with instant pagination. Change each button's Taxonomy/Term fields to match your site; results update without a page reload.
 * Viewport Width: 1000
 *
 * @package Block_Actions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"tagName":"button","customAction":"query-filter","actionData":{"targetQuery":"ba-filterable-grid","taxonomy":"category","term":""},"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline" data-action="query-filter" data-query="ba-filterable-grid" data-taxonomy="category"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'All', 'block-actions' ); ?></button></div>
<!-- /wp:button -->

<!-- wp:button {"tagName":"button","customAction":"query-filter","actionData":{"targetQuery":"ba-filterable-grid","taxonomy":"category","term":"news"},"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline" data-action="query-filter" data-query="ba-filterable-grid" data-taxonomy="category" data-term="news"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'News', 'block-actions' ); ?></button></div>
<!-- /wp:button -->

<!-- wp:button {"tagName":"button","customAction":"query-filter","actionData":{"targetQuery":"ba-filterable-grid","taxonomy":"category","term":"events"},"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline" data-action="query-filter" data-query="ba-filterable-grid" data-taxonomy="category" data-term="events"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Events', 'block-actions' ); ?></button></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:query {"queryId":10,"query":{"perPage":6,"postType":"post","inherit":false},"anchor":"ba-filterable-grid","customAction":"query-paginate"} -->
<div class="wp-block-query" id="ba-filterable-grid" data-action="query-paginate"><!-- wp:post-template {"layout":{"type":"grid","columnCount":3}} -->
<!-- wp:post-featured-image {"isLink":true,"aspectRatio":"4/3"} /-->
<!-- wp:post-title {"isLink":true,"fontSize":"medium"} /-->
<!-- wp:post-excerpt {"moreText":"","excerptLength":18} /-->
<!-- /wp:post-template -->

<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"center"}} -->
<!-- wp:query-pagination-previous /-->
<!-- wp:query-pagination-numbers /-->
<!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->

<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p><?php esc_html_e( 'No posts match this filter.', 'block-actions' ); ?></p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results --></div>
<!-- /wp:query -->

</div>
<!-- /wp:group -->
