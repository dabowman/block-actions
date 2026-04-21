/**
 * Webpack Configuration
 *
 * Dual build:
 *   - Classic script bundle for the editor extensions (block-extensions.js).
 *   - ES module bundles for the Interactivity API view stores, one per
 *     action, enqueued on the frontend via wp_enqueue_script_module().
 *
 * Setting WP_EXPERIMENTAL_MODULES before requiring @wordpress/scripts
 * makes the default config export [scriptConfig, moduleConfig]; we
 * override the entries on each.
 *
 * @since 2.0.0
 */

process.env.WP_EXPERIMENTAL_MODULES = 'true';

const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const [ defaultScriptConfig, defaultModuleConfig ] = defaultConfig;

// Drop the default entry functions (they scan block.json / src/view); we
// declare entries explicitly because this plugin extends core blocks.
const { entry: _s, ...scriptBase } = defaultScriptConfig;
const { entry: _m, ...moduleBase } = defaultModuleConfig;

const ACTIONS = [
	'scroll-to-top',
	'carousel',
	'toggle-visibility',
	'modal-toggle',
	'smooth-scroll',
	'copy-to-clipboard',
	'test-action',
	'example-rate-limited',
];

const moduleEntries = Object.fromEntries(
	ACTIONS.map( ( id ) => [
		`actions/${ id }/view`,
		path.resolve( __dirname, `src/stores/${ id }/view.js` ),
	] )
);

const buildPath = path.resolve( __dirname, 'build' );

module.exports = [
	{
		...scriptBase,
		entry: {
			'block-extensions': path.resolve(
				__dirname,
				'src/block-extensions.js'
			),
		},
		output: {
			...scriptBase.output,
			path: buildPath,
		},
	},
	{
		...moduleBase,
		entry: moduleEntries,
		output: {
			...moduleBase.output,
			path: buildPath,
		},
	},
];
