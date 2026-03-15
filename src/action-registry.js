/**
 * Built-in action registry for the block editor.
 *
 * Provides the list of built-in actions available in the action selector dropdown.
 * Each action corresponds to an Interactivity API store in src/stores/ and a
 * PHP renderer in includes/renderers/.
 *
 * @since 2.0.0
 *
 * @typedef {Object} ActionField
 * @property {string}                   key           Internal identifier used as key in actionData.
 * @property {'text'|'number'|'toggle'} type          Control type to render in the inspector.
 * @property {string}                   label         Human-readable label for the control.
 * @property {string}                   [help]        Optional help text.
 * @property {string}                   dataAttribute HTML data attribute name (e.g. 'data-target').
 * @property {boolean}                  [required]    Whether the field must be filled.
 * @property {string|number|boolean}    [default]     Default value.
 *
 * @type {Array<{id: string, label: string, fields: ActionField[]}>}
 */
const BUILT_IN_ACTIONS = [
	{
		id: 'scroll-to-top',
		label: 'Scroll To Top',
		fields: [],
	},
	{
		id: 'carousel',
		label: 'Carousel',
		fields: [
			{
				key: 'wrapAround',
				type: 'toggle',
				label: 'Wrap Around',
				help: 'Loop back to the first slide after the last.',
				dataAttribute: 'data-wrap-around',
				required: false,
				default: true,
			},
		],
	},
	{
		id: 'toggle-visibility',
		label: 'Toggle Visibility',
		fields: [
			{
				key: 'target',
				type: 'text',
				label: 'Target Element ID',
				help: 'The ID of the element to show or hide (without #).',
				dataAttribute: 'data-target',
				required: true,
				default: '',
			},
		],
	},
	{
		id: 'modal-toggle',
		label: 'Modal Toggle',
		fields: [
			{
				key: 'modal',
				type: 'text',
				label: 'Modal Element ID',
				help: 'The ID of the modal element to toggle (without #).',
				dataAttribute: 'data-modal',
				required: true,
				default: '',
			},
		],
	},
	{
		id: 'smooth-scroll',
		label: 'Smooth Scroll',
		fields: [
			{
				key: 'target',
				type: 'text',
				label: 'Target Element ID',
				help: 'The ID of the element to scroll to (without #).',
				dataAttribute: 'data-target',
				required: true,
				default: '',
			},
			{
				key: 'offset',
				type: 'number',
				label: 'Scroll Offset (px)',
				help: 'Pixel offset from the target element. Useful for fixed headers.',
				dataAttribute: 'data-offset',
				required: false,
				default: 0,
			},
		],
	},
	{
		id: 'copy-to-clipboard',
		label: 'Copy To Clipboard',
		fields: [
			{
				key: 'copyText',
				type: 'text',
				label: 'Text to Copy',
				help: 'The text that will be copied to the clipboard.',
				dataAttribute: 'data-copy-text',
				required: true,
				default: '',
			},
		],
	},
];

export default BUILT_IN_ACTIONS;
