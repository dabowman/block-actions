/**
 * Block variations registered by this plugin.
 *
 * Currently provides a "Dialog" variation of `core/group` that
 * renders as a native <dialog> element with a close-button scaffold.
 * Pair with a Button block using the Modal Toggle action to open it.
 *
 * @since 2.2.0
 */

import { registerBlockVariation } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Register the Dialog variation of core/group.
 *
 * Sets `tagName: 'dialog'` — core Group's save/render uses tagName
 * directly, so the output is a real <dialog> element compatible with
 * the modal-toggle action. The editor's HTML-element dropdown has a
 * hardcoded options list and won't reflect "Dialog" as the selected
 * value, but the attribute is set correctly and will persist.
 *
 * Scaffold is intentionally minimal — just the close button. Authors
 * compose the rest of the dialog content using any blocks they want.
 *
 * @since 2.2.0
 */
export function registerModalDialogVariation() {
	registerBlockVariation( 'core/group', {
		name: 'block-actions-dialog',
		title: __( 'Dialog', 'block-actions' ),
		description: __(
			'A native <dialog> container. Pair with a Button using the Modal Toggle action to open it. For rows, stacks, or grids inside the dialog, nest the corresponding Group variation as a child block.',
			'block-actions'
		),
		keywords: [
			__( 'modal', 'block-actions' ),
			__( 'dialog', 'block-actions' ),
			__( 'popup', 'block-actions' ),
		],
		category: 'design',
		attributes: {
			tagName: 'dialog',
			className: 'block-actions-modal',
		},
		innerBlocks: [
			[
				'core/buttons',
				{},
				[
					[
						'core/button',
						{
							// Render as <button>, not <a>. An <a> without
							// an href is not keyboard focusable, which
							// breaks the dialog's focus trap (no tab
							// stops inside the top-layer subtree).
							tagName: 'button',
							text: __( 'Close', 'block-actions' ),
							className: 'modal-close',
						},
					],
				],
			],
		],
		// Inserter-only (no 'transform'). Without this, other Group
		// variants would show "Dialog" in their Transform-to menu and
		// users would end up with residual attributes from the source
		// variant. There's no matching variation-level lever for the
		// reverse direction (Dialog → Row/Stack/Grid still appears in
		// the toolbar); full bidirectional isolation would require a
		// standalone custom block.
		scope: [ 'inserter' ],
		isActive: ( blockAttributes ) =>
			blockAttributes?.tagName === 'dialog',
	} );
}
