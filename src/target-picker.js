/**
 * Target Picker — pick a block instead of typing an anchor.
 *
 * Replaces free-text "Element ID" fields: a combobox of eligible blocks
 * in the current editing context (icon-less label + snippet + anchor
 * state), filtered by the field's target constraints. Picking a block
 * without an anchor GENERATES one (collision-safe) and writes it onto
 * the target — the stored value stays a plain anchor string, so the
 * frontend contract is untouched.
 *
 * Free-text entry is preserved (ComboboxControl allows it): hand-typed
 * values, power users, and cross-context targets (a modal living in a
 * template part) all keep working.
 *
 * Candidates are computed at render time via select() — no hooks, so
 * the control stays directly callable in the existing test harness. A
 * block added elsewhere appears the next time this block re-renders;
 * validation covers the gap.
 *
 * @since 3.1.0
 *
 * @module target-picker
 */

import { select, dispatch } from '@wordpress/data';
import { ComboboxControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { flattenBlocks, uniqueAnchor } from './anchor-uniqueness';
import { matchesTarget, getTargetShapes } from './target-shapes';

/**
 * A short human label for a candidate block: its display name plus a
 * content snippet or anchor.
 *
 * @since 3.1.0
 *
 * @param {Object} block Block object.
 * @return {string} Option label.
 */
export function candidateLabel( block ) {
	const typeLabel =
		select( 'core/blocks' )?.getBlockType( block.name )?.title ||
		block.name;

	const text = ( block.attributes?.content || block.originalContent || '' )
		.toString()
		.replace( /<[^>]*>/g, '' )
		.trim()
		.slice( 0, 40 );

	const anchor = block.attributes?.anchor
		? `#${ block.attributes.anchor }`
		: __( 'no anchor yet — will be created', 'block-actions' );

	return `${ typeLabel }${ text ? ` — ${ text }` : '' } (${ anchor })`;
}

/**
 * Collect eligible target blocks in the current editing context.
 *
 * @since 3.1.0
 *
 * @param {Object} targets         Field constraint ({ blocks, shape }).
 * @param {string} clientId        The trigger block (excluded from candidates).
 * @param {Array}  [orderedBlocks] Precomputed flattened block list.
 * @return {Array<{block: Object, eligible: true|string}>} Candidates.
 */
export function getTargetCandidates( targets, clientId, orderedBlocks ) {
	const ordered =
		orderedBlocks ||
		flattenBlocks( select( 'core/block-editor' )?.getBlocks() || [] );
	const shapes = getTargetShapes();
	return ordered
		.filter(
			( block ) => block.clientId !== clientId && canCarryAnchor( block )
		)
		.map( ( block ) => ( {
			block,
			eligible: matchesTarget( block, targets, shapes ),
		} ) )
		.filter( ( { eligible } ) => true === eligible );
}

/**
 * Whether a block can actually persist an anchor.
 *
 * A generated anchor on a type without anchor support (Custom HTML,
 * Shortcode, …) never serializes — the target would render with no id
 * and the action silently fail while looking configured. When block
 * type information isn't available, be permissive: a block already
 * carrying an anchor is proof enough.
 *
 * @since 3.1.0
 *
 * @param {Object} block Candidate block.
 * @return {boolean} True when the anchor will persist.
 */
function canCarryAnchor( block ) {
	if ( block.attributes?.anchor ) {
		return true;
	}
	const type = select( 'core/blocks' )?.getBlockType?.( block.name );
	if ( ! type ) {
		return true;
	}
	return !! ( type.supports?.anchor || type.attributes?.anchor );
}

/**
 * Ensure a block carries an anchor, generating a collision-safe one
 * from its block name when missing.
 *
 * @since 3.1.0
 *
 * @param {Object} block Target block object.
 * @return {string} The (possibly new) anchor.
 */
export function ensureAnchor( block ) {
	if ( block.attributes?.anchor ) {
		return block.attributes.anchor;
	}

	const editor = select( 'core/block-editor' );
	const existing = new Set(
		flattenBlocks( editor.getBlocks() )
			.map( ( b ) => b.attributes?.anchor )
			.filter( Boolean )
	);

	// Normalize the WHOLE block name — acme/card must become
	// ba-acme-card, not an invalid id with a slash in it.
	const base = `ba-${ block.name
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^core-/, '' )
		.replace( /^-+|-+$/g, '' ) }`;
	const anchor = uniqueAnchor( base, existing );

	dispatch( 'core/block-editor' ).updateBlockAttributes( block.clientId, {
		anchor,
	} );
	return anchor;
}

/**
 * The picker control. Options are eligible blocks (by generated anchor
 * value); free text falls through unchanged via onFilterValueChange —
 * ComboboxControl only commits listed values, so free text is captured
 * on filter-change with a matching option injected.
 *
 * @since 3.1.0
 *
 * @param {Object}   props                 Component props.
 * @param {Object}   props.field           Field definition (label, help, targets).
 * @param {string}   props.value           Current anchor value.
 * @param {Array}    [props.orderedBlocks] Precomputed flattened block list.
 * @param {string}   props.clientId        The trigger block's clientId.
 * @param {Function} props.onChange        Receives the new anchor string.
 * @return {Object} Element.
 */
export function TargetPicker( {
	field,
	value,
	clientId,
	onChange,
	orderedBlocks,
} ) {
	const candidates = getTargetCandidates(
		field.targets || {},
		clientId,
		orderedBlocks
	);

	const options = candidates.map( ( { block } ) => ( {
		// The committed value for an anchor-less candidate is a marker
		// resolved to a real (generated) anchor in onChange below.
		value: block.attributes?.anchor || `__client:${ block.clientId }`,
		label: candidateLabel( block ),
	} ) );

	// Keep the current value selectable even when it doesn't resolve to
	// a candidate (hand-typed / cross-context target).
	if ( value && ! options.some( ( o ) => o.value === value ) ) {
		options.unshift( {
			value,
			label: sprintf(
				/* translators: %s: anchor id. */
				__( '#%s (current value)', 'block-actions' ),
				value
			),
		} );
	}

	return (
		<ComboboxControl
			label={ field.label }
			value={ value || '' }
			options={ options }
			allowReset
			help={
				field.help ||
				__(
					'Pick a block on this page, or type an anchor id (targets in template parts can be typed).',
					'block-actions'
				)
			}
			onChange={ ( next ) => {
				if ( next && next.startsWith( '__client:' ) ) {
					const targetClientId = next.slice( '__client:'.length );
					const block =
						select( 'core/block-editor' ).getBlock(
							targetClientId
						);
					onChange( block ? ensureAnchor( block ) : '' );
					return;
				}
				onChange( next || '' );
			} }
			onFilterValueChange={ ( text ) => {
				// Free text serves CROSS-CONTEXT targets (template-part
				// anchors that can't be picked from a list). But this
				// callback also fires (a) with the option LABEL right
				// after a pick — downshift rewrites the input — and
				// (b) on every keystroke while the author merely filters
				// the dropdown. Committing those would clobber the real
				// anchor (review #10 blocker). Heuristic: only commit
				// text that matches NO option (not a label, not a label
				// prefix/fragment, not a value) — genuinely novel text
				// is free-text entry; anything resembling the list is
				// filtering.
				if ( typeof text !== 'string' || text === '' ) {
					return;
				}
				const needle = text.toLowerCase();
				const resemblesOption = options.some(
					( option ) =>
						option.value === text ||
						option.label.toLowerCase().includes( needle )
				);
				if ( ! resemblesOption && ! text.startsWith( '__client:' ) ) {
					onChange( text );
				}
			} }
		/>
	);
}
