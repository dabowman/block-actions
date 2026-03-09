# Block Actions

Tested up to: 6.8
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Assign modular actions and data attributes to blocks for lightweight frontend interactivity.

## Features

- **Custom Actions System**: Add dynamic behaviors to blocks through a modular action system
- **WordPress Interactivity API** (v2.0.0): Declarative, reactive stores with server-side directive injection
- **Theme Actions Support**: Add custom actions from your theme without rebuilding the plugin
- **Legacy Bridge**: Existing IIFE theme actions work automatically with the Interactivity API
- **Data Attributes**: Add custom data attributes to any block
- **Block-Specific Actions**: Configure which blocks can receive actions
- **Searchable Action Selection**: ComboboxControl interface for easy action discovery and selection
- **Error Handling & Logging**: Comprehensive error handling and debug logging system
- **Accessibility**: Built-in accessibility features for all actions
- **Security**: XSS protection via DOMPurify, nonce verification, rate limiting, and optional CSP headers
- **Extensible API**: Global JavaScript API and PHP renderer system for registering and managing actions

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

### Choosing a Frontend Mode

Block Actions v2.0.0 supports two frontend rendering systems:

- **Legacy mode** (default): Classic imperative DOM manipulation via `BaseAction` class. Works with all WordPress 6.0+ sites.
- **Interactivity API mode** (opt-in): Declarative stores with server-side directive injection. Requires WordPress 6.6+.

Enable the Interactivity API via **Settings > Block Actions > "Use Interactivity API"**.

Both modes use the same editor UI and `data-action` attributes. Existing theme actions using `window.BlockActions.registerAction()` continue to work in Interactivity API mode via the built-in legacy bridge.

### Creating Custom Actions (Theme Developers)

**The easiest way** - No plugin rebuild required!

1. Create an `/actions` folder in your active theme
2. Add a JavaScript file (e.g., `my-action.js`)
3. Use the global API to register your action:

```javascript
(function() {
    const { BaseAction } = window.BlockActions;

    function init(element) {
        const action = new BaseAction(element);

        action.target.addEventListener('click', (e) => {
            e.preventDefault();

            action.executeWithRateLimit(() => {
                // Your action code here
                action.setTextContent('Clicked!');
                setTimeout(() => action.reset(), 2000);
            });
        });
    }

    // Register with the plugin
    window.BlockActions.registerAction(
        'my-action',        // ID (must match filename)
        'My Custom Action', // Label for editor
        init               // Init function
    );
})();
```

4. The action will automatically appear in the block editor!

This IIFE pattern works in both legacy and Interactivity API modes. In Interactivity API mode, the legacy bridge wraps your `init()` function in a store automatically.

**[See full Theme Actions Guide](docs/THEME-ACTIONS.md)**

### Creating Built-in Actions (Plugin Developers)

To add actions that ship with the plugin:

1. **Using the Action Creator**:
   ```bash
   npm run create-action
   ```
   Follow the prompts to create a new action file.

2. **Manual Creation (Interactivity API)**:
   Create a store in `src/stores/your-action/view.js`:
   ```javascript
   import { store, getContext, getElement } from '@wordpress/interactivity';
   import { getRateLimiter } from '../utils/rate-limiter';

   store( 'block-actions/your-action', {
       actions: {
           handleClick( event ) {
               event.preventDefault();
               const { ref } = getElement();
               const limiter = getRateLimiter( ref );
               if ( ! limiter.canExecute() ) return;

               const ctx = getContext();
               // Your action logic here
           },
       },
       callbacks: {
           init() {
               const ctx = getContext();
               const { ref } = getElement();
               // Initialization logic

               // Return a cleanup function if you set up observers,
               // timers, or event listeners (Interactivity API best practice).
               return () => { /* cleanup */ };
           },
       },
   } );
   ```

   Then create a PHP renderer in `includes/renderers/class-your-action.php` and add the webpack entry.

3. **Manual Creation (Legacy)**:
   Create `src/actions/your-action.js`:
   ```javascript
   import { BaseAction } from './base-action';

   export default function init(element) {
       const action = new BaseAction(element);
       // Your action code here
   }
   ```

4. **Add to CORE_ACTION_IDS** in `src/actions/index.js`
5. **Rebuild the plugin**: `npm run build`

### Available Actions

**Built-in Actions** (shipped with plugin):
- `carousel`: Unified carousel action for image galleries with buttons, thumbnails, or both
- `scroll-to-top`: Provides smooth scroll-to-top functionality

**Example Actions** (available in `/docs/examples/`):
- `smooth-scroll`: Smooth scrolling to page sections
- `modal-toggle`: Open/close modals and dialogs

**Additional Resources:**
- Source examples: `example-rate-limited`, `test-action` (in `/src/actions/`)
- [Create your own theme actions](docs/THEME-ACTIONS.md)

## Architecture

### Core Components

1. **Block Extensions (`block-extensions.js`)**:
   - Registers custom attributes and controls in the block editor
   - Manages the action selection interface
   - Handles saving of custom attributes to blocks
   - Displays both built-in and theme actions

2. **Frontend Handler (`frontend.js`)** — Legacy mode:
   - Initializes actions on the frontend
   - Manages action registry (built-in + theme)
   - Exposes global API for theme actions
   - Handles error boundaries and logging

3. **Interactivity API Stores (`src/stores/`)** — v2.0.0:
   - Per-action stores using `@wordpress/interactivity` `store()` API
   - Reactive derived state (getters), declarative actions, and init callbacks
   - Shared utilities: `rate-limiter.js`, `sanitize.js`, `api.js`

