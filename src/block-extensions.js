/**
 * Block Extensions
 *
 * This module extends WordPress blocks with custom actions and data attributes.
 * It provides a user interface in the block editor for selecting actions and
 * adding custom data attributes to blocks.
 *
 * Key Features:
 * - Adds custom data attributes to any block
 * - Adds action selection to supported blocks
 * - Provides searchable combobox for action selection
 * - Handles saving of attributes to block HTML
 *
 * @module block-extensions
 */

import { addFilter, applyFilters } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { Fragment } from '@wordpress/element';
import {
	InspectorAdvancedControls,
	BlockControls,
} from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	ToolbarGroup,
	ToolbarButton,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import actions from './action-registry';
import { registerModalDialogVariation } from './block-variations';
import { setupAnchorUniqueness } from './anchor-uniqueness';
import { InteractionsPanel } from './interactions-panel';
import { TargetPicker } from './target-picker';
import { validateInteraction } from './interaction-validation';
import { registerPrePublishCheck } from './pre-publish';
import './block-variations.css';

/**
 * Registry for theme actions in editor context.
 *
 * @since 1.0.0
 *
 * @type {Array}
 */
const editorActionRegistry = [];

/**
 * Register a theme action in the editor.
 * In the editor, we just store the registration for the dropdown.
 * The actual execution happens on the frontend.
 *
 * Supports two call signatures for backward compatibility:
 * - registerEditorAction(id, label, init) — original, no fields
 * - registerEditorAction(id, label, fields, init) — with field definitions
 *
 * @since 1.0.0
 *
 * @param {string}              id           Action ID.
 * @param {string}              label        Action label.
 * @param {Array|Function|null} fieldsOrInit Field definitions array or init function.
 * @param {Function|null}       [maybeInit]  Init function when fields are provided.
 * @return {boolean} Success status.
 */
function registerEditorAction( id, label, fieldsOrInit, maybeInit ) {
	const prefix = '[Block Actions]';

	// Validate parameters
	if ( ! id || typeof id !== 'string' ) {
		console.error( `${ prefix } Action ID must be a non-empty string` );
		return false;
	}

	if ( ! label || typeof label !== 'string' ) {
		console.error( `${ prefix } Action label must be a non-empty string` );
		return false;
	}

	// Resolve fields and init from flexible arguments
	let fields = [];
	let init = null;

	if ( Array.isArray( fieldsOrInit ) ) {
		fields = fieldsOrInit;
		init = maybeInit || null;
	} else if ( typeof fieldsOrInit === 'function' ) {
		init = fieldsOrInit;
	}

	// Validate fields
	const validTypes = [ 'text', 'number', 'toggle', 'target' ];
	for ( const field of fields ) {
		if ( ! field.key || typeof field.key !== 'string' ) {
			console.error( `${ prefix } Field key must be a non-empty string` );
			return false;
		}
		if (
			! field.dataAttribute ||
			typeof field.dataAttribute !== 'string' ||
			! field.dataAttribute.startsWith( 'data-' ) ||
			// Reserved: `data-action` routes to the renderer and the
			// `data-wp-` namespace is live Interactivity directives — a
			// field value must never be able to occupy either. (Mirrors
			// the server-side sanitize_manifest_fields rule.)
			field.dataAttribute === 'data-action' ||
			field.dataAttribute.startsWith( 'data-wp-' )
		) {
			console.error(
				`${ prefix } Field dataAttribute must be a plain data-* attribute (data-action and data-wp-* are reserved)`
			);
			return false;
		}
		if ( field.type && ! validTypes.includes( field.type ) ) {
			console.error(
				`${ prefix } Field type must be one of: ${ validTypes.join(
					', '
				) }`
			);
			return false;
		}
	}

	// Check if action already exists
	if ( editorActionRegistry.some( ( a ) => a.id === id ) ) {
		return false;
	}

	// Register the action (just for the dropdown, won't execute in editor)
	editorActionRegistry.push( { id, label, fields, init } );

	return true;
}

