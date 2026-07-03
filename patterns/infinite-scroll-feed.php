<?php
/**
 * Title: Infinite-Scroll Feed
 * Slug: block-actions/infinite-scroll-feed
 * Categories: posts
 * Keywords: infinite, scroll, feed, query, posts, load more
 * Description: A post feed that loads the next page automatically as you scroll. With JavaScript off the pagination links remain and keep working.
 * Viewport Width: 800
 *
 * @package Block_Actions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:query {"queryId":12,"query":{"perPage":5,"postType":"post","inherit":false},"anchor":"ba-infinite-feed","customAction":"query-infinite-scroll"} -->
<div class="wp-block-query" id="ba-infinite-feed" data-action="query-infinite-scroll"><!-- wp:post-template -->
<!-- wp:post-title {"isLink":true,"fontSize":"large"} /-->
<!-- wp:post-date {"fontSize":"small"} /-->
<!-- wp:post-excerpt {"moreText":"","excerptLength":30} /-->
<!-- wp:separator {"className":"is-style-wide"} -->
<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide"/>
<!-- /wp:separator -->
<!-- /wp:post-template -->

<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"center"}} -->
<!-- wp:query-pagination-previous /-->
<!-- wp:query-pagination-next {"label":<?php echo wp_json_encode( __( 'Load more', 'block-actions' ) ); ?>} /-->
<!-- /wp:query-pagination -->

<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p><?php esc_html_e( 'No posts yet.', 'block-actions' ); ?></p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results --></div>
<!-- /wp:query -->
