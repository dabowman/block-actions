/**
 * Interaction validation.
 *
 * One module computes the issues; three surfaces render them (the
 * Interactions panel notice, the block-toolbar indicator, and the
 * pre-publish check). Advisory, never blocking: an unresolved target
 * may legitimately live in a template part this editor can't see, so
 * "not found" is a warning with that caveat, and nothing here ever
 * locks saving.
 *
 * @since 3.1.0
 *
 * @module interaction-validation
 */

import { select } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { flattenBlocks } from './anchor-uniqueness';
import { matchesTarget } from './target-shapes';

/**
 * Issue codes:
 * - `missing-required` (firm) — action chosen, required field empty.
 * - `unresolved-target` (advisory) — anchor matches nothing here.
 * - `ambiguous-target` (firm) — anchor matches several blocks.
 * - `wrong-shape` (firm) — target resolves but fails the shape check.
 *
 * @typedef {Object} InteractionIssue
 * @property {string}  code     One of the codes above.
 * @property {string}  message  Human-readable description.
 * @property {boolean} advisory True when the check can't be definitive.
 */

/**
 * Validate one block's interaction.
 *
 * @since 3.1.0
 *
 * @param {Object} block           The block object (clientId, attributes).
 * @param {Array}  fields          Field definitions for its action.
 * @param {Array}  [orderedBlocks] Flattened block list (computed if omitted).
 * @return {InteractionIssue[]} Issues (empty when clean).
 */
export function validateInteraction( block, fields, orderedBlocks ) {
	const issues = [];
	const { customAction, actionData = {} } = block.attributes || {};
	if ( ! customAction ) {
		return issues;
	}

	const ordered =
		orderedBlocks ||
		flattenBlocks( select( 'core/block-editor' )?.getBlocks() || [] );

	for ( const field of fields ) {
		const value = actionData[ field.key ];

		if ( field.required && ( value === undefined || value === '' ) ) {
			issues.push( {
				code: 'missing-required',
				advisory: false,
				message: sprintf(
					/* translators: %s: field label. */
					__(
						'“%s” is required — the action does nothing until it is set.',
						'block-actions'
					),
					field.label
				),
			} );
			continue;
		}

		if ( field.type !== 'target' || ! value ) {
			continue;
		}

		const matches = ordered.filter(
			( b ) => b.attributes?.anchor === value
		);

		if ( matches.length === 0 ) {
			issues.push( {
				code: 'unresolved-target',
				advisory: true,
				message: sprintf(
					/* translators: %s: anchor id. */
					__(
						'Target “#%s” was not found in this editing context. If it lives in a template or template part this is expected — otherwise check the anchor.',
						'block-actions'
					),
					value
				),
			} );
			continue;
		}

		if ( matches.length > 1 ) {
			issues.push( {
				code: 'ambiguous-target',
				advisory: false,
				message: sprintf(
					/* translators: 1: anchor id, 2: number of blocks. */
					__(
						'Anchor “#%1$s” is used by %2$d blocks — the browser will only ever find the first. Make it unique.',
						'block-actions'
					),
					value,
					matches.length
				),
			} );
			continue;
		}

		const eligible = matchesTarget( matches[ 0 ], field.targets || {} );
		if ( true !== eligible ) {
			issues.push( {
				code: 'wrong-shape',
				advisory: false,
				message: eligible,
			} );
		}
	}

	return issues;
}

/**
 * Validate every action-carrying block in the editing context.
 *
 * @since 3.1.0
 *
 * @param {Function} getFields Resolver: action id → field definitions.
 * @return {Array<{block: Object, issues: InteractionIssue[]}>} Blocks
 *         with at least one issue.
 */
export function validateAll( getFields ) {
	const editor = select( 'core/block-editor' );
	if ( ! editor ) {
		return [];
	}
	const ordered = flattenBlocks( editor.getBlocks() );

	return ordered
		.filter( ( block ) => block.attributes?.customAction )
		.map( ( block ) => ( {
			block,
			issues: validateInteraction(
				block,
				getFields( block.attributes.customAction ),
				ordered
			),
		} ) )
		.filter( ( { issues } ) => issues.length > 0 );
}
