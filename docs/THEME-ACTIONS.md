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
import {
    store,
    getContext,
    getElement,
    withSyncEvent,
} from '@wordpress/interactivity';

store( 'block-actions/smooth-toggle', {
    actions: {
        // withSyncEvent is REQUIRED whenever a handler calls
        // event.preventDefault(), stopPropagation(), or reads
        // event.currentTarget (WordPress 6.8+).
        handleClick: withSyncEvent( ( event ) => {
            event.preventDefault();
            const ctx = getContext();
            const targetElement = document.getElementById( ctx.targetId );

            if ( ! targetElement ) {
                return;
            }

            ctx.isVisible = ! ctx.isVisible;
            targetElement.style.display = ctx.isVisible ? 'block' : 'none';
        } ),
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

### Manifest (custom label, fields, and directives — no editor script)

Drop a JSON file next to your action with the same basename — `smooth-toggle.js` → `smooth-toggle.json` — to give it a custom label, inspector fields, and extra directives without writing any editor JavaScript:

```json
{
    "label": "Smooth Toggle",
    "fields": [
        {
            "key": "target",
            "type": "text",
            "label": "Target Element ID",
            "help": "The ID of the element to toggle.",
            "dataAttribute": "data-target",
            "required": true,
            "default": ""
        }
    ],
    "directives": {
        "data-wp-on--keydown": "actions.handleKeydown"
    }
}
```

- **`label`** — overrides the filename-derived label in the action dropdown.
- **`fields`** — inspector controls (`text`, `number`, `toggle`). Each value is saved to the matching `dataAttribute` and forwarded to your store as context. `key` must be an identifier (letters, digits, underscore); `dataAttribute` must be a plain `data-…` attribute — `data-action` and the `data-wp-` namespace are reserved and rejected. A field marked `required: true` shows an inline warning in the inspector while empty (saving is never blocked). A non-empty `default` is seeded into the block when the author selects the action, so it reaches your store's context without the author touching the field.
- **`directives`** — extra `data-wp-*` directives injected on the action's root element, on top of the automatic `data-wp-init="callbacks.init"` and `data-wp-on--click="actions.handleClick"`. Window/document-scoped handlers work too (`data-wp-on-window--resize`, `data-wp-on-document--keydown`). Reserved keys are dropped: `data-wp-interactive`, `data-wp-context`, `data-wp-init`, and `data-wp-on--click` belong to the plugin's wiring — a manifest can only *add* behavior (use suffixed variants like `data-wp-init---setup` for additional init handlers).

Everything is validated server-side; unknown keys and unsafe values are dropped. The manifest replaces the need to call `registerAction()` for custom labels or fields.

### Sidecar stylesheet

Ship functional CSS next to your action with the same basename — `smooth-toggle.js` → `smooth-toggle.css` — and the plugin enqueues it on demand, the same way the action's script module loads: early (in `<head>`) when the action is detected in the page's content, with a render-time fallback for template parts and other late contexts.

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
| Rate limiting | Use a simple timestamp check (see `docs/examples/rate-limited-action.js`) |
| Text sanitization | Use `textContent` (not `innerHTML`) to prevent XSS |
| Style validation | Validate against known-safe patterns before setting styles |
| Async actions | Use generator functions (`function*` with `yield`) |
| Sync event access | Wrap handlers in `withSyncEvent` when they call `preventDefault()` |

---

## Action Patterns

### Basic Click Handler

Handlers that call `event.preventDefault()`, `event.stopPropagation()`, or read `event.currentTarget` **must** be wrapped in `withSyncEvent` (WordPress 6.8+) — without it, the event is handled asynchronously and those calls silently do nothing.

```javascript
import { store, getContext, withSyncEvent } from '@wordpress/interactivity';

store( 'block-actions/my-click-action', {
    actions: {
        handleClick: withSyncEvent( ( event ) => {
            event.preventDefault();
            const ctx = getContext();
            ctx.clicked = true;
            // Your action code here
        } ),
    },
    callbacks: {
        init() {
            return () => {};
        },
    },
} );
```

### Async API Request (Generator Function)

Use `function*` with `yield` for async operations. **Do not use `async/await`** — it breaks the Interactivity API's scope tracking. Generators compose with `withSyncEvent`:

```javascript
import { store, getContext, withSyncEvent } from '@wordpress/interactivity';

store( 'block-actions/my-api-action', {
    actions: {
        handleClick: withSyncEvent( function* ( event ) {
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
        } ),
    },
} );
```

### State Toggle with Cleanup

```javascript
import {
    store,
    getContext,
    getElement,
    withSyncEvent,
} from '@wordpress/interactivity';

store( 'block-actions/interactive-toggle', {
    state: {
        get isActiveClass() {
            const ctx = getContext();
            return ctx.isActive ? 'is-active' : '';
        },
    },
    actions: {
        handleClick: withSyncEvent( ( event ) => {
            event.preventDefault();
            const ctx = getContext();
            ctx.isActive = ! ctx.isActive;
        } ),
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

### Supporting More Block Types

By default the action selector appears only on **Button** and **Group** blocks. Opt additional block types in with the `blockActions.supportedBlocks` JavaScript filter from a theme or plugin editor script:

```javascript
// Enqueue this on enqueue_block_editor_assets, e.g. my-theme-editor.js
import { addFilter } from '@wordpress/hooks';

addFilter(
    'blockActions.supportedBlocks',
    'my-theme/image-actions',
    ( blocks ) => ( {
        ...blocks,
        'core/image': {
            label: 'Image Action',
            help: 'Add an action to this image.',
        },
    } )
);
```

The filtered map drives the whole pipeline — attribute registration, the inspector control, and the saved `data-action` output — so the chosen block becomes fully action-capable with no other changes. The action still needs a renderer: built-in actions and the generic `Theme_Action` renderer work on any block that carries `data-action`, so most actions just work on the newly-supported block.

### Custom Action Directories

Add directories beyond the theme's `/actions` folder with the `block_actions_directories` filter. Paths under the active theme, the parent theme, or `wp-content` (including plugin directories) have their URL derived automatically:

```php
add_filter( 'block_actions_directories', function ( $directories ) {
    $directories[] = get_stylesheet_directory() . '/custom-actions'; // child theme
    $directories[] = get_template_directory() . '/actions';          // parent theme
    $directories[] = WP_PLUGIN_DIR . '/my-plugin/actions';           // a plugin
    return $directories;
} );
```

For a location **outside** those web roots (e.g. a symlinked or `mu-plugins`-adjacent path), pass an explicit `{ path, url }` pair so the frontend can load the module:

```php
add_filter( 'block_actions_directories', function ( $directories ) {
    $directories[] = array(
        'path' => '/srv/shared/block-actions',
        'url'  => 'https://cdn.example.com/block-actions',
    );
    return $directories;
} );
```

### Action File Naming

- **Good**: `my-action.js`, `toggle-menu.js` (lowercase kebab-case)
- **Bad**: `_private.js` (starts with underscore), `.hidden.js` (starts with dot), `MyAction.js` (mixed case — the ID is normalized to `myaction`, so the filename no longer matches)

Files starting with `_` or `.` are ignored. Action IDs are derived from the filename via `sanitize_key()`, so stick to lowercase letters, numbers, and hyphens. Avoid reusing a built-in action name (`scroll-to-top`, `carousel`, `toggle-visibility`, `modal-toggle`, `smooth-scroll`, `copy-to-clipboard`) — the built-in renderer and store would take precedence over yours.

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

### 2. Throttle Expensive Work

Rate limiting is for I/O (network requests, heavy computation) — plain UI clicks don't need it. When you do need it, keep the throttle state in context so it's per-instance:

```javascript
actions: {
    handleClick: withSyncEvent( ( event ) => {
        event.preventDefault();
        const ctx = getContext();
        const now = Date.now();
        if ( now - ( ctx.lastClick || 0 ) < 200 ) return; // 200ms throttle
        ctx.lastClick = now;
        // Your expensive action code...
    } ),
},
```

For a complete per-element rolling-window limiter, see `docs/examples/rate-limited-action.js`.

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
4. Ensure WordPress 7.0+ is installed
5. If `preventDefault()` seems ignored, wrap the handler in `withSyncEvent`

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
