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
import actions from './action-registry';

/**
 * Action ids hosted on core/query — derived from the registry's
 * `blocks` hosting constraints (single source; mirrors the PHP
 * Query_Params::QUERY_HOSTED_ACTIONS constant server-side).
 *
 * @type {string[]}
 */
const QUERY_HOSTED_ACTIONS = actions
	.filter(
		( action ) =>
			Array.isArray( action.blocks ) &&
			action.blocks.includes( 'core/query' )
	)
	.map( ( action ) => action.id );

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

	/**
	 * An actions-enabled Query Loop — the query-filter/live-search
	 * targeting contract: the query must carry a query-hosted action
	 * (that opt-in is the server-side security boundary) and must not
	 * inherit the template query (inherited queries are structurally
	 * unfilterable).
	 *
	 * @param {Object} block Candidate block.
	 * @return {true|string} True or the reason it doesn't fit.
	 */
	query( block ) {
		if ( block.name !== 'core/query' ) {
			return __(
				'Filter and search targets must be a Query Loop block.',
				'block-actions'
			);
		}
		const action = block.attributes?.customAction;
		if ( ! QUERY_HOSTED_ACTIONS.includes( action ) ) {
			return __(
				'The Query Loop must carry a query action (e.g. Query Pagination — Instant) before triggers can target it.',
				'block-actions'
			);
		}
		if ( block.attributes?.query?.inherit ) {
			return __(
				'Inherited queries ("Inherit query from template") cannot be filtered or searched — turn inheritance off.',
				'block-actions'
			);
		}
		return true;
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
 * @param {Object} block    Candidate block object.
 * @param {Object} targets  Field constraint: { blocks?: string[], shape?: string }.
 * @param {Object} [shapes] Resolved shape map (candidate-scan callers pass it once).
 * @return {true|string} True when eligible; a reason string otherwise.
 */
export function matchesTarget( block, targets = {}, shapes ) {
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
		// Callers iterating many candidates resolve the shape map once
		// and pass it in; the default keeps single checks convenient.
		const predicate = ( shapes || getTargetShapes() )[ targets.shape ];
		if ( typeof predicate === 'function' ) {
			return predicate( block );
		}
	}
	return true;
}
