#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Template for new Interactivity API store
const getStoreTemplate = (name, description) => `/**
 * ${description}
 *
 * @since 2.0.0
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/${name}', {
	actions: {
		handleClick( event ) {
			event.preventDefault();
			const { ref } = getElement();
			const limiter = getRateLimiter( ref );
			if ( ! limiter.canExecute() ) {
				return;
			}

			const ctx = getContext();
			// Add your action logic here.
		},
	},
	callbacks: {
		init() {
			const ctx = getContext();
			const { ref } = getElement();
			// Initialization logic.

			// Return a cleanup function if you set up observers,
			// timers, or event listeners.
			return () => {};
		},
	},
} );
`;

// Template for PHP renderer
const getRendererTemplate = (name, className, description) => `<?php
/**
 * ${description} renderer.
 *
 * @since 2.0.0
 * @package Block_Actions
 */

namespace Block_Actions\\Renderers;

use Block_Actions\\Action_Renderer;

/**
 * Renderer for the ${name} action.
 *
 * @since 2.0.0
 */
class ${className} extends Action_Renderer {

	/**
	 * Get the Interactivity API namespace.
	 *
	 * @since 2.0.0
	 *
	 * @return string Namespace string.
	 */
	public function get_namespace(): string {
		return 'block-actions/${name}';
	}

	/**
	 * Get initial context for the action.
	 *
	 * @since 2.0.0
	 *
	 * @return array Initial context data.
	 */
	public function get_initial_context(): array {
		return array();
	}

	/**
	 * Get directives to add to the root element.
	 *
	 * @since 2.0.0
	 *
	 * @return array Directive key-value pairs.
	 */
	public function get_directives(): array {
		return array(
			'data-wp-on--click' => 'actions.handleClick',
			'data-wp-init'      => 'callbacks.init',
		);
	}

	/**
	 * Get the view script module path.
	 *
	 * @since 2.0.0
	 *
	 * @return string Script module path relative to plugin root.
	 */
	public function get_view_script_module(): string {
		return 'build/actions/${name}/view.js';
	}
}
`;

// Function to create kebab case
const toKebabCase = (str) => {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
};

// Function to create PascalCase class name
const toPascalCase = (str) => {
    return str
        .split(/[-\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('_');
};

// Main function to create the action
async function createAction() {
    try {
        // Get action name from user
        const name = await new Promise((resolve) => {
            rl.question('Enter action name (e.g., "Scroll to Top"): ', resolve);
        });

        // Get action description from user
        const description = await new Promise((resolve) => {
            rl.question('Enter action description: ', resolve);
        });

        const kebabName = toKebabCase(name);
        const className = toPascalCase(name);

        // Create store directory and file
        const storeDir = path.join(__dirname, '..', 'src', 'stores', kebabName);
        const storePath = path.join(storeDir, 'view.js');

        if (fs.existsSync(storePath)) {
            console.error(`\nError: Store ${kebabName}/view.js already exists!`);
            process.exit(1);
        }

        fs.mkdirSync(storeDir, { recursive: true });
        fs.writeFileSync(storePath, getStoreTemplate(kebabName, description));

        // Create PHP renderer
        const rendererPath = path.join(__dirname, '..', 'includes', 'renderers', `class-${kebabName}.php`);
        if (!fs.existsSync(rendererPath)) {
            fs.writeFileSync(rendererPath, getRendererTemplate(kebabName, className, description));
        }

        console.log(`\nSuccess! Created:`);
        console.log(`  - src/stores/${kebabName}/view.js (Interactivity API store)`);
        console.log(`  - includes/renderers/class-${kebabName}.php (PHP renderer)`);
        console.log('\nNext steps:');
        console.log(`1. Add the webpack entry to webpack.config.js:`);
        console.log(`   'actions/${kebabName}/view': path.resolve(__dirname, 'src/stores/${kebabName}/view.js'),`);
        console.log(`2. Register the renderer in block-actions.php → init_interactivity_api()`);
        console.log(`3. Add { id: '${kebabName}', label: '${name}' } to src/action-registry.js`);
        console.log('4. Run npm run build\n');

    } catch (error) {
        console.error('Error creating action:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the script
createAction();
