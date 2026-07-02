/**
 * Pre-publish interactions check.
 *
 * A PluginPrePublishPanel that lists every block whose interaction has
 * validation issues, so problems made after the sidebar was closed are
 * caught at publish time. Clicking a row selects the block. Advisory
 * only — publishing is never blocked (an "unresolved" target may live
 * in a template part this editor can't see).
 *
 * @since 3.1.0
 *
 * @module pre-publish
 */

// Externalized at build time to the wp.plugins / wp.editor globals —
// not npm dependencies, hence the resolver disables.
// eslint-disable-next-line import/no-unresolved
import { registerPlugin } from '@wordpress/plugins';
// eslint-disable-next-line import/no-unresolved
import { PluginPrePublishPanel } from '@wordpress/editor';
import { Button } from '@wordpress/components';
import { select, dispatch } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { validateAll } from './interaction-validation';

/**
 * Human-readable block title for a row.
 *
 * @since 3.1.0
 *
 * @param {Object} block Block object.
 * @return {string} Display title.
 */
function blockTitle( block ) {
	return (
		select( 'core/blocks' )?.getBlockType( block.name )?.title || block.name
	);
}

/**
 * The panel body. Computed per render (the pre-publish sidebar mounts
 * when opened, so the check is fresh); renders nothing when clean.
 *
 * @param {Object}   props           Component props.
 * @param {Function} props.getFields Action id → field definitions.
 * @return {Object|null} Element or null.
 */
export function PrePublishInteractionsCheck( { getFields } ) {
	const results = validateAll( getFields );
	if ( ! results.length ) {
		return null;
	}

	return (
		<PluginPrePublishPanel
			title={ __( 'Interactions', 'block-actions' ) }
			initialOpen
		>
			<p>
				{ __(
					'Some interactions may not work as configured:',
					'block-actions'
				) }
			</p>
			{ results.map( ( { block, issues } ) => (
				<div key={ block.clientId }>
					<Button
						variant="link"
						onClick={ () =>
							dispatch( 'core/block-editor' ).selectBlock(
								block.clientId
							)
						}
						aria-label={ sprintf(
							/* translators: %s: block name. */
							__( 'Select %s block', 'block-actions' ),
							blockTitle( block )
						) }
					>
						{ blockTitle( block ) }
					</Button>
					<ul>
						{ issues.map( ( issue ) => (
							<li key={ issue.code + issue.message }>
								{ issue.message }
							</li>
						) ) }
					</ul>
				</div>
			) ) }
		</PluginPrePublishPanel>
	);
}

/**
 * Register the pre-publish plugin. Guarded: the widgets/site editors
 * don't provide the publish flow (or the plugins API surface may be
 * absent) — registration is skipped rather than fatal.
 *
 * @since 3.1.0
 *
 * @param {Function} getFields Action id → field definitions.
 * @return {void}
 */
export function registerPrePublishCheck( getFields ) {
	if (
		typeof registerPlugin !== 'function' ||
		typeof PluginPrePublishPanel === 'undefined' ||
		! PluginPrePublishPanel
	) {
		return;
	}
	registerPlugin( 'block-actions-pre-publish', {
		render: () => <PrePublishInteractionsCheck getFields={ getFields } />,
	} );
}
