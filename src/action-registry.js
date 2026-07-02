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
 *                                                    Behavioral actions declare `entry` (the store action a trigger
 *                                                    invokes), `triggers` (supported trigger names), and `defaultTrigger`;
 *                                                    structural actions (carousel) declare `structural: true` instead —
 *                                                    they own their whole lifecycle and get no trigger UI.
 *
 * @type {Array<{id: string, label: string, fields: ActionField[]}>}
 */
const BUILT_IN_ACTIONS = [
	{
		id: 'scroll-to-top',
		entry: 'actions.scrollToTop',
		triggers: [ 'click', 'hover', 'scroll-into-view', 'load', 'timer' ],
		defaultTrigger: 'click',
		label: 'Scroll To Top',
		fields: [],
	},
	{
		id: 'carousel',
		structural: true,
		label: 'Carousel',
		fields: [
			{
				key: 'wrapAround',
				type: 'toggle',
				label: 'Wrap Around',
				help: 'Loop back to the first slide after the last.',
				dataAttribute: 'data-wrap-around',
				required: false,
				optional: true,
				default: true,
			},
		],
	},
	{
		id: 'toggle-visibility',
		entry: 'actions.toggle',
		triggers: [ 'click', 'hover', 'scroll-into-view', 'load', 'timer' ],
		defaultTrigger: 'click',
		label: 'Toggle Visibility',
		fields: [
			{
				key: 'target',
				type: 'target',
				label: 'Target',
				help: 'The block to show or hide.',
				dataAttribute: 'data-target',
				targets: {},
				required: true,
				default: '',
			},
			{
				key: 'startHidden',
				type: 'toggle',
				label: 'Panel starts hidden',
				help: 'Enable when the target ships with the is-hidden class, so the button announces the collapsed state correctly on first paint.',
				dataAttribute: 'data-start-hidden',
				optional: true,
				default: false,
			},
		],
	},
	{
		id: 'modal-toggle',
		entry: 'actions.toggle',
		triggers: [ 'click', 'hover', 'scroll-into-view', 'load', 'timer' ],
		defaultTrigger: 'click',
		label: 'Modal Toggle',
		fields: [
			{
				key: 'modal',
				type: 'target',
				label: 'Modal',
				help: 'The dialog to open — a Group block using the Dialog variation.',
				dataAttribute: 'data-modal',
				targets: { blocks: [ 'core/group' ], shape: 'dialog' },
				required: true,
				default: '',
			},
		],
	},
	{
		id: 'smooth-scroll',
		entry: 'actions.scrollToTarget',
		triggers: [ 'click', 'hover', 'scroll-into-view', 'load', 'timer' ],
		defaultTrigger: 'click',
		label: 'Smooth Scroll',
		fields: [
			{
				key: 'target',
				type: 'target',
				label: 'Scroll target',
				help: 'The block to scroll to.',
				dataAttribute: 'data-target',
				targets: {},
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
				optional: true,
				default: 0,
			},
		],
	},
	{
		id: 'copy-to-clipboard',
		entry: 'actions.copy',
		triggers: [ 'click', 'hover', 'scroll-into-view', 'load', 'timer' ],
		defaultTrigger: 'click',
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
