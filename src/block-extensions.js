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

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { Fragment } from '@wordpress/element';
import { InspectorAdvancedControls } from '@wordpress/block-editor';
import { TextControl, ComboboxControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { assign } from 'lodash';
import actions from './action-registry';

/**
 * Simple telemetry tracking for block extensions.
 *
 * @since 1.0.0
 *
 * @type {Object}
 */
const telemetry = {
    initialized: false,
    initTime: 0,
    actionsRegistered: 0, // Will be updated on init
    customBlocksRegistered: 0,
    errorCount: 0,
    lastActionSet: null
};

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
 * @since 1.0.0
 *
 * @param {string}   id    Action ID.
 * @param {string}   label Action label.
 * @param {Function} init  Init function (not executed in editor).
 * @return {boolean} Success status.
 */
function registerEditorAction(id, label, init) {
	const prefix = '[Block Actions]';
	
	// Validate parameters
	if (!id || typeof id !== 'string') {
		console.error(`${prefix} Action ID must be a non-empty string`);
		return false;
	}

	if (!label || typeof label !== 'string') {
		console.error(`${prefix} Action label must be a non-empty string`);
		return false;
	}

	// Check if action already exists
	if (editorActionRegistry.some(a => a.id === id)) {
		if (window?.blockActions?.debug) {
			console.log(`${prefix} Action "${id}" already registered in editor`);
		}
		return false;
	}

	// Register the action (just for the dropdown, won't execute in editor)
	editorActionRegistry.push({ id, label, init });
	
	if (window?.blockActions?.debug) {
		console.log(`${prefix} Registered theme action in editor: ${id}`);
	}
	
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
	const builtInActions = actions.map(({ id, label }) => ({ id, label }));
	const themeActions = editorActionRegistry.map(({ id, label }) => ({ id, label }));
	return [...builtInActions, ...themeActions];
}

/**
 * Get all registered actions (built-in + theme actions).
 *
 * @since 1.0.0
 *
 * @return {Array} Array of registered actions.
 */
function getAllActions() {
	return getEditorRegisteredActions();
}

// Expose registration API globally for theme actions (editor dropdown)
if (typeof window !== 'undefined') {
	window.BlockActions = window.BlockActions || {};
	window.BlockActions.registerAction = registerEditorAction;
	window.BlockActions.getRegisteredActions = getEditorRegisteredActions;
}

/**
 * Centralized logging utility for block extensions.
 *
 * @since 1.0.0
 *
 * @param {string}      type    Log type: 'error', 'warning', or 'info'.
 * @param {string}      message Log message to display.
 * @param {Error|null} [error]  Optional error object for error logs.
 * @return {void}
 */
function log(type, message, error = null) {
    const prefix = '[Block Actions]';

    // Update telemetry on errors
    if (type === 'error') {
        telemetry.errorCount++;
    }

    // Console logging based on type
    switch (type) {
        case 'error':
            console.error(`${prefix} ${message}`, error || '');
            break;
        case 'warning':
            console.warn(`${prefix} ${message}`);
            break;
        case 'info':
            if (window?.blockActions?.debug) {
                console.log(`${prefix} ${message}`);
            }
            break;
        default:
            console.log(`${prefix} ${message}`);
    }

    // In the editor, we don't send logs to the server directly,
    // as WP has its own error logging mechanisms
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
        label: __('Button Action', 'block-actions'),
        help: __('Select a custom action to apply to this button block.', 'block-actions')
    },
    'core/group': {
        label: __('Group Action', 'block-actions'),
        help: __('Select a custom action to apply to this group block.', 'block-actions')
    }
};

/**
 * Adds custom attributes to blocks during registration.
 * - customData: Added to all blocks
 * - customAction: Added only to blocks that support actions
 *
 * @since 1.0.0
 *
 * @param {Object} settings Block type settings from WordPress.
 * @return {Object} Modified block type settings with custom attributes.
 */