/**
 * Get all registered actions in editor (built-in + theme).
 *
 * @since 1.0.0
 *
 * @return {Array} Array of action objects.
 */
function getEditorRegisteredActions() {
	const builtInActions = actions.map( ( { id, label, fields, blocks } ) => ( {
		id,
		label,
		fields: fields || [],
		blocks,
	} ) );
	const themeActions = editorActionRegistry.map(
		( { id, label, fields, blocks } ) => ( {
			id,
			label,
			fields: fields || [],
			blocks,
		} )
	);
	return [ ...builtInActions, ...themeActions ];
}

/**
 * Get field definitions for a specific action.
 *
 * @since 2.1.0
 *
 * @param {string} actionId The action ID.
 * @return {Array} Array of field definitions, empty if none.
 */
function getFieldsForAction( actionId ) {
	if ( ! actionId ) {
		return [];
	}
	const allActions = getEditorRegisteredActions();
	const action = allActions.find( ( a ) => a.id === actionId );
	return action?.fields || [];
}

/**
 * Render the control for ONE action field.
 *
 * Maps a field definition to its editor component. `type: 'target'`
 * fields render the TargetPicker (pick a block; the anchor is created
 * for you) instead of a hand-typed id.
 *
 * @since 3.1.0
 *
 * @param {Object}   field    Field definition.
 * @param {*}        value    Current value (or the field default).
 * @param {Function} onChange Receives the new value.
 * @param {string}   clientId The host block's clientId (target fields).
 * @return {Object} Element.
 */
function renderFieldControl( field, value, onChange, clientId ) {
	// Advisory (never save-blocking): a required field left empty
	// means the action silently does nothing on the frontend — say so
	// where the author is looking.
	const requiredWarning =
		field.required && ( value === undefined || value === '' )
			? __(
					'Required — the action does nothing until this is set.',
					'block-actions'
			  )
			: '';
	const helpWithWarning = requiredWarning
		? `${ requiredWarning } ${ field.help || '' }`.trim()
		: field.help || '';

	switch ( field.type ) {
		case 'target':
			return (
				<TargetPicker
					key={ field.key }
					field={ { ...field, help: helpWithWarning } }
					value={ value || '' }
					clientId={ clientId }
					onChange={ onChange }
				/>
			);
		case 'number':
			return (
				<TextControl
					key={ field.key }
					label={ field.label }
					type="number"
					value={
						value !== undefined && value !== null
							? String( value )
							: ''
					}
					onChange={ ( val ) => {
						let parsed = 0;
						if ( val !== '' ) {
							parsed = Number( val );
						} else if ( field.default !== undefined ) {
							parsed = field.default;
						}
						onChange( parsed );
					} }
					help={ helpWithWarning }
				/>
			);
		case 'toggle':
			return (
				<ToggleControl
					key={ field.key }
					label={ field.label }
					checked={ !! value }
					onChange={ onChange }
					help={ helpWithWarning }
				/>
			);
		case 'text':
		default:
			return (
				<TextControl
					key={ field.key }
					label={ field.label }
					value={ value || '' }
					onChange={ onChange }
					help={ helpWithWarning }
				/>
			);
	}
}

// Expose registration API globally for theme actions (editor dropdown)
if ( typeof window !== 'undefined' ) {
	window.BlockActions = window.BlockActions || {};
	window.BlockActions.registerAction = registerEditorAction;
	window.BlockActions.getRegisteredActions = getEditorRegisteredActions;

	// Auto-register theme actions passed via wp_localize_script from PHP.
	// This replaces the previous approach of loading theme action ES modules
	// as classic scripts (which failed due to ES module syntax). Inspector
	// fields come from the action's optional JSON manifest.
	if ( Array.isArray( window.blockActionsThemeActions ) ) {
		window.blockActionsThemeActions.forEach( ( action ) => {
			if ( action.id && action.label ) {
				registerEditorAction(
					action.id,
					action.label,
					Array.isArray( action.fields ) ? action.fields : [],
					() => {}
				);
			}
		} );
	}
}

