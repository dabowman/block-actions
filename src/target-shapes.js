/**
 * Named target-shape predicates.
 *
 * A `type: 'target'` field may constrain WHAT it can point at beyond
 * block types — "a dialog-shaped group", "an actions-enabled query".
 * Manifests are JSON and can't ship code, so shapes are named here and
 * referenced by string; themes/plugins register their own via the
 * `blockActions.targetShapes` filter.
 *
 * A predicate receives the candidate block object and returns true
 * (eligible) or a string (ineligible, human-readable reason — used by
 * validation's "wrong shape" messages).
 *
 * @since 3.1.0
 *
 * @module target-shapes
 */

import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const BUILT_IN_SHAPES = {
	/**
	 * A native-dialog Group (the plugin's Dialog variation) — the
	 * modal-toggle contract.
	 *
	 * @param {Object} block Candidate block.
	 * @return {true|string} True or the reason it doesn't fit.
	 */
	dialog( block ) {
		if (
			block.name === 'core/group' &&
			block.attributes?.tagName === 'dialog'
		) {
			return true;
		}
		return __(
			'Modal targets must be a Group block using the Dialog variation (<dialog> element).',
			'block-actions'
		);
	},
};

/**
 * Resolve the current shape-predicate map (built-ins + filter additions).
 *
 * @since 3.1.0
 *
 * @return {Object.<string, Function>} shape name → predicate.
 */
export function getTargetShapes() {
	return applyFilters( 'blockActions.targetShapes', { ...BUILT_IN_SHAPES } );
}

/**
 * Check a candidate block against a field's target constraints.
 *
 * @since 3.1.0
 *
 * @param {Object} block   Candidate block object.
 * @param {Object} targets Field constraint: { blocks?: string[], shape?: string }.
 * @return {true|string} True when eligible; a reason string otherwise.
 */
export function matchesTarget( block, targets = {} ) {
	if (
		Array.isArray( targets.blocks ) &&
		targets.blocks.length &&
		! targets.blocks.includes( block.name )
	) {
		return __(
			'Block type not eligible for this action.',
			'block-actions'
		);
	}
	if ( targets.shape ) {
		const predicate = getTargetShapes()[ targets.shape ];
		if ( typeof predicate === 'function' ) {
			return predicate( block );
		}
	}
	return true;
}
