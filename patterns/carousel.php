<?php
/**
 * Title: Carousel
 * Slug: block-actions/carousel
 * Categories: design, gallery
 * Keywords: carousel, slider, slideshow, gallery, slides
 * Description: A sliding carousel built from core blocks. The action block doubles as the carousel container; swap the slide content for images or anything else. Arrow keys and swipe work out of the box.
 * Viewport Width: 800
 *
 * @package Block_Actions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:group {"customAction":"carousel","className":"carousel-container","layout":{"type":"constrained"}} -->
<div class="wp-block-group carousel-container" data-action="carousel">
<!-- wp:group {"className":"carousel-slider","layout":{"type":"default"}} -->
<div class="wp-block-group carousel-slider">
<!-- wp:group {"className":"carousel-slide","style":{"spacing":{"padding":{"top":"4rem","bottom":"4rem"}}},"backgroundColor":"tertiary","layout":{"type":"constrained"}} -->
<div class="wp-block-group carousel-slide has-tertiary-background-color has-background" style="padding-top:4rem;padding-bottom:4rem"><!-- wp:heading {"textAlign":"center"} -->
<h3 class="wp-block-heading has-text-align-center"><?php esc_html_e( 'Slide one', 'block-actions' ); ?></h3>
<!-- /wp:heading --></div>
<!-- /wp:group -->

<!-- wp:group {"className":"carousel-slide","style":{"spacing":{"padding":{"top":"4rem","bottom":"4rem"}}},"backgroundColor":"secondary","layout":{"type":"constrained"}} -->
<div class="wp-block-group carousel-slide has-secondary-background-color has-background" style="padding-top:4rem;padding-bottom:4rem"><!-- wp:heading {"textAlign":"center"} -->
<h3 class="wp-block-heading has-text-align-center"><?php esc_html_e( 'Slide two', 'block-actions' ); ?></h3>
<!-- /wp:heading --></div>
<!-- /wp:group -->

<!-- wp:group {"className":"carousel-slide","style":{"spacing":{"padding":{"top":"4rem","bottom":"4rem"}}},"backgroundColor":"primary","layout":{"type":"constrained"}} -->
<div class="wp-block-group carousel-slide has-primary-background-color has-background" style="padding-top:4rem;padding-bottom:4rem"><!-- wp:heading {"textAlign":"center"} -->
<h3 class="wp-block-heading has-text-align-center"><?php esc_html_e( 'Slide three', 'block-actions' ); ?></h3>
<!-- /wp:heading --></div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"tagName":"button","className":"carousel-button-left"} -->
<div class="wp-block-button carousel-button-left"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Previous', 'block-actions' ); ?></button></div>
<!-- /wp:button -->

<!-- wp:button {"tagName":"button","className":"carousel-button-right"} -->
<div class="wp-block-button carousel-button-right"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Next', 'block-actions' ); ?></button></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