/**
 * Centralized logging utility for block extensions.
 *
 * @since 1.0.0
 *
 * @param {string}     type    Log type: 'error' or 'warning'.
 * @param {string}     message Log message to display.
 * @param {Error|null} [error] Optional error object for error logs.
 * @return {void}
 */
function log( type, message, error = null ) {
	const prefix = '[Block Actions]';
	if ( type === 'error' ) {
		console.error( `${ prefix } ${ message }`, error || '' );
	} else if ( type === 'warning' ) {
		console.warn( `${ prefix } ${ message }` );
	}
}

/**
 * Configuration object defining which blocks can have actions and their UI labels.
 * To add action support to a new block type, add an entry here.
 *
 * @since 1.0.0
 *
 * @type {Object.<string, {label: string, help: string}>}
 */
const BLOCKS_WITH_ACTIONS = {
	'core/button': {
		label: __( 'Button Action', 'block-actions' ),
		help: __(
			'Select a custom action to apply to this button block.',
			'block-actions'
		),
	},
	'core/group': {
		label: __( 'Group Action', 'block-actions' ),
		help: __(
			'Select a custom action to apply to this group block.',
			'block-actions'
		),
	},
	'core/query': {
		label: __( 'Query Action', 'block-actions' ),
		help: __(
			'Add instant pagination or infinite scroll to this Query Loop. Also required before filter/search triggers can target it.',
			'block-actions'
		),
	},
	'core/search': {
		label: __( 'Search Action', 'block-actions' ),
		help: __(
			'Wire this search box to a Query Loop for live results.',
			'block-actions'
		),
	},
};

/**
 * Get the map of blocks that support actions, filtered so themes and
 * plugins can opt additional block types in.
 *
 * Resolved at call time (not memoized) so a filter registered after this
 * module loads still applies. Routes the whole pipeline — attribute
 * registration, the inspector control, and save output — through one
 * source of truth.
 *
 * Example, from a theme/plugin editor script:
 *
 *     import { addFilter } from '@wordpress/hooks';
 *     addFilter(
 *         'blockActions.supportedBlocks',
 *         'my-theme/image-actions',
 *         ( blocks ) => ( {
 *             ...blocks,
 *             'core/image': {
 *                 label: 'Image Action',
 *                 help: 'Add an action to this image.',
 *             },
 *         } )
 *     );
 *
 * @since 3.0.0
 *
 * @return {Object.<string, {label: string, help: string}>} Supported blocks map.
 */
function getSupportedBlocks() {
	return applyFilters( 'blockActions.supportedBlocks', BLOCKS_WITH_ACTIONS );
}

/**
 * Adds custom attributes to blocks during registration.
 *
 * customAction/actionData are registered on EVERY block type, not just
 * currently-supported ones: this filter runs once per block at
 * registration time, while the inspector and save filters resolve
 * `blockActions.supportedBlocks` at call time. Gating registration on
 * the support map would break blocks opted in by a filter that loads
 * after the block registered — the inspector would appear and set
 * attributes that were never registered, so they'd fail to round-trip
 * (or invalidate the block) on reload. Unused registered attributes
 * cost nothing: with empty defaults they don't serialize.
 *
 * @since 1.0.0
 *
 * @param {Object} settings Block type settings from WordPress.
 * @return {Object} Modified block type settings with custom attributes.
 */
function addCustomDataAttribute( settings ) {
	try {
		settings.attributes = {
			...settings.attributes,
			customData: {
				type: 'string',
				default: '',
			},
			customAction: {
				type: 'string',
				default: '',
			},
			actionData: {
				type: 'object',
				default: {},
			},
		};

		return settings;
	} catch ( error ) {
		log(
			'error',
			`Failed to add custom attributes to block ${
				settings?.name || 'unknown'
			}`,
			error
		);
		return settings; // Return unmodified settings on error
	}
}

