/**
 * Built-in action registry for the block editor.
 *
 * Provides the list of built-in actions available in the action selector dropdown.
 * Each action corresponds to an Interactivity API store in src/stores/ and a
 * PHP renderer in includes/renderers/.
 *
 * @since 2.0.0
 *
 * @type {Array<{id: string, label: string}>}
 */
const BUILT_IN_ACTIONS = [
	{ id: 'scroll-to-top', label: 'Scroll To Top' },
	{ id: 'carousel', label: 'Carousel' },
	{ id: 'toggle-visibility', label: 'Toggle Visibility' },
	{ id: 'modal-toggle', label: 'Modal Toggle' },
	{ id: 'smooth-scroll', label: 'Smooth Scroll' },
	{ id: 'copy-to-clipboard', label: 'Copy To Clipboard' },
];

export default BUILT_IN_ACTIONS;
