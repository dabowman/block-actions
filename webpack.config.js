/**
 * Webpack Configuration
 *
 * Multi-entry build: editor bundle + per-action view store modules.
 *
 * @since 2.0.0
 */

const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

// Remove the default entry function to prevent wp-scripts from using it.
const { entry: _defaultEntry, ...configWithoutEntry } = defaultConfig;

module.exports = {
	...configWithoutEntry,
	entry: {
		// Editor.
		'block-extensions': path.resolve(
			__dirname,
			'src/block-extensions.js'
		),

		// Interactivity API view stores (one per action).
		'actions/scroll-to-top/view': path.resolve(
			__dirname,
			'src/stores/scroll-to-top/view.js'
		),
		'actions/carousel/view': path.resolve(
			__dirname,
			'src/stores/carousel/view.js'
		),
		'actions/toggle-visibility/view': path.resolve(
			__dirname,
			'src/stores/toggle-visibility/view.js'
		),
		'actions/modal-toggle/view': path.resolve(
			__dirname,
			'src/stores/modal-toggle/view.js'
		),
		'actions/smooth-scroll/view': path.resolve(
			__dirname,
			'src/stores/smooth-scroll/view.js'
		),
		'actions/copy-to-clipboard/view': path.resolve(
			__dirname,
			'src/stores/copy-to-clipboard/view.js'
		),
		'actions/test-action/view': path.resolve(
			__dirname,
			'src/stores/test-action/view.js'
		),
		'actions/example-rate-limited/view': path.resolve(
			__dirname,
			'src/stores/example-rate-limited/view.js'
		),
	},
	output: {
		...defaultConfig.output,
		path: path.resolve( __dirname, 'build' ),
	},
};
