<?php
/**
 * Title: Disclosure (Show / Hide)
 * Slug: block-actions/disclosure
 * Categories: design
 * Keywords: toggle, show, hide, disclosure, collapse, expand
 * Description: A button that shows or hides a panel. Both blocks share the anchor id `ba-disclosure-1` — rename on both sides if you insert the pattern more than once on a page.
 * Viewport Width: 600
 *
 * @package Block_Actions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"tagName":"button","customAction":"toggle-visibility","actionData":{"target":"ba-disclosure-1","startHidden":true}} -->
<div class="wp-block-button" data-action="toggle-visibility" data-target="ba-disclosure-1" data-start-hidden="true"><button type="button" class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Show', 'block-actions' ); ?></button></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:group {"anchor":"ba-disclosure-1","className":"is-hidden","layout":{"type":"constrained"}} -->
<div class="wp-block-group is-hidden" id="ba-disclosure-1"><!-- wp:paragraph -->
<p><?php esc_html_e( 'This panel starts hidden and is revealed when the button is clicked. The button label switches between Show and Hide automatically.', 'block-actions' ); ?></p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
