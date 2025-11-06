# Block Actions

Tested up to: 6.6
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Assign modular actions and data attributes to blocks for lightweight frontend interactivity.

## Features

- **Custom Actions System**: Add dynamic behaviors to blocks through a modular action system
- **Data Attributes**: Add custom data attributes to any block
- **Block-Specific Actions**: Configure which blocks can receive actions
- **Searchable Action Selection**: ComboboxControl interface for easy action discovery and selection
- **Error Handling & Logging**: Comprehensive error handling and debug logging system
- **Accessibility**: Built-in accessibility features for all actions
- **Security**: Implements WordPress security best practices including nonce verification and data sanitization

## Installation

1. Upload the plugin to your `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Build the plugin assets:
   ```bash
   npm install
   npm run build
   ```

## Usage

### In the Block Editor

1. **Adding Actions to Blocks**:
   - Select a supported block (currently Button or Group)
   - In the block's advanced settings panel, find the "Button Action" or "Group Action" dropdown
   - Search and select an action from the combobox
   - The action will be applied when the page loads

2. **Adding Custom Data Attributes**:
   - Select any block
   - In the block's advanced settings panel, find the "Data Attribute" field
   - Enter a value to be added as a `data-custom` attribute

### Creating New Actions

1. **Using the Action Creator**:
   ```bash
   npm run create-action
   ```
   Follow the prompts to create a new action file.

2. **Manual Creation**:
   Create a new file in `src/actions/` with the following structure:
   ```javascript
   import { BaseAction } from './base-action';

   export const actionName = 'my-action';

   export default function init(element) {
       const action = new BaseAction(element);
       // Your action code here
   }
   ```

### Available Actions (core)

- `carousel`: Unified carousel action for image galleries with buttons, thumbnails, or both
- `scroll-to-top`: Provides smooth scroll-to-top functionality

Additional example/test actions are available in source but not shipped by default:
- `example-rate-limited`: Demonstrates rate limiting functionality
- `test-action`: Simple test action for development

## Architecture

### Core Components

1. **Block Extensions (`block-extensions.js`)**:
   - Registers custom attributes and controls in the block editor
   - Manages the action selection interface
   - Handles saving of custom attributes to blocks

2. **Frontend Handler (`frontend.js`)**:
   - Initializes actions on the frontend
   - Manages dynamic loading of action modules
   - Handles error boundaries and logging

3. **Base Action (`base-action.js`)**:
   - Provides common utilities for all actions
   - Handles security, logging, and error management
   - Manages state and DOM interactions

### Action System

Actions are modular JavaScript modules that:
- Export an action name
- Export an initialization function
- Inherit from BaseAction for common functionality
- Handle their own DOM interactions and state
- Implement proper cleanup and error handling

## Development

### Building

```bash
# Development build with watch
npm run start

# Production build
npm run build
```

### Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Adding New Block Support

To add action support to new blocks, modify the `BLOCKS_WITH_ACTIONS` constant in `block-extensions.js`:

```javascript
const BLOCKS_WITH_ACTIONS = {
    'block-name': {
        label: 'Action Label',
        help: 'Help text for the action selector'
    }
};
```

## Security

The plugin implements several security measures:
- WordPress nonce verification for AJAX requests
- Data sanitization for all inputs
- XSS protection through DOMPurify
- Basic security headers (X-XSS-Protection, X-Content-Type-Options, Referrer-Policy)
- Rate limiting for action execution
- Proper error handling and logging

### Content Security Policy (optional)

Content Security Policy (CSP) headers are **currently disabled for development** as they can interfere with local development environments. To enable CSP for production:

Enable CSP via Settings → Block Actions. Adjust the policy using the `block_actions_csp_header` filter to fit your environment.

## Debugging

Enable WordPress debug mode to see detailed logs:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Actions will log initialization, warnings, and errors to the browser console when `debug` is enabled. No server-side telemetry is sent by default.

## Logging System

The Block Actions plugin includes a centralized logging system that provides consistent error handling and telemetry across all components.

### JavaScript Logging

Each main module includes a standardized `log()` function with the following signature:

```javascript
/**
 * Centralized logging utility
 * 
 * @param {string} type - Log type: 'error', 'warning', 'info'
 * @param {string} message - Log message
 * @param {Error|null} [error] - Optional error object for error logs
 */
function log(type, message, error = null) {
    // Implementation details
}
```

#### Usage Examples:

```javascript
// Info logging (only appears in debug mode)
log('info', 'Initializing component');

// Warning logging (appears in console)
log('warning', 'Feature X is deprecated');

// Error logging (appears in console and sends to server)
try {
  // Some code that might fail
} catch (error) {
  log('error', 'Operation failed', error);
}
```

### Performance Telemetry

The plugin includes lightweight performance tracking that measures:

1. Action initialization time
2. Action execution time
3. Error counts
4. Execution counts

This data is automatically collected and sent to the server for error logs, providing valuable insights without impacting performance.

#### BaseAction Telemetry

For individual actions, the BaseAction class tracks:

```javascript
this.telemetry = {
    execCount: 0,        // Total number of executions
    errorCount: 0,       // Total number of errors
    lastExecTime: null,  // Timestamp of last execution 
    lastDuration: 0      // Last execution duration in ms
};
```

### Rate Limiting

The BaseAction class includes a sophisticated yet simple rate limiting system to prevent excessive action executions:

#### Basic Usage

The simplest way to implement rate limiting is to use the `executeWithRateLimit` helper method:

```javascript
// In your action code
this.executeWithRateLimit(() => {
    // Your rate-limited code here
    // This will automatically handle rate limiting and cleanup
});
```

#### Manual Implementation

For more control, you can use the rate limiting methods directly:

```javascript
if (this.canExecute()) {
    try {
        // Your rate-limited code here
    } finally {
        this.completeExecution(); // Important: always call this to release the execution lock
    }
}
```

#### Rate Limiting Features

- Prevents concurrent executions of the same action
- Enforces a minimum time interval between executions (500ms)
- Automatic safety timeout to prevent deadlocks
- Performance tracking for execution time
- Complete telemetry integration

### Server-side Logging

Not enabled by default. If needed, implement via custom REST routes with proper permissions and nonces.

### Debug Mode

Enable debug mode by defining `WP_DEBUG` as `true` in your wp-config.php file:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

When debug mode is active, informational logs will appear in the browser console.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

GPL-2.0-or-later 