/**
 * Higher-order component that adds the custom data attribute inspector control.
 * This control appears in the advanced panel of all blocks.
 *
 * @since 1.0.0
 *
 * @param {Function} BlockEdit The original BlockEdit component.
 * @return {Function} Enhanced BlockEdit component with custom data inspector control.
 */
const withInspectorControl = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		try {
			const { attributes, setAttributes } = props;
			const { customData } = attributes;

			return (
				<Fragment>
					<BlockEdit { ...props } />
					<InspectorAdvancedControls>
						<TextControl
							label={ __( 'Data Attribute', 'block-actions' ) }
							value={ customData || '' }
							onChange={ ( value ) =>
								setAttributes( { customData: value } )
							}
							help={ __(
								'Enter a custom data attribute value. This will be added as data-custom to the block. Example: analytics hook or CSS selector target.',
								'block-actions'
							) }
						/>
					</InspectorAdvancedControls>
				</Fragment>
			);
		} catch ( error ) {
			log(
				'error',
				'Error rendering custom data inspector control',
				error
			);
			return <BlockEdit { ...props } />;
		}
	};
}, 'withInspectorControl' );

/**
 * Higher-order component that adds the action selector to supported blocks.
 * Uses ComboboxControl for searchable action selection.
 *
 * @since 1.0.0
 *
 * @param {Function} BlockEdit The original BlockEdit component.
 * @return {Function} Enhanced BlockEdit component with action inspector control.
 */
const withActionInspectorControl = createHigherOrderComponent(
	( BlockEdit ) => {
		return ( props ) => {
			try {
				// Only apply to blocks that support actions
				const supportedBlocks = getSupportedBlocks();
				if ( ! supportedBlocks[ props.name ] ) {
					return <BlockEdit { ...props } />;
				}

				const { attributes, setAttributes, clientId } = props;
				const { customAction, actionData = {} } = attributes;
				const blockConfig = supportedBlocks[ props.name ];
				const fields = getFieldsForAction( customAction );

				// Create action options from all registered actions
				// (built-in + theme). ComboboxControl filters these
				// internally as the user types. Actions declaring a
				// `blocks` hosting constraint only appear in those
				// blocks' dropdowns (query-paginate on core/query, not
				// on a button); unconstrained actions appear everywhere.
				const allActions = getEditorRegisteredActions().filter(
					( action ) =>
						! action.blocks || action.blocks.includes( props.name )
				);
				const actionOptions = [
					{ value: '', label: __( 'None', 'block-actions' ) },
					...allActions.map( ( action ) => ( {
						value: action.id,
						label: action.label,
					} ) ),
				];

				const onSelectAction = ( value ) => {
					try {
						// Seed actionData with the fields' meaningful
						// defaults — display-only defaults never reached
						// the saved markup. Falsy defaults ('' / false /
						// 0) are equivalent to absent and stay unseeded.
						const seeded = {};
						getFieldsForAction( value ).forEach( ( f ) => {
							if ( f.default ) {
								seeded[ f.key ] = f.default;
							}
						} );
						setAttributes( {
							customAction: value,
							actionData: seeded,
						} );
					} catch ( error ) {
						log( 'error', 'Failed to set action attribute', error );
					}
				};

				const setFieldValue = ( key, newValue ) => {
					const next = { ...actionData };
					if ( newValue === undefined ) {
						delete next[ key ];
					} else {
						next[ key ] = newValue;
					}
					setAttributes( { actionData: next } );
				};

				// Glanceable per-block indicator (the List View spike's
				// fallback): Gutenberg exposes no supported API for
				// decorating List View rows, so the indicator lives in
				// the block toolbar instead — visible wherever the block
				// is selected, warning-labelled when validation found
				// issues.
				const issues = customAction
					? validateInteraction( { clientId, attributes }, fields )
					: [];
				const actionLabel =
					allActions.find( ( a ) => a.id === customAction )?.label ||
					customAction;

				return (
					<Fragment>
						<BlockEdit { ...props } />
						{ !! customAction && (
							<BlockControls group="other">
								<ToolbarGroup>
									<ToolbarButton
										icon="admin-links"
										label={
											issues.length
												? sprintf(
														/* translators: %s: action label. */
														__(
															'Interaction: %s — needs attention',
															'block-actions'
														),
														actionLabel
												  )
												: sprintf(
														/* translators: %s: action label. */
														__(
															'Interaction: %s',
															'block-actions'
														),
														actionLabel
												  )
										}
										isPressed={ issues.length > 0 }
									/>
								</ToolbarGroup>
							</BlockControls>
						) }
						<InteractionsPanel
							block={ { clientId, name: props.name, attributes } }
							blockConfig={ blockConfig }
							actionOptions={ actionOptions }
							fields={ fields }
							onSelectAction={ onSelectAction }
							renderField={ ( field, value, onChange ) =>
								renderFieldControl(
									field,
									value,
									onChange,
									clientId
								)
							}
							setFieldValue={ setFieldValue }
							onResetAll={ () => onSelectAction( '' ) }
						/>
					</Fragment>
				);
			} catch ( error ) {
				log(
					'error',
					'Error rendering action inspector control',
					error
				);
				return <BlockEdit { ...props } />;
			}
		};
	},
	'withActionInspectorControl'
);

