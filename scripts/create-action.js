#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Template for new action files
const getActionTemplate = (name, description) => `/**
 * ${description}
 * 
 * Note: The action ID is derived from the filename (${name}.js).
 * Make sure the filename matches the desired action ID.
 * 
 * @param {HTMLElement} element - The element to attach the action to.
 */

import { BaseAction } from './base-action';

export default function init(element) {
    const action = new BaseAction(element);

    action.target.addEventListener('click', (e) => {
        e.preventDefault();

        action.executeWithRateLimit(() => {
            // Add your action code here
            action.log('info', '${name} action executed');

            // Example: Change button text
            action.setTextContent('Action Executed!');

            // Example: Reset after 2 seconds
            setTimeout(() => action.reset(), 2000);
        });
    });
}
`;

// Function to create kebab case
const toKebabCase = (str) => {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
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
        const filePath = path.join(__dirname, '..', 'src', 'actions', `${kebabName}.js`);

        // Check if file already exists
        if (fs.existsSync(filePath)) {
            console.error(`\nError: Action file ${kebabName}.js already exists!`);
            process.exit(1);
        }

        // Create the action file
        fs.writeFileSync(filePath, getActionTemplate(kebabName, description));

        console.log(`\nSuccess! Created ${kebabName}.js in src/actions/`);
        console.log('\nTo use this action:');
        console.log('1. Run npm run build');
        console.log('2. The action will be automatically available in the Button Action dropdown');
        console.log(`3. Edit src/actions/${kebabName}.js to customize the action behavior\n`);

    } catch (error) {
        console.error('Error creating action:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the script
createAction();
