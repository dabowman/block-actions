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
 *                                                    Actions may declare a `blocks` array naming the block types they host
 *                                                    on; the editor only offers them in those blocks' action dropdowns.
 *                                                    Actions without `blocks` are offered everywhere (theme actions, the
 *                                                    classic built-ins).
 *
 * @type {Array<{id: string, label: string, fields: ActionField[], blocks?: string[]}>}
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
			{
				key: 'startHidden',
				type: 'toggle',
				label: 'Panel starts hidden',
				help: 'Enable when the target ships with the is-hidden class, so the button announces the collapsed state correctly on first paint.',
				dataAttribute: 'data-start-hidden',
				default: false,
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
	{
		id: 'query-paginate',
		label: 'Query Pagination — Instant',
		blocks: [ 'core/query' ],
		fields: [],
	},
	{
		id: 'query-infinite-scroll',
		label: 'Query Infinite Scroll',
		blocks: [ 'core/query' ],
		fields: [],
	},
	{
		id: 'query-filter',
		label: 'Query Filter',
		blocks: [ 'core/button' ],
		fields: [
			{
				key: 'targetQuery',
				type: 'text',
				label: 'Target Query (anchor)',
				help: 'HTML anchor of the Query Loop to filter. Leave empty when the page has exactly one actions-enabled Query Loop.',
				dataAttribute: 'data-query',
				required: false,
				default: '',
			},
			{
				key: 'taxonomy',
				type: 'text',
				label: 'Taxonomy',
				help: 'Taxonomy to filter by (e.g. category, post_tag).',
				dataAttribute: 'data-taxonomy',
				required: true,
				default: '',
			},
			{
				key: 'term',
				type: 'text',
				label: 'Term slug',
				help: 'Term to toggle. Leave empty for an "All" button that clears this taxonomy\'s filter.',
				dataAttribute: 'data-term',
				required: false,
				default: '',
			},
		],
	},
	{
		id: 'query-live-search',
		label: 'Query Live Search',
		blocks: [ 'core/search', 'core/group' ],
		fields: [
			{
				key: 'targetQuery',
				type: 'text',
				label: 'Target Query (anchor)',
				help: 'HTML anchor of the Query Loop to search. Leave empty when the page has exactly one actions-enabled Query Loop.',
				dataAttribute: 'data-query',
				required: false,
				default: '',
			},
			{
				key: 'debounce',
				type: 'number',
				label: 'Debounce (ms)',
				help: 'Wait this long after typing stops before searching.',
				dataAttribute: 'data-debounce',
				required: false,
				default: 300,
			},
			{
				key: 'minChars',
				type: 'number',
				label: 'Minimum characters',
				help: 'Skip searching below this many characters (clearing always applies).',
				dataAttribute: 'data-min-chars',
				required: false,
				default: 0,
			},
		],
	},
];

export default BUILT_IN_ACTIONS;
