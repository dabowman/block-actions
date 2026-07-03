/**
 * The Interactions panel.
 *
 * First-class ToolsPanel in the block inspector, replacing the old
 * ComboboxControl buried in the collapsed Advanced section. Structure
 * (the modern core pattern, like Dimensions/Border):
 *
 * - Action: always-shown item (the searchable combobox).
 * - Required fields: always-shown while the action is selected.
 * - Optional fields (`optional: true` in the registry/manifest):
 *   default-hidden ToolsPanelItems with per-item reset.
 * - A validation Notice below the panel, advisory and live-per-render.
 *
 * `<InteractionItem>` renders ONE action + its fields; the panel renders
 * exactly one of them today. That factoring — not a schema change — is
 * this panel's forward-compat obligation to the trigger×behavior×target
 * epic (6.3), which renders a list of items.
 *
 * Everything here is hook-free (state lives in block attributes;
 * candidates/validation are computed per render via select()), keeping
 * the components directly callable in the existing test harness.
 *
 * @since 3.1.0
 *
 * @module interactions-panel
 */

import {
	ComboboxControl,
	Notice,
	// ToolsPanel is the modern core inspector pattern (Dimensions/Border
	// use it); it has shipped under the __experimental prefix for years
	// and is the documented way to build default-hidden/resettable panel
	// items. Accepted per the 6.2 spec decision.
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanel as ToolsPanel,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { InspectorControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { validateInteraction } from './interaction-validation';

/**
 * One interaction: the action selector plus the selected action's
 * fields as ToolsPanelItems.
 *
 * @since 3.1.0
 *
 * @param {Object}   props                Component props.
 * @param {Object}   props.blockConfig    Supported-block config (label/help).
 * @param {Array}    props.actionOptions  Combobox options (incl. None).
 * @param {string}   props.customAction   Current action id.
 * @param {Object}   props.actionData     Current field values.
 * @param {Array}    props.fields         Field definitions for the action.
 * @param {Function} props.onSelectAction Receives the new action id.
 * @param {Function} props.renderField    ( field, value, onChange ) => element.
 * @param {Function} props.setFieldValue  ( key, value ) => void.
 * @return {Array} ToolsPanelItem elements.
 */
export function InteractionItem( {
	blockConfig,
	actionOptions,
	customAction,
	actionData,
	fields,
	onSelectAction,
	renderField,
	setFieldValue,
} ) {
	const items = [
		<ToolsPanelItem
			key="action"
			label={ blockConfig.label }
			hasValue={ () => !! customAction }
			onDeselect={ () => onSelectAction( '' ) }
			isShownByDefault
		>
			<ComboboxControl
				label={ blockConfig.label }
				value={ customAction }
				options={ actionOptions }
				onChange={ ( value ) => onSelectAction( value || '' ) }
				help={ `${ blockConfig.help } ${ __(
					'Choose “None” to remove an action. Actions should be paired with meaningful labels and remain keyboard accessible.',
					'block-actions'
				) }` }
			/>
		</ToolsPanelItem>,
	];

	if ( ! customAction ) {
		return items;
	}

	for ( const field of fields ) {
		const value =
			actionData[ field.key ] !== undefined
				? actionData[ field.key ]
				: field.default;
		const isOptional = field.optional === true && ! field.required;

		items.push(
			<ToolsPanelItem
				key={ field.key }
				label={ field.label }
				// Required/plain fields are part of the action's contract
				// and always visible; `optional: true` fields get the
				// standard default-hidden + per-item-reset affordance.
				isShownByDefault={ ! isOptional }
				// A SET value counts — including a seeded default. (A
				// value!==default check would hide seeded truthy defaults
				// and let reset silently drop them, reintroducing the
				// "default never reaches the frontend" bug the seeding
				// exists to fix.)
				hasValue={ () => actionData[ field.key ] !== undefined }
				onDeselect={ () =>
					// Reset means "back to the default"; meaningful
					// defaults stay materialized so they serialize.
					setFieldValue(
						field.key,
						field.default ? field.default : undefined
					)
				}
			>
				{ renderField( field, value, ( newValue ) =>
					setFieldValue( field.key, newValue )
				) }
			</ToolsPanelItem>
		);
	}

	return items;
}

/**
 * The full Interactions sidebar section for one block.
 *
 * @since 3.1.0
 *
 * @param {Object}   props                Component props.
 * @param {Object}   props.block          { clientId, name, attributes }.
 * @param {Object}   props.blockConfig    Supported-block config.
 * @param {Array}    props.actionOptions  Combobox options.
 * @param {Array}    props.fields         Field definitions for the action.
 * @param {Function} props.onSelectAction Action-change handler.
 * @param {Function} props.renderField    Field renderer.
 * @param {Array}    [props.issues]       Precomputed validation issues.
 * @param {Function} props.setFieldValue  Field setter.
 * @param {Function} props.onResetAll     Clears the whole interaction.
 * @return {Object} Element.
 */
export function InteractionsPanel( {
	block,
	blockConfig,
	actionOptions,
	fields,
	onSelectAction,
	renderField,
	setFieldValue,
	onResetAll,
	issues: issuesProp,
} ) {
	const { customAction, actionData = {} } = block.attributes;
	// The HOC precomputes issues (it needs them for the toolbar anyway);
	// standalone use falls back to computing here.
	const issues =
		issuesProp ??
		( customAction ? validateInteraction( block, fields ) : [] );

	return (
		<InspectorControls>
			<ToolsPanel
				label={ __( 'Interactions', 'block-actions' ) }
				resetAll={ onResetAll }
			>
				<InteractionItem
					blockConfig={ blockConfig }
					actionOptions={ actionOptions }
					customAction={ customAction }
					actionData={ actionData }
					fields={ fields }
					onSelectAction={ onSelectAction }
					renderField={ renderField }
					setFieldValue={ setFieldValue }
				/>
			</ToolsPanel>
			{ issues.length > 0 && (
				<Notice status="warning" isDismissible={ false }>
					{ issues.map( ( issue ) => (
						<p key={ issue.code + issue.message }>
							{ issue.message }
						</p>
					) ) }
				</Notice>
			) }
		</InspectorControls>
	);
}
