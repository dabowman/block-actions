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
	SelectControl,
	TextControl,
	ToggleControl,
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
 * @param {Object}   props                       Component props.
 * @param {Object}   props.blockConfig           Supported-block config (label/help).
 * @param {Array}    props.actionOptions         Combobox options (incl. None).
 * @param {string}   props.customAction          Current action id.
 * @param {Object}   props.actionData            Current field values.
 * @param {Array}    props.fields                Field definitions for the action.
 * @param {Function} props.onSelectAction        Receives the new action id.
 * @param {Object}   props.actionDef             The selected action's registry definition.
 * @param {Object}   props.interactionSettings   Trigger/conditions state.
 * @param {Function} props.setInteractionSetting ( key, value ) => void.
 * @param {Function} props.renderField           ( field, value, onChange ) => element.
 * @param {Function} props.setFieldValue         ( key, value ) => void.
 * @return {Array} ToolsPanelItem elements.
 */
export function InteractionItem( {
	blockConfig,
	actionOptions,
	customAction,
	actionData,
	fields,
	actionDef,
	interactionSettings = {},
	setInteractionSetting,
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
				hasValue={ () =>
					actionData[ field.key ] !== undefined &&
					actionData[ field.key ] !== field.default
				}
				onDeselect={ () => setFieldValue( field.key, undefined ) }
			>
				{ renderField( field, value, ( newValue ) =>
					setFieldValue( field.key, newValue )
				) }
			</ToolsPanelItem>
		);
	}

	// Trigger selection + conditions — behavioral actions only.
	// Structural actions (carousel) own their whole lifecycle; trigger
	// choice is meaningless there and the UI is hidden.
	const behavioral =
		actionDef &&
		! actionDef.structural &&
		Array.isArray( actionDef.triggers ) &&
		actionDef.triggers.length > 0;

	if ( behavioral && setInteractionSetting ) {
		const trigger =
			interactionSettings.trigger || actionDef.defaultTrigger || 'click';
		const triggerLabels = {
			click: __( 'Click', 'block-actions' ),
			hover: __( 'Hover / focus', 'block-actions' ),
			'scroll-into-view': __( 'Scrolled into view', 'block-actions' ),
			load: __( 'Page load', 'block-actions' ),
			timer: __( 'Timer', 'block-actions' ),
		};

		items.push(
			<ToolsPanelItem
				key="trigger"
				label={ __( 'Trigger', 'block-actions' ) }
				isShownByDefault
				hasValue={ () => trigger !== 'click' }
				onDeselect={ () =>
					setInteractionSetting( 'trigger', undefined )
				}
			>
				<SelectControl
					label={ __( 'Trigger', 'block-actions' ) }
					value={ trigger }
					options={ actionDef.triggers.map( ( t ) => ( {
						value: t,
						label: triggerLabels[ t ] || t,
					} ) ) }
					onChange={ ( value ) =>
						setInteractionSetting( 'trigger', value )
					}
					help={ __(
						'When this action fires. Hover always pairs with keyboard focus.',
						'block-actions'
					) }
				/>
			</ToolsPanelItem>
		);

		if ( trigger === 'timer' ) {
			items.push(
				<ToolsPanelItem
					key="delay"
					label={ __( 'Delay (ms)', 'block-actions' ) }
					isShownByDefault
					hasValue={ () => !! interactionSettings.delay }
					onDeselect={ () =>
						setInteractionSetting( 'delay', undefined )
					}
				>
					<TextControl
						label={ __( 'Delay (ms)', 'block-actions' ) }
						type="number"
						value={ String( interactionSettings.delay || 4000 ) }
						onChange={ ( value ) =>
							setInteractionSetting(
								'delay',
								Number( value ) || 4000
							)
						}
					/>
				</ToolsPanelItem>
			);
		}

		items.push(
			<ToolsPanelItem
				key="minWidth"
				label={ __( 'Min viewport width (px)', 'block-actions' ) }
				isShownByDefault={ false }
				hasValue={ () => !! interactionSettings.minWidth }
				onDeselect={ () =>
					setInteractionSetting( 'minWidth', undefined )
				}
			>
				<TextControl
					label={ __( 'Min viewport width (px)', 'block-actions' ) }
					type="number"
					value={ String( interactionSettings.minWidth || '' ) }
					onChange={ ( value ) =>
						setInteractionSetting(
							'minWidth',
							Number( value ) || undefined
						)
					}
					help={ __(
						'Only fire at or above this viewport width (checked when the trigger fires).',
						'block-actions'
					) }
				/>
			</ToolsPanelItem>,
			<ToolsPanelItem
				key="maxWidth"
				label={ __( 'Max viewport width (px)', 'block-actions' ) }
				isShownByDefault={ false }
				hasValue={ () => !! interactionSettings.maxWidth }
				onDeselect={ () =>
					setInteractionSetting( 'maxWidth', undefined )
				}
			>
				<TextControl
					label={ __( 'Max viewport width (px)', 'block-actions' ) }
					type="number"
					value={ String( interactionSettings.maxWidth || '' ) }
					onChange={ ( value ) =>
						setInteractionSetting(
							'maxWidth',
							Number( value ) || undefined
						)
					}
				/>
			</ToolsPanelItem>,
			<ToolsPanelItem
				key="reducedMotion"
				label={ __( 'Reduced motion', 'block-actions' ) }
				isShownByDefault={ false }
				hasValue={ () => interactionSettings.reducedMotion === true }
				onDeselect={ () =>
					setInteractionSetting( 'reducedMotion', undefined )
				}
			>
				<ToggleControl
					label={ __(
						'Skip for reduced-motion visitors',
						'block-actions'
					) }
					checked={ interactionSettings.reducedMotion === true }
					onChange={ ( value ) =>
						setInteractionSetting(
							'reducedMotion',
							value ? true : undefined
						)
					}
					help={ __(
						'Don\u2019t run this interaction when the visitor prefers reduced motion.',
						'block-actions'
					) }
				/>
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
 * @param {Object}   props                       Component props.
 * @param {Object}   props.block                 { clientId, name, attributes }.
 * @param {Object}   props.blockConfig           Supported-block config.
 * @param {Array}    props.actionOptions         Combobox options.
 * @param {Array}    props.fields                Field definitions for the action.
 * @param {Function} props.onSelectAction        Action-change handler.
 * @param {Function} props.renderField           Field renderer.
 * @param {Object}   props.actionDef             The selected action's registry definition.
 * @param {Object}   props.interactionSettings   Trigger/conditions state.
 * @param {Function} props.setInteractionSetting ( key, value ) => void.
 * @param {Function} props.setFieldValue         Field setter.
 * @param {Function} props.onResetAll            Clears the whole interaction.
 * @return {Object} Element.
 */
export function InteractionsPanel( {
	block,
	blockConfig,
	actionOptions,
	fields,
	actionDef,
	interactionSettings,
	setInteractionSetting,
	onSelectAction,
	renderField,
	setFieldValue,
	onResetAll,
} ) {
	const { customAction, actionData = {} } = block.attributes;
	const issues = customAction ? validateInteraction( block, fields ) : [];

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
					actionDef={ actionDef }
					interactionSettings={ interactionSettings }
					setInteractionSetting={ setInteractionSetting }
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
