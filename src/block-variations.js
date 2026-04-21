/**
 * Block variations registered by this plugin.
 *
 * Currently provides a "Modal Dialog" variation of `core/group` that
 * renders as a native <dialog> element and ships with a starter
 * layout (heading + paragraph + close button). Pair with a Button
 * block using the Modal Toggle action to open it.
 *
 * @since 2.2.0
 */

import { registerBlockVariation } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Register the Modal Dialog variation of core/group.
 *
 * Sets `tagName: 'dialog'` — core Group's save/render uses tagName
 * directly, so the output is a real <dialog> element compatible with
 * the modal-toggle action. The editor's HTML-element dropdown has a
 * hardcoded options list and won't reflect "Dialog" as the selected
 * value, but the attribute is set correctly and will persist.
 *
 * @since 2.2.0
 */
export function registerModalDialogVariation() {
	registerBlockVariation( 'core/group', {
		name: 'block-actions-modal-dialog',
		title: __( 'Modal Dialog', 'block-actions' ),
		description: __(
			'A native <dialog> container. Give it an HTML anchor, then point a Button with the Modal Toggle action at that id.',
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
				'core/heading',
				{
					level: 2,
					placeholder: __( 'Modal title', 'block-actions' ),
				},
			],
			[
				'core/paragraph',
				{
					placeholder: __( 'Modal body…', 'block-actions' ),
				},
			],
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
		scope: [ 'inserter', 'transform' ],
		isActive: ( blockAttributes ) =>
			blockAttributes?.tagName === 'dialog',
	} );
}
