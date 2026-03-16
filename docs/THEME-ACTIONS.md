# Creating Theme Actions

This guide shows you how to add custom actions to your WordPress theme without modifying or rebuilding the Block Actions plugin.

## Quick Start

### 1. Create an Actions Folder

In your active theme directory, create an `/actions` folder:

```
wp-content/themes/your-theme/
├── actions/              <-- Create this folder
│   └── your-action.js   <-- Your custom action file
├── functions.php
└── style.css
```

### 2. Create an Action File

Create a JavaScript file in `/actions`. The filename becomes the action ID. Theme actions are ES modules that use `@wordpress/interactivity`.

**Example: `wp-content/themes/your-theme/actions/smooth-toggle.js`**

```javascript
/**
 * Smooth Toggle Action
 *
 * Toggles an element's visibility with a smooth animation.
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/smooth-toggle', {
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const ctx = getContext();
            const targetElement = document.getElementById( ctx.targetId );

            if ( ! targetElement ) {
                return;
            }

            ctx.isVisible = ! ctx.isVisible;
            targetElement.style.display = ctx.isVisible ? 'block' : 'none';
        },
    },
    callbacks: {
        init() {
            const ctx = getContext();
            const { ref } = getElement();

            // Read configuration from data attributes
            ctx.targetId = ref.getAttribute( 'data-target' );
            ctx.isVisible = true;

            // Return cleanup function
            return () => {};
        },
    },
} );
```

### 3. That's It!

The plugin will automatically:
- Discover your action file in the theme's `/actions` directory
- Register it in the block editor's action dropdown (label is derived from the filename)
- Enqueue it on the frontend as an ES script module
- Process directives via the `Theme_Action` PHP renderer

No rebuild needed! No editor registration code required.

