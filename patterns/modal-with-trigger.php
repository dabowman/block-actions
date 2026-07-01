<?php
/**
 * Title: Modal Dialog + Trigger
 * Slug: block-actions/modal-with-trigger
 * Categories: design, featured
 * Keywords: modal, dialog, popup, toggle, open
 * Description: A button wired to open a linked modal dialog. Both blocks share the anchor id `block-actions-modal-1` — rename on both sides if you insert the pattern more than once on a page.
 * Viewport Width: 600
 *
 * @package Block_Actions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"tagName":"button","customAction":"modal-toggle","actionData":{"modal":"block-actions-modal-1"}} -->
<div class="wp-block-button" data-action="modal-toggle" data-modal="block-actions-modal-1"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Open Modal', 'block-actions' ); ?></button></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:group {"tagName":"dialog","className":"block-actions-modal","anchor":"block-actions-modal-1","layout":{"type":"constrained"}} -->
<dialog class="wp-block-group block-actions-modal" id="block-actions-modal-1">
<!-- wp:heading -->
<h2 class="wp-block-heading"><?php esc_html_e( 'Modal title', 'block-actions' ); ?></h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p><?php esc_html_e( 'Modal body copy goes here.', 'block-actions' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"tagName":"button","className":"modal-close"} -->
<div class="wp-block-button modal-close"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Close', 'block-actions' ); ?></button></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
</dialog>
<!-- /wp:group -->
