#!/usr/bin/env node

/**
 * Scaffold a new built-in action: an Interactivity API store plus a PHP
 * renderer matching the current Action_Renderer API.
 *
 * Usage: npm run create-action
 */

const fs = require( 'fs' );
const path = require( 'path' );
const readline = require( 'readline' );

const rl = readline.createInterface( {
	input: process.stdin,
	output: process.stdout,
} );

// Line-queue input handling so the wizard works both interactively and
// with piped stdin (rl.question alone drops lines buffered before the
// question is asked, and hangs forever on EOF).
const pendingLines = [];
const waiters = [];
let stdinClosed = false;
rl.on( 'line', ( line ) => {
	const waiter = waiters.shift();
	if ( waiter ) {
		waiter( line );
	} else {
		pendingLines.push( line );
	}
} );
rl.on( 'close', () => {
	stdinClosed = true;
	while ( waiters.length ) {
		waiters.shift()( '' );
	}
} );

function ask( prompt ) {
	process.stdout.write( prompt );
	const buffered = pendingLines.shift();
	if ( buffered !== undefined ) {
		process.stdout.write( `${ buffered }\n` );
		return Promise.resolve( buffered );
	}
	// 'close' fires once: a prompt issued AFTER EOF would push a waiter
	// nothing ever drains, and the process would exit 0 with no output.
	// Resolve empty immediately so validation reports the missing input.
	if ( stdinClosed ) {
		process.stdout.write( '\n' );
		return Promise.resolve( '' );
	}
	return new Promise( ( resolve ) => {
		waiters.push( resolve );
	} );
}

// Template for a new Interactivity API store.
const getStoreTemplate = ( name, description ) => `/**
 * ${ description }
 *
 * @since 3.0.0
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

store( 'block-actions/${ name }', {
	state: {
		// Derived state getters go here. Bind them from the PHP renderer
		// via data-wp-text / data-wp-class--* / data-wp-style--* so the
		// view updates reactively — avoid imperative DOM writes.
	},
	actions: {
		// withSyncEvent is required whenever the handler uses
		// event.preventDefault(), stopPropagation(), or currentTarget
		// (WP 6.8+). For async work use a generator (function*) wrapped
		// in withSyncEvent — never async/await.
		handleClick: withSyncEvent( function ( event ) {
			event.preventDefault();
			const ctx = getContext();
			// Flip context flags; let state getters derive the view.
			ctx.isActive = ! ctx.isActive;
		} ),
	},
	callbacks: {
		init() {
			const { ref } = getElement();
			// Imperative setup only: listeners, observers, measurements.
			// Accessibility attributes belong in the PHP renderer so they
			// are correct on first paint.
			console.debug( '[block-actions/${ name }] init', ref );

			// Return a cleanup function if you set up observers, timers,
			// or event listeners.
			return () => {};
		},
	},
} );
`;

// Template for the PHP renderer (must match the Action_Renderer API in
// includes/class-action-renderer.php).
const getRendererTemplate = ( name, className, description ) => `<?php
/**
 * ${ description } renderer.
 *
 * @since 3.0.0
 * @package Block_Actions
 */

namespace Block_Actions\\Renderers;

use Block_Actions\\Action_Renderer;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renderer for the ${ name } action.
 *
 * @since 3.0.0
 */
class ${ className } extends Action_Renderer {

	/**
	 * Get initial context for the action.
	 *
	 * Read configuration off the root element with
	 * $processor->get_attribute( 'data-…' ) and return it here — the
	 * transformer serializes this array into data-wp-context.
	 *
	 * @since 3.0.0
	 *
	 * @param \\WP_HTML_Tag_Processor $processor The HTML tag processor positioned at the root element.
	 * @param array                  $block     The parsed block data.
	 * @return array Initial context data.
	 */
	public function get_initial_context( \\WP_HTML_Tag_Processor $processor, array $block ): array {
		return array(
			'isActive' => false,
		);
	}

	/**
	 * Apply directives to the root element.
	 *
	 * Add reactive bindings (data-wp-bind--*, data-wp-class--*,
	 * data-wp-text) and static accessibility attributes here. Override
	 * post_process_html() for directives on child elements.
	 *
	 * @since 3.0.0
	 *
	 * @param \\WP_HTML_Tag_Processor $processor The HTML tag processor positioned at the root element.
	 * @param array                  $block     The parsed block data.
	 * @return void
	 */
	public function apply_directives( \\WP_HTML_Tag_Processor $processor, array $block ): void {
		$processor->set_attribute( 'data-wp-on--click', 'actions.handleClick' );
		$processor->set_attribute( 'data-wp-init', 'callbacks.init' );
	}
}
`;

