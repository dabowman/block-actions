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

### 3. Register for the Editor

To make the action appear in the block editor's action dropdown, add a script that calls `registerAction()`:

```javascript
// This runs in the editor context (enqueued separately or inline)
window.BlockActions.registerAction(
    'smooth-toggle',           // ID (must match filename)
    'Smooth Toggle',           // Label (appears in editor)
    () => {}                   // Placeholder (not used on frontend)
);
```

### 4. That's It!

The plugin will automatically:
- Discover your action file
- Enqueue it on the frontend as a script module
- Make it available in the block editor's action selector (via `registerAction()`)
- Process directives via the `Theme_Action` PHP renderer

No rebuild needed!

---

## API Reference

### Global API

The plugin exposes a global `window.BlockActions` object:

#### `BlockActions.registerAction(id, label, init)`

Register a custom action for the editor dropdown.

```javascript
window.BlockActions.registerAction(
    'my-action',        // Unique ID
    'My Custom Action', // Label for editor
    () => {}            // Placeholder init function
);
```

**Parameters:**
- `id` (string): Unique identifier, must match filename
- `label` (string): Human-readable label shown in editor
- `init` (function): Placeholder function (frontend behavior is handled by the Interactivity API store)

**Returns:** `true` if registered successfully, `false` if ID already exists

### Store Utilities

When building stores, these shared utilities are available:

| Module | Export | Description |
|--------|--------|-------------|
| `utils/rate-limiter` | `getRateLimiter(element)` | WeakMap-based per-element rate limiting (auto GC) |
| `utils/rate-limiter` | `createRateLimiter(maxPerSecond)` | Create a standalone rate limiter instance |
| `utils/sanitize` | `sanitizeText(text)` | Strip HTML via DOMPurify |
| `utils/sanitize` | `validateStyle(property, value)` | Validate CSS values against allowlist |
| `utils/api` | `apiRequest(endpoint, data)` | Nonce-authenticated WordPress REST API fetch |
| `utils/api` | `log(type, message, error)` | Centralized logging utility |

---

## Action Patterns

### Basic Click Handler

```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/my-click-action', {
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const { ref } = getElement();
            const limiter = getRateLimiter( ref );
            if ( ! limiter.canExecute() ) return;

            const ctx = getContext();
            ctx.clicked = true;
            // Your action code here
        },
    },
} );
```

### API Request Example

```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';
import { apiRequest, log } from '../utils/api';

store( 'block-actions/my-api-action', {
    actions: {
        *handleClick( event ) {
            event.preventDefault();
            const ctx = getContext();

            try {
                const response = yield apiRequest( '/myplugin/v1/endpoint', { data: 'value' } );
                log( 'info', 'API request successful' );
                ctx.result = response;
            } catch ( error ) {
                log( 'error', 'API request failed', error );
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

### 2. Use Rate Limiting

Use `getRateLimiter()` for click handlers to prevent spam:

```javascript
import { getRateLimiter } from '../utils/rate-limiter';

const { ref } = getElement();
const limiter = getRateLimiter( ref );
if ( ! limiter.canExecute() ) return;
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

If your action accepts data attributes, validate and sanitize:

```javascript
import { sanitizeText } from '../utils/sanitize';

const userValue = ref.getAttribute( 'data-user-value' );
const clean = sanitizeText( userValue );
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
3. Ensure `window.BlockActions.registerAction()` is called in the editor context
4. Clear your browser cache
5. Check the browser console for errors

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