4. **PHP Directive Transformer** — v2.0.0:
   - `render_block` filter using `WP_HTML_Tag_Processor` for safe HTML manipulation
   - Per-action renderers inject `data-wp-interactive`, `data-wp-context`, and directives
   - Script modules enqueued automatically via `wp_enqueue_script_module()`

5. **Base Action (`base-action.js`)** — Legacy mode:
   - Provides common utilities for all actions
   - Handles security, logging, and error management
   - Manages state and DOM interactions
   - Available globally as `window.BlockActions.BaseAction`

### Action System

**Built-in Actions** are available in both modes:
- **Legacy**: Webpack-bundled JavaScript modules exporting an `init` function
- **Interactivity API**: Per-action stores built as script modules, with PHP renderers for server-side directive injection

**Theme Actions** are standalone JavaScript files that:
- Live in `/wp-content/themes/your-theme/actions/`
- Register themselves using the global API
- Work in both modes (legacy bridge provides automatic compatibility)
- Don't require rebuilding the plugin

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

To add action support to new blocks, modify the `BLOCKS_WITH_ACTIONS` constant in `src/block-extensions.js`:

```javascript
const BLOCKS_WITH_ACTIONS = {
    'core/block-name': {
        label: 'Action Label',
        help: 'Help text for the action selector'
    }
};
```

Then rebuild: `npm run build`

### Global API Reference

The plugin exposes `window.BlockActions` with:

| Method/Property | Description |
|----------------|-------------|
| `BaseAction` | Base class for creating actions (legacy mode) |
| `registerAction(id, label, init)` | Register a custom action (works in both modes) |
| `getRegisteredActions()` | Get all registered actions (legacy mode) |

See the [Theme Actions Guide](docs/THEME-ACTIONS.md) for complete API documentation.

### Interactivity API Store Utilities

When building stores for the Interactivity API, these shared utilities are available:

| Module | Export | Description |
|--------|--------|-------------|
| `utils/rate-limiter` | `getRateLimiter(element)` | WeakMap-based per-element rate limiting (auto GC) |
| `utils/rate-limiter` | `createRateLimiter(maxPerSecond)` | Create a standalone rate limiter instance |
| `utils/sanitize` | `sanitizeText(text)` | Strip HTML via DOMPurify |
| `utils/sanitize` | `validateStyle(property, value)` | Validate CSS values against allowlist |
| `utils/api` | `apiRequest(endpoint, data)` | Nonce-authenticated WordPress REST API fetch |
| `utils/api` | `log(type, message, error)` | Centralized logging utility |

## Security

The plugin implements several security measures:
- WordPress nonce verification for AJAX requests
- Data sanitization for all inputs
- XSS protection through DOMPurify
- Basic security headers (X-Content-Type-Options, Referrer-Policy)
- Rate limiting for action execution (5 per second per element)
- Proper error handling and logging
- `WP_HTML_Tag_Processor` for safe server-side HTML manipulation (v2.0.0)

### Content Security Policy (optional)

CSP headers are **disabled by default**. To enable CSP for production:

Enable CSP via Settings > Block Actions. Adjust the policy using the `block_actions_csp_header` filter to fit your environment.

## Logging System

The Block Actions plugin includes a centralized logging system that provides consistent error handling and telemetry across all components.

### JavaScript Logging

Both the legacy `BaseAction` and the Interactivity API `log()` utility share the same signature:

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

The legacy `BaseAction` class includes lightweight performance tracking that measures:

1. Action initialization time
2. Action execution time
3. Error counts
4. Execution counts

#### BaseAction Telemetry

```javascript
this.telemetry = {
    execCount: 0,        // Total number of executions
    errorCount: 0,       // Total number of errors
    lastExecTime: null,  // Timestamp of last execution
    lastDuration: 0      // Last execution duration in ms
};
```

### Rate Limiting

Both frontend systems include rate limiting:

#### Legacy (BaseAction)

```javascript
// Simple
this.executeWithRateLimit(() => {
    // Your rate-limited code here
});

// Manual
if (this.canExecute()) {
    try {
        // Your rate-limited code here
    } finally {
        this.completeExecution();
    }
}
```

#### Interactivity API (v2.0.0)

```javascript
import { getRateLimiter } from '../utils/rate-limiter';

// In a store action:
const { ref } = getElement();
const limiter = getRateLimiter( ref );
if ( ! limiter.canExecute() ) {
    return;
}
// Proceed with action...
```

The Interactivity API rate limiter uses a `WeakMap` keyed by DOM element, so limiter state is automatically garbage collected when elements are removed.

### Server-side Logging

Not enabled by default. If needed, implement via custom REST routes with proper permissions and nonces.

### Debug Mode

Enable debug mode by defining `WP_DEBUG` as `true` in your wp-config.php file:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

When debug mode is active, informational logs will appear in the browser console.

## FAQ

**Can I use this with any theme?**
Yes. Create an `/actions` folder in your theme and drop in your action files.

**Do I need to rebuild the plugin for new actions?**
No. Theme actions are auto-discovered — no rebuild required.

**What's the difference between legacy and Interactivity API mode?**
Legacy uses imperative DOM manipulation. Interactivity API uses declarative stores with server-side rendering. Both produce the same user-facing behavior. The Interactivity API is the WordPress standard going forward.

**Will existing theme actions break if I enable the Interactivity API?**
No. The legacy bridge automatically wraps IIFE-style `registerAction()` calls into Interactivity API stores.

**What if I need editor preview?**
Build a custom block. Actions are for frontend-only interactions.

**Does it work with block themes?**
Yes. Works with classic or block themes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

GPL-2.0-or-later
