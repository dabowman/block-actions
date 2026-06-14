/**
 * Anchor Uniqueness (editor)
 *
 * Patterns that wire a trigger to a target share a hard-coded anchor id
 * (e.g. the Modal pattern's `block-actions-modal-1`). Insert such a
 * pattern twice and both instances share the id — every trigger then
 * controls the first target, and the duplicate DOM id is invalid.
 *
 * This watches the editor and, when it sees the SAME anchor on two or
 * more blocks (the real signal of a duplicated instance — a single modal
 * with several triggers has only one anchor), re-keys the extra
 * instances to fresh ids, updating both the target block's `anchor` and
 * the paired trigger's `actionData` so the pairing is preserved.
 *
 * @since 3.0.0
 *
 * @module anchor-uniqueness
 */

import { subscribe, select, dispatch } from '@wordpress/data';

/**
 * Map of action id → the `actionData` key that holds its target anchor.
 *
 * @type {Object.<string, string>}
 */
const TARGET_KEYS = {
	'modal-toggle': 'modal',
	'toggle-visibility': 'target',
};

/**
 * Flatten a block tree into a document-ordered array.
 *
 * @since 3.0.0
 *
 * @param {Array} blocks Block list (each may have innerBlocks).
 * @param {Array} [out]  Accumulator.
 * @return {Array} Flat, document-ordered block list.
 */
export function flattenBlocks( blocks, out = [] ) {
	for ( const block of blocks ) {
		out.push( block );
		if ( block.innerBlocks && block.innerBlocks.length ) {
			flattenBlocks( block.innerBlocks, out );
		}
	}
	return out;
}

/**
 * Whether a block is an action trigger referencing the given anchor.
 *
 * @since 3.0.0
 *
 * @param {Object} block  Block object.
 * @param {string} anchor Anchor id to match.
 * @return {boolean} True when the block triggers an action on that anchor.
 */
function triggersAnchor( block, anchor ) {
	const key = TARGET_KEYS[ block.attributes?.customAction ];
	return !! key && block.attributes?.actionData?.[ key ] === anchor;
}

/**
 * Find the trigger paired with a target: the nearest unused trigger
 * before the target (in document order) that references its anchor,
 * falling back to the nearest one after it.
 *
 * @since 3.0.0
 *
 * @param {Array}  ordered   Document-ordered blocks.
 * @param {number} targetIdx Index of the target block.
 * @param {string} anchor    Anchor id.
 * @param {Set}    used      Client ids of triggers already paired.
 * @return {Object|null} The paired trigger block, or null.
 */
function findPairedTrigger( ordered, targetIdx, anchor, used ) {
	for ( let i = targetIdx - 1; i >= 0; i-- ) {
		const b = ordered[ i ];
		if ( ! used.has( b.clientId ) && triggersAnchor( b, anchor ) ) {
			return b;
		}
	}
	for ( let i = targetIdx + 1; i < ordered.length; i++ ) {
		const b = ordered[ i ];
		if ( ! used.has( b.clientId ) && triggersAnchor( b, anchor ) ) {
			return b;
		}
	}
	return null;
}

/**
 * Compute the attribute updates needed to make action anchors unique.
 *
 * Pure: takes a document-ordered block list, returns a list of
 * `{ clientId, attributes }` updates. Keeps the first instance of each
 * shared anchor and re-keys the rest (target anchor + paired trigger).
 *
 * @since 3.0.0
 *
 * @param {Array}    ordered Document-ordered blocks.
 * @param {Function} [genId] Optional id generator ( base ) => string, for tests.
 * @return {Array<{clientId: string, attributes: Object}>} Updates to apply.
 */
export function resolveAnchorCollisions( ordered, genId ) {
	// Group blocks by their anchor.
	const byAnchor = new Map();
	ordered.forEach( ( block, idx ) => {
		const anchor = block.attributes?.anchor;
		if ( anchor ) {
			if ( ! byAnchor.has( anchor ) ) {
				byAnchor.set( anchor, [] );
			}
			byAnchor.get( anchor ).push( { block, idx } );
		}
	} );

	// Default generator: append -2, -3, … avoiding any existing or
	// freshly-minted anchor.
	const existing = new Set(
		ordered.map( ( b ) => b.attributes?.anchor ).filter( Boolean )
	);
	const makeId =
		genId ||
		( ( base ) => {
			let n = 2;
			while ( existing.has( `${ base }-${ n }` ) ) {
				n++;
			}
			const id = `${ base }-${ n }`;
			existing.add( id );
			return id;
		} );

	const updates = [];
	const usedTriggers = new Set();

	for ( const [ anchor, entries ] of byAnchor ) {
		if ( entries.length < 2 ) {
			continue; // Not duplicated — nothing to do.
		}

		entries.forEach( ( { block: target, idx: targetIdx }, i ) => {
			const trigger = findPairedTrigger(
				ordered,
				targetIdx,
				anchor,
				usedTriggers
			);
			if ( trigger ) {
				usedTriggers.add( trigger.clientId );
			}

			// The first instance keeps the shared id.
			if ( i === 0 ) {
				return;
			}

			const newId = makeId( anchor );
			updates.push( {
				clientId: target.clientId,
				attributes: { anchor: newId },
			} );

			if ( trigger ) {
				const key = TARGET_KEYS[ trigger.attributes.customAction ];
				updates.push( {
					clientId: trigger.clientId,
					attributes: {
						actionData: {
							...trigger.attributes.actionData,
							[ key ]: newId,
						},
					},
				} );
			}
		} );
	}

	return updates;
}

/**
 * Wire collision resolution to the block editor. Debounced so it doesn't
 * run on every keystroke; re-entrancy-guarded so applying updates doesn't
 * trigger itself.
 *
 * @since 3.0.0
 *
 * @return {Function} Unsubscribe function.
 */
export function setupAnchorUniqueness() {
	let timer = null;
	let applying = false;

	const run = () => {
		if ( applying ) {
			return;
		}
		const editor = select( 'core/block-editor' );
		if ( ! editor ) {
			return;
		}
		const ordered = flattenBlocks( editor.getBlocks() );
		const updates = resolveAnchorCollisions( ordered );
		if ( ! updates.length ) {
			return;
		}
		applying = true;
		const { updateBlockAttributes } = dispatch( 'core/block-editor' );
		updates.forEach( ( u ) =>
			updateBlockAttributes( u.clientId, u.attributes )
		);
		applying = false;
	};

	return subscribe( () => {
		if ( timer ) {
			clearTimeout( timer );
		}
		timer = setTimeout( run, 300 );
	} );
}