function addCustomDataAttribute(settings) {
    try {
        // Add the attribute
        settings.attributes = assign(settings.attributes, {
            customData: {
                type: 'string',
                default: '',
            },
        });

        // Add customAction attribute only to blocks that support actions
        if (BLOCKS_WITH_ACTIONS[settings.name]) {
            settings.attributes = assign(settings.attributes, {
                customAction: {
                    type: 'string',
                    default: '',
                },
            });
            telemetry.customBlocksRegistered++;
        }

        return settings;
    } catch (error) {
        log('error', `Failed to add custom attributes to block ${settings?.name || 'unknown'}`, error);
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
const withInspectorControl = createHigherOrderComponent((BlockEdit) => {
    return (props) => {
        try {
            const { attributes, setAttributes } = props;
            const { customData } = attributes;

            return (
                <Fragment>
                    <BlockEdit {...props} />
                    <InspectorAdvancedControls>
                        <TextControl
                            label={ __( 'Data Attribute', 'block-actions' ) }
                            value={customData || ''}
                            onChange={(value) => setAttributes({ customData: value })}
                            help={ __( 'Enter a custom data attribute value. This will be added as data-custom to the block. Example: analytics hook or CSS selector target.', 'block-actions' ) }
                        />
                    </InspectorAdvancedControls>
                </Fragment>
            );
        } catch (error) {
            log('error', 'Error rendering custom data inspector control', error);
            return <BlockEdit {...props} />;
        }
    };
}, 'withInspectorControl');

/**
 * Higher-order component that adds the action selector to supported blocks.
 * Uses ComboboxControl for searchable action selection.
 *
 * @since 1.0.0
 *
 * @param {Function} BlockEdit The original BlockEdit component.
 * @return {Function} Enhanced BlockEdit component with action inspector control.
 */
const withActionInspectorControl = createHigherOrderComponent((BlockEdit) => {
    return (props) => {
        try {
            // Only apply to blocks that support actions
            if (!BLOCKS_WITH_ACTIONS[props.name]) {
                return <BlockEdit {...props} />;
            }

            const { attributes, setAttributes } = props;
            const { customAction } = attributes;
            const blockConfig = BLOCKS_WITH_ACTIONS[props.name];

            // Create action options from all registered actions (built-in + theme)
            const allActions = getAllActions();
            const actionOptions = [
                { value: '', label: __( 'None', 'block-actions' ) },
                ...allActions.map(action => ({
                    value: action.id,
                    label: action.label
                }))
            ];

            /**
             * Filters the action options based on user input.
             * Used by the ComboboxControl for search functionality.
             *
             * @since 1.0.0
             *
             * @param {string} inputValue User's search input.
             * @return {Array} Filtered options array.
             */
            const getFilteredOptions = (inputValue) => {
                try {
                    if (!inputValue) {
                        return actionOptions;
                    }

                    const searchValue = inputValue.toLowerCase();
                    return actionOptions.filter(option =>
                        option.label.toLowerCase().includes(searchValue)
                    );
                } catch (error) {
                    log('error', 'Error filtering action options', error);
                    return actionOptions; // Return all options on error
                }
            };

            return (
                <Fragment>
                    <BlockEdit {...props} />
                    <InspectorAdvancedControls>
                        <ComboboxControl
                            label={blockConfig.label}
                            value={customAction}
                            options={actionOptions}
                            onChange={(value) => {
                                try {
                                    setAttributes({ customAction: value });
                                    // Track last action set for telemetry
                                    telemetry.lastActionSet = {
                                        blockType: props.name,
                                        action: value,
                                        timestamp: Date.now()
                                    };
                                    log('info', `Action set to: ${value || __( 'None', 'block-actions' )} for block: ${props.name}`);
                                } catch (error) {
                                    log('error', 'Failed to set action attribute', error);
                                }
                            }}
                            onFilterValueChange={(inputValue) =>
                                getFilteredOptions(inputValue)
                            }
                            help={`${blockConfig.help} ${__( 'Choose “None” to remove an action. Actions should be paired with meaningful labels and remain keyboard accessible.', 'block-actions' )}`}
                        />
                    </InspectorAdvancedControls>
                </Fragment>
            );
        } catch (error) {
            log('error', 'Error rendering action inspector control', error);
            return <BlockEdit {...props} />;
        }
    };
}, 'withActionInspectorControl');

/**
 * Adds custom data and action attributes to block HTML.
 * This function runs when the block is saved.
 *
 * @since 1.0.0
 *
 * @param {Object} extraProps  Additional props to add to block element.
 * @param {Object} blockType   Block type definition.
 * @param {Object} attributes  Block attributes.
 * @return {Object} Modified props with custom data attributes.
 */
function addCustomDataToSave(extraProps, blockType, attributes) {
    try {
        const { customData, customAction } = attributes;

        if (customData) {
            extraProps['data-custom'] = customData;
        }

        // Add action attribute only to blocks that support actions
        if (BLOCKS_WITH_ACTIONS[blockType.name] && customAction) {
            extraProps['data-action'] = customAction;
            log('info', `Saving block with action: ${customAction}`);
        }

        return extraProps;
    } catch (error) {
        log('error', `Error adding custom data to block ${blockType?.name || 'unknown'}`, error);
        return extraProps; // Return unmodified props on error
    }
}

// Register the filters
try {
    const startTime = performance.now();

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

    // Update telemetry
    telemetry.initialized = true;
    telemetry.initTime = performance.now() - startTime;
    
    // Wait a tick to let theme actions register
    setTimeout(() => {
        telemetry.actionsRegistered = getAllActions().length;
        log('info', `Block Actions initialized in ${Math.round(telemetry.initTime)}ms with ${telemetry.actionsRegistered} actions (${actions.length} built-in, ${editorActionRegistry.length} theme)`);
    }, 0);
} catch (error) {
    log('error', 'Failed to register Block Actions', error);
}