// Function to create kebab case.
const toKebabCase = ( str ) => {
	return str
		.toLowerCase()
		.replace( /\s+/g, '-' )
		.replace( /[^a-z0-9-]/g, '' );
};

// Function to create a Pascal_Snake class name (WordPress style).
const toClassName = ( str ) => {
	return str
		.split( /[-\s]+/ )
		.map(
			( word ) =>
				word.charAt( 0 ).toUpperCase() + word.slice( 1 ).toLowerCase()
		)
		.join( '_' );
};

// Main function to create the action.
async function createAction() {
	try {
		// Get action name and description from user.
		const name = await ask( 'Enter action name (e.g., "Scroll to Top"): ' );
		const description = await ask( 'Enter action description: ' );

		const kebabName = toKebabCase( name );
		const className = toClassName( name );

		if ( ! kebabName ) {
			console.error( '\nError: action name produced an empty ID.' );
			process.exit( 1 );
		}

		// The class name is written into `class <name> extends …` — a
		// digit-leading or symbol-carrying name ('2 Way Toggle' →
		// 2_Way_Toggle) would scaffold a PHP parse error.
		if ( ! /^[A-Za-z][A-Za-z0-9_]*$/.test( className ) ) {
			console.error(
				`\nError: "${ name }" derives the PHP class name "${ className }", which is not a valid PHP identifier. Start the action name with a letter and use only letters, numbers, spaces, or hyphens.`
			);
			process.exit( 1 );
		}

		// Create store directory and file.
		const storeDir = path.join(
			__dirname,
			'..',
			'src',
			'stores',
			kebabName
		);
		const storePath = path.join( storeDir, 'view.js' );

		if ( fs.existsSync( storePath ) ) {
			console.error(
				`\nError: Store ${ kebabName }/view.js already exists!`
			);
			process.exit( 1 );
		}

		fs.mkdirSync( storeDir, { recursive: true } );
		fs.writeFileSync(
			storePath,
			getStoreTemplate( kebabName, description )
		);

		// Create PHP renderer.
		const rendererPath = path.join(
			__dirname,
			'..',
			'includes',
			'renderers',
			`class-${ kebabName }.php`
		);
		if ( ! fs.existsSync( rendererPath ) ) {
			fs.writeFileSync(
				rendererPath,
				getRendererTemplate( kebabName, className, description )
			);
		}

		console.log( `\nSuccess! Created:` );
		console.log(
			`  - src/stores/${ kebabName }/view.js (Interactivity API store)`
		);
		console.log(
			`  - includes/renderers/class-${ kebabName }.php (PHP renderer)`
		);
		console.log( '\nNext steps:' );
		console.log(
			`1. Add '${ kebabName }' to the ACTIONS array in webpack.config.js`
		);
		console.log(
			`2. Register the renderer in block-actions.php → init_interactivity_api():`
		);
		console.log(
			`   $transformer->register_renderer( '${ kebabName }', new Renderers\\${ className }() );`
		);
		console.log(
			`   (and add the require_once for includes/renderers/class-${ kebabName }.php)`
		);
		console.log(
			`3. Add { id: '${ kebabName }', label: '${ name }', fields: [] } to src/action-registry.js`
		);
		console.log(
			`4. Add tests in tests/stores/${ kebabName }.test.js (see existing store tests)`
		);
		console.log( '5. Run npm run build && npm test\n' );
	} catch ( error ) {
		console.error( 'Error creating action:', error );
		process.exit( 1 );
	} finally {
		rl.close();
	}
}

// Run the script.
createAction();