/**
 * Adds custom data and action attributes to block HTML.
 * This function runs when the block is saved.
 *
 * @since 1.0.0
 *
 * @param {Object} extraProps Additional props to add to block element.
 * @param {Object} blockType  Block type definition.
 * @param {Object} attributes Block attributes.
 * @return {Object} Modified props with custom data attributes.
 */
function addCustomDataToSave( extraProps, blockType, attributes ) {
	try {
		const { customData, customAction, actionData } = attributes;

		if ( customData ) {
			extraProps[ 'data-custom' ] = customData;
		}

		// Add action attribute only to blocks that support actions
		if ( getSupportedBlocks()[ blockType.name ] && customAction ) {
			extraProps[ 'data-action' ] = customAction;

			// Map actionData fields to data-* attributes
			if ( actionData && typeof actionData === 'object' ) {
				const fields = getFieldsForAction( customAction );
				fields.forEach( ( field ) => {
					const value = actionData[ field.key ];
					if (
						value !== undefined &&
						value !== null &&
						value !== ''
					) {
						extraProps[ field.dataAttribute ] = String( value );
					}
				} );
			}
		}

		return extraProps;
	} catch ( error ) {
		log(
			'error',
			`Error adding custom data to block ${
				blockType?.name || 'unknown'
			}`,
			error
		);
		return extraProps; // Return unmodified props on error
	}
}

try {
	addFilter(
		'blocks.registerBlockType',
		'block-actions/custom-data-attribute',
		addCustomDataAttribute
	);

	addFilter(
		'editor.BlockEdit',
		'block-actions/custom-data-inspector',
		withInspectorControl
	);

	addFilter(
		'editor.BlockEdit',
		'block-actions/custom-action-inspector',
		withActionInspectorControl
	);

	addFilter(
		'blocks.getSaveContent.extraProps',
		'block-actions/custom-data-save',
		addCustomDataToSave
	);

	registerModalDialogVariation();
	registerPrePublishCheck( getFieldsForAction );
	// The watcher lives for the whole editor session by design (it must
	// see every insertion). The unsubscribe handle is exposed on the
	// public namespace so tests and debugging can tear it down instead
	// of the handle being silently discarded.
	const unsubscribeAnchorWatcher = setupAnchorUniqueness();
	if ( typeof window !== 'undefined' ) {
		window.BlockActions = window.BlockActions || {};
		window.BlockActions.unsubscribeAnchorWatcher = unsubscribeAnchorWatcher;
	}
} catch ( error ) {
	log( 'error', 'Failed to register Block Actions', error );
}
