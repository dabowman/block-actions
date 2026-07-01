/**
 * Anchor Uniqueness (editor)
 *
 * Patterns that wire a trigger to a target share a hard-coded anchor id
 * (e.g. the Modal pattern's `block-actions-modal-1`). Insert such a
 * pattern twice and both instances share the id — every trigger then
 * controls the first target, and the duplicate DOM id is invalid.
 *
 * Resolution is scoped to insertion: the watcher diffs the editor's
 * client ids and only ever re-keys blocks that were just added, so a
 * freshly opened post is never touched (no dirty-on-load), saved
 * duplicates the user may rely on are left alone, and only anchors that
 * an action trigger actually references participate (two headings that
 * happen to share an anchor are none of our business). Re-keys are
 * marked non-persistent so they fold into the insertion's own undo step
 * instead of fighting Cmd+Z.
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
 * The anchor a block's action references, if any.
 *
 * @since 3.0.0
 *
 * @param {Object} block Block object.
 * @return {string|undefined} Referenced anchor id, or undefined.
 */
function referencedAnchor( block ) {
	const key = TARGET_KEYS[ block.attributes?.customAction ];
	return key ? block.attributes?.actionData?.[ key ] : undefined;
}

/**
 * Compute the attribute updates needed to make action anchors unique.
 *
 * Pure: takes a document-ordered block list and the set of client ids
 * that were just inserted, returns a list of `{ clientId, attributes }`
 * updates. Only anchors referenced by an action trigger participate;
 * only newly-inserted blocks are ever re-keyed. Pre-existing holders of
 * an anchor always keep it; when a collision is entirely among new
 * blocks (a multi-copy paste), the first keeps it. Every NEW trigger
 * referencing a re-keyed anchor is rewired to the nearest target in
 * document order (ties prefer the following target, matching the
 * trigger-before-target shape of the shipped patterns).
 *
 * @since 3.0.0
 *
 * @param {Array}    ordered Document-ordered blocks.
 * @param {Set}      newIds  Client ids of just-inserted blocks.
 * @param {Function} [genId] Optional id generator ( base ) => string, for tests.
 * @return {Array<{clientId: string, attributes: Object}>} Updates to apply.
 */
export function resolveAnchorCollisions( ordered, newIds, genId ) {
	// Anchors an action trigger points at — the only ones we may touch.
	const referenced = new Set();
	ordered.forEach( ( block ) => {
		const anchor = referencedAnchor( block );
		if ( anchor ) {
			referenced.add( anchor );
		}
	} );

	// Group anchored blocks by referenced anchor.
	const byAnchor = new Map();
	ordered.forEach( ( block, idx ) => {
		const anchor = block.attributes?.anchor;
		if ( anchor && referenced.has( anchor ) ) {
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

	for ( const [ anchor, entries ] of byAnchor ) {
		if ( entries.length < 2 ) {
			continue; // Not duplicated — nothing to do.
		}

		// Pre-existing holders always keep the anchor; if none exist,
		// the first new holder keeps it. Every other NEW holder is
		// re-keyed. (Old blocks are never mutated.)
		const hasOldHolder = entries.some(
			( { block } ) => ! newIds.has( block.clientId )
		);
		const kept = hasOldHolder ? -1 : 0; // Index into entries.
		const targetAnchors = new Map(); // entry idx → final anchor.

		entries.forEach( ( { block }, i ) => {
			if ( ! newIds.has( block.clientId ) ) {
				targetAnchors.set( i, anchor );
				return;
			}
			if ( i === kept ) {
				targetAnchors.set( i, anchor );
				return;
			}
			const newId = makeId( anchor );
			targetAnchors.set( i, newId );
			updates.push( {
				clientId: block.clientId,
				attributes: { anchor: newId },
			} );
		} );

		// Rewire NEW triggers referencing this anchor. A trigger that
		// arrived in the insertion belongs with the insertion's own
		// target(s), so only NEW holders are candidates; when the paste
		// contained several copies, the nearest one wins (document
		// distance; ties prefer the following target, matching the
		// trigger-before-target shape of the shipped patterns).
		const newEntries = entries
			.map( ( entry, i ) => ( { ...entry, i } ) )
			.filter( ( { block } ) => newIds.has( block.clientId ) );
		if ( ! newEntries.length ) {
			continue;
		}
		ordered.forEach( ( block, idx ) => {
			if (
				! newIds.has( block.clientId ) ||
				referencedAnchor( block ) !== anchor
			) {
				return;
			}
			let best = null;
			let bestDist = Infinity;
			newEntries.forEach( ( { idx: targetIdx, i } ) => {
				const dist = Math.abs( targetIdx - idx );
				const better =
					dist < bestDist || ( dist === bestDist && targetIdx > idx );
				if ( better ) {
					best = i;
					bestDist = dist;
				}
			} );
			const finalAnchor = targetAnchors.get( best );
			if ( finalAnchor && finalAnchor !== anchor ) {
				const key = TARGET_KEYS[ block.attributes.customAction ];
				updates.push( {
					clientId: block.clientId,
					attributes: {
						actionData: {
							...block.attributes.actionData,
							[ key ]: finalAnchor,
						},
					},
				} );
			}
		} );
	}

	return updates;
}

/**
 * Wire collision resolution to the block editor.
 *
 * Debounced, and scoped to insertion: the first tick only seeds the set
 * of known client ids; later ticks act only when new ids appear. Updates
 * are marked non-persistent so they ride along with the insertion's own
 * undo step.
 *
 * @since 3.0.0
 *
 * @return {Function} Unsubscribe function.
 */
export function setupAnchorUniqueness() {
	let timer = null;
	let knownIds = null;

	const run = () => {
		const editor = select( 'core/block-editor' );
		if ( ! editor ) {
			return;
		}
		const ids = editor.getClientIdsWithDescendants();

		// First tick: the post is loading/hydrating. Record what exists
		// and never touch it — saved content is not ours to "fix".
		if ( null === knownIds ) {
			knownIds = new Set( ids );
			return;
		}

		const newIds = new Set();
		for ( const id of ids ) {
			if ( ! knownIds.has( id ) ) {
				newIds.add( id );
			}
		}
		knownIds = new Set( ids );
		if ( ! newIds.size ) {
			return;
		}

		const ordered = flattenBlocks( editor.getBlocks() );
		const updates = resolveAnchorCollisions( ordered, newIds );
		if ( ! updates.length ) {
			return;
		}
		const {
			updateBlockAttributes,
			__unstableMarkNextChangeAsNotPersistent,
		} = dispatch( 'core/block-editor' );
		updates.forEach( ( u ) => {
			// Fold each re-key into the triggering insertion's undo step
			// instead of creating one Cmd+Z has to fight through.
			if ( __unstableMarkNextChangeAsNotPersistent ) {
				__unstableMarkNextChangeAsNotPersistent();
			}
			updateBlockAttributes( u.clientId, u.attributes );
		} );
	};

	return subscribe( () => {
		if ( timer ) {
			clearTimeout( timer );
		}
		timer = setTimeout( run, 300 );
	} );
}