> **Custom labels or fields:** If you need a custom label (instead of the auto-generated one from the filename) or want to add inspector fields for your action, you can optionally call `window.BlockActions.registerAction()` from a separate editor script. See the [API Reference](#global-api) below.

---

## API Reference

### Editor Auto-Registration

Theme actions are **automatically registered** in the editor dropdown when the plugin discovers `.js` files in your theme's `/actions` directory. The label is derived from the filename (e.g., `smooth-toggle.js` → "Smooth Toggle").

No manual registration is needed for basic use cases.

### Global API (Optional)

The plugin exposes a global `window.BlockActions` object for advanced use cases such as custom labels or adding inspector fields.

#### `BlockActions.registerAction(id, label, fieldsOrInit, [init])`

Manually register a custom action for the editor dropdown. Supports two call signatures:

```javascript
// Simple: just ID, label, and placeholder init
window.BlockActions.registerAction(
    'my-action',        // Unique ID (must match filename)
    'My Custom Action', // Label for editor
    () => {}            // Placeholder init function
);

// With fields: adds inspector controls for configuring data attributes
window.BlockActions.registerAction(
    'my-action',
    'My Custom Action',
    [
        {
            key: 'target',
            type: 'text',              // 'text', 'number', or 'toggle'
            label: 'Target Element ID',
            help: 'The ID of the element to target.',
            dataAttribute: 'data-target', // Maps to HTML attribute
            required: true,
            default: '',
        },
    ],
    () => {}
);
```

**Parameters:**
- `id` (string): Unique identifier, must match filename
- `label` (string): Human-readable label shown in editor
- `fieldsOrInit` (Array|Function): Field definitions array, or init function if no fields
- `init` (Function, optional): Init function when fields are provided as 3rd argument

**Returns:** `true` if registered successfully, `false` if ID already exists or validation fails

### Store Utilities (Built-in Actions Only)

The following utilities are used by the plugin's built-in action stores. They are imported via relative paths within the webpack build and are **not directly available to theme actions** (which are standalone ES modules).

If your theme action needs similar functionality, implement it directly in your action file. See the example files in `/docs/examples/` for patterns.

| Utility | Description |
|---------|-------------|
| Rate limiting | Use a simple timestamp check (see built-in `src/stores/utils/rate-limiter.js`) |
| Text sanitization | Use `textContent` (not `innerHTML`) to prevent XSS |
| Style validation | Validate against known-safe patterns before setting styles |
| Async actions | Use generator functions (`function*` with `yield`) |

---

## Action Patterns

### Basic Click Handler

```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/my-click-action', {
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const ctx = getContext();
            ctx.clicked = true;
            // Your action code here
        },
    },
    callbacks: {
        init() {
            return () => {};
        },
    },
} );
```

### Async API Request (Generator Function)

Use `function*` with `yield` for async operations. **Do not use `async/await`** — it breaks the Interactivity API's scope tracking.

```javascript
import { store, getContext } from '@wordpress/interactivity';

store( 'block-actions/my-api-action', {
    actions: {
        *handleClick( event ) {
            event.preventDefault();
            const ctx = getContext();

            try {
                const response = yield fetch( '/wp-json/myplugin/v1/endpoint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify( { data: 'value' } ),
                } );
                ctx.result = yield response.json();
            } catch ( error ) {
                console.error( '[Block Actions] API request failed', error );
            }
        },
    },
} );
```

### State Toggle with Cleanup

```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'block-actions/interactive-toggle', {
    state: {
        get isActiveClass() {
            const ctx = getContext();
            return ctx.isActive ? 'is-active' : '';
        },
    },
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const ctx = getContext();
            ctx.isActive = ! ctx.isActive;
        },
    },
    callbacks: {
        init() {
            const ctx = getContext();
            const { ref } = getElement();
            ctx.isActive = false;

            const handleMouseEnter = () => {
                if ( ! ctx.isActive ) {
                    ref.style.backgroundColor = '#f0f0f0';
                }
            };
            const handleMouseLeave = () => {
                if ( ! ctx.isActive ) {
                    ref.style.backgroundColor = '';
                }
            };

            ref.addEventListener( 'mouseenter', handleMouseEnter );
            ref.addEventListener( 'mouseleave', handleMouseLeave );

            return () => {
                ref.removeEventListener( 'mouseenter', handleMouseEnter );
                ref.removeEventListener( 'mouseleave', handleMouseLeave );
            };
        },
    },
} );
```

---

## Advanced Usage

### Custom Action Directories

Add custom directories beyond the theme's `/actions` folder:

```php
// In your theme's functions.php or plugin
add_filter('block_actions_directories', function($directories) {
    $directories[] = get_template_directory() . '/custom-actions';
    $directories[] = WP_PLUGIN_DIR . '/my-plugin/actions';
    return $directories;
});
```

### Action File Naming

- **Good**: `my-action.js`, `smooth-scroll.js`, `toggle-menu.js`
- **Bad**: `_private.js` (starts with underscore), `.hidden.js` (starts with dot)

Files starting with `_` or `.` are ignored.

### Debugging

Enable WordPress debug mode to see action logs:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Then check your browser console for messages from the Interactivity API stores.

---

## Best Practices

### 1. Return Cleanup Functions

Always return a cleanup function from `callbacks.init()` if you set up observers, timers, or event listeners:

```javascript
callbacks: {
    init() {
        const { ref } = getElement();
        const observer = new IntersectionObserver( /* ... */ );
        observer.observe( ref );

        return () => {
            observer.disconnect();
        };
    },
},
```

### 2. Prevent Rapid Clicks

Implement simple rate limiting in your action to prevent spam:

```javascript
let lastClick = 0;
actions: {
    handleClick( event ) {
        event.preventDefault();
        const now = Date.now();
        if ( now - lastClick < 200 ) return; // 200ms throttle
        lastClick = now;
        // Your action code...
    },
},
```

### 3. Use Context for State

Store per-instance state in the Interactivity API context, not in module-level variables:

```javascript
// Good - per-instance state
const ctx = getContext();
ctx.isActive = ! ctx.isActive;

// Bad - shared across all instances
let isActive = false;
isActive = ! isActive;
```

### 4. Sanitize User Input

If your action displays user-provided data, always use `textContent` (not `innerHTML`) to prevent XSS:

```javascript
const userValue = ref.getAttribute( 'data-user-value' ) || '';
const link = ref.querySelector( 'a' ) || ref;
link.textContent = userValue; // Safe — textContent never parses HTML
```

### 5. Use Generator Functions for Async

Use generator functions (with `yield`) for async operations in Interactivity API actions:

```javascript
actions: {
    *handleClick( event ) {
        event.preventDefault();
        const result = yield fetch( '/api/endpoint' );
        const data = yield result.json();
        // Use data...
    },
},
```

---

## Troubleshooting

### Action Not Appearing in Editor

1. Check that the file is in `/wp-content/themes/[active-theme]/actions/`
2. Verify the filename doesn't start with `_` or `.`
3. Clear your browser cache
4. Check the browser console for errors
5. If using a custom label, ensure `window.BlockActions.registerAction()` is called from an editor-enqueued script

### Action Not Executing

1. Verify the store namespace matches `block-actions/<action-id>`
2. Check that the ID matches the filename
3. Check browser console for Interactivity API errors
4. Ensure WordPress 6.6+ is installed

### Rate Limiting Too Aggressive

The default is 5 executions per second. If you need more frequent execution, consider:
1. Using throttle/debounce for scroll/resize events instead of rate limiting
2. Creating a custom execution manager for your specific use case

---

## Examples Repository

Check `/docs/examples/` for complete, ready-to-use action examples.

See built-in actions in `/src/stores/` for more examples of Interactivity API store patterns.

---

## Need Help?

- Check the [main README](../README.md) for plugin overview
- Review built-in actions in `/src/stores/` for examples
- Enable debug mode for detailed logs
- File issues on the GitHub repository
