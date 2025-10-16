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
import { assign } from 'lodash';
import actions from './actions';

/**
 * Simple telemetry tracking for block extensions
 * @type {Object}
 */
const telemetry = {
    initialized: false,
    initTime: 0,
    actionsRegistered: actions.length,
    customBlocksRegistered: 0,
    errorCount: 0,
    lastActionSet: null
};

/**
 * Centralized logging utility for block extensions
 *
 * @param {string} type - Log type: 'error', 'warning', 'info'
 * @param {string} message - Log message
 * @param {Error|null} [error] - Optional error object
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
            if (window?.tagHeuerActions?.debug) {
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
 * @type {Object.<string, {label: string, help: string}>}
 */
const BLOCKS_WITH_ACTIONS = {
    'core/button': {
        label: 'Button Action',
        help: 'Select a custom action to apply to this button block.'
    },
    'core/group': {
        label: 'Group Action',
        help: 'Select a custom action to apply to this group block.'
    }
};

/**
 * Adds custom attributes to blocks during registration.
 * - customData: Added to all blocks
 * - customAction: Added only to blocks that support actions
 *
 * @param {Object} settings - Block type settings
 * @returns {Object} Modified settings
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
                            label="Data Attribute"
                            value={customData || ''}
                            onChange={(value) => setAttributes({ customData: value })}
                            help="Enter a custom data attribute value. This will be added as data-custom to the block."
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

            // Create action options from discovered actions
            const actionOptions = [
                { value: '', label: 'None' },
                ...actions.map(action => ({
                    value: action.id,
                    label: action.label
                }))
            ];

            /**
             * Filters the action options based on user input.
             * Used by the ComboboxControl for search functionality.
             *
             * @param {string} inputValue - User's search input
             * @returns {Array} Filtered options
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
                                    log('info', `Action set to: ${value || 'None'} for block: ${props.name}`);
                                } catch (error) {
                                    log('error', 'Failed to set action attribute', error);
                                }
                            }}
                            onFilterValueChange={(inputValue) =>
                                getFilteredOptions(inputValue)
                            }
                            help={blockConfig.help}
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
 * @param {Object} extraProps - Additional props to add to block element
 * @param {Object} blockType - Block type definition
 * @param {Object} attributes - Block attributes
 * @returns {Object} Modified props
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
        'tag-heuer/custom-data-attribute',
        addCustomDataAttribute
    );

    addFilter(
        'editor.BlockEdit',
        'tag-heuer/custom-data-inspector',
        withInspectorControl
    );

    addFilter(
        'editor.BlockEdit',
        'tag-heuer/custom-action-inspector',
        withActionInspectorControl
    );

    addFilter(
        'blocks.getSaveContent.extraProps',
        'tag-heuer/custom-data-save',
        addCustomDataToSave
    );

    // Update telemetry
    telemetry.initialized = true;
    telemetry.initTime = performance.now() - startTime;

    log('info', `Block Actions initialized in ${Math.round(telemetry.initTime)}ms`);
} catch (error) {
    log('error', 'Failed to register Block Actions', error);
}
