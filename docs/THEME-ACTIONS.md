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

Create a JavaScript file in `/actions`. The filename becomes the action ID.

**Example: `wp-content/themes/your-theme/actions/smooth-toggle.js`**

```javascript
/**
 * Smooth Toggle Action
 *
 * Toggles an element's visibility with a smooth animation.
 */

(function() {
    // Get BaseAction class from global API
    const { BaseAction } = window.BlockActions;

    // Define your action's initialization function
    function init(element) {
        const action = new BaseAction(element);

        action.target.addEventListener('click', (e) => {
            e.preventDefault();

            action.executeWithRateLimit(() => {
                // Find the target element
                const targetId = element.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);

                if (!targetElement) {
                    action.log('error', `Target element ${targetId} not found`);
                    return;
                }

                // Toggle visibility with smooth transition
                if (targetElement.style.display === 'none') {
                    targetElement.style.display = 'block';
                    action.setTextContent('Hide');
                } else {
                    targetElement.style.display = 'none';
                    action.setTextContent('Show');
                }

                action.log('info', 'Toggled element visibility');
            });
        });
    }

    // Register the action
    window.BlockActions.registerAction(
        'smooth-toggle',           // ID (must match filename)
        'Smooth Toggle',           // Label (appears in editor)
        init                       // Initialization function
    );
})();
```

### 3. That's It!

The plugin will automatically:
- Discover your action file
- Enqueue it on the frontend and in the editor
- Make it available in the block editor's action selector
- Initialize it when blocks use it

No rebuild needed!

---

## Interactivity API Compatibility (v2.0.0)

Starting with v2.0.0, the plugin supports the WordPress Interactivity API. Your existing IIFE theme actions continue to work in both modes:

- **Legacy mode** (default): Actions run exactly as before.
- **Interactivity API mode**: The built-in **legacy bridge** automatically wraps your `registerAction()` call into an Interactivity API store. Your `init(element)` function is called via a `data-wp-init` callback.

**No changes required to your existing theme actions.** They will work regardless of which mode the site administrator enables.

### How the Legacy Bridge Works

When the Interactivity API is enabled, the legacy bridge (`build/compat/legacy-bridge.js`) replaces `window.BlockActions.registerAction()` with a version that:

1. Creates an Interactivity API store namespaced as `block-actions/<your-action-id>`
2. Wraps your `init(element)` in a `callbacks.init()` that receives the element via `getElement()`
3. The PHP `Theme_Action` renderer injects the necessary `data-wp-interactive` and `data-wp-init` directives

This is transparent to your action code.

---

## API Reference

### Global API

The plugin exposes a global `window.BlockActions` object with the following:

#### `BlockActions.BaseAction`

The base class providing common utilities and security features. Available in legacy mode.

```javascript
const action = new window.BlockActions.BaseAction(element);
```

**Available Methods:**

| Method | Description |
|--------|-------------|
| `setTextContent(text)` | Safely update element text with XSS protection |
| `setStyle(property, value)` | Safely update CSS with validation |
| `executeWithRateLimit(callback)` | Execute code with automatic rate limiting |
| `canExecute()` | Check if action can execute (manual rate limiting) |
| `completeExecution()` | Release execution lock (use with canExecute) |
| `reset()` | Reset element to original state |
| `log(type, message, error)` | Log message ('error', 'warning', 'info') |
| `apiRequest(endpoint, data)` | Make authenticated WordPress API request |

**Properties:**

| Property | Description |
|----------|-------------|
| `element` | The block element |
| `target` | The clickable element (link or element itself) |
| `originalText` | Original text content of target |
| `isExecuting` | Whether action is currently executing |
| `nonce` | WordPress REST nonce |
| `restUrl` | WordPress REST API URL |
| `telemetry` | Execution metrics (execCount, errorCount, etc.) |

#### `BlockActions.registerAction(id, label, init)`

Register a custom action. Works in both legacy and Interactivity API modes.

```javascript
window.BlockActions.registerAction(
    'my-action',        // Unique ID
    'My Custom Action', // Label for editor
    initFunction        // Function that receives element
);
```

**Parameters:**
- `id` (string): Unique identifier, must match filename
- `label` (string): Human-readable label shown in editor
- `init` (function): Initialization function receiving the element

**Returns:** `true` if registered successfully, `false` if ID already exists

#### `BlockActions.getRegisteredActions()`

Get all registered actions (built-in + theme). Available in legacy mode.

```javascript
const allActions = window.BlockActions.getRegisteredActions();
// Returns: [{id: 'scroll-to-top', label: 'Scroll To Top'}, ...]
```

Note: In Interactivity API mode, this returns an empty array since stores are managed by WordPress.

---

## Action Patterns

### Basic Click Handler

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

    window.BlockActions.registerAction('my-click-action', 'My Click Action', init);
})();
```

### Manual Rate Limiting

```javascript
action.target.addEventListener('click', (e) => {
    e.preventDefault();

    if (!action.canExecute()) return;

    try {
        // Your code here
        action.log('info', 'Action executed');
    } finally {
        action.completeExecution(); // Always call this!
    }
});
```

### API Request Example

```javascript
action.executeWithRateLimit(async () => {
    try {
        const response = await action.apiRequest(
            action.restUrl + 'myplugin/v1/endpoint',
            { data: 'value' }
        );

        action.log('info', 'API request successful', response);
    } catch (error) {
        action.log('error', 'API request failed', error);
    }
});
```

### Complex Interaction

```javascript
(function() {
    const { BaseAction } = window.BlockActions;

    function init(element) {
        const action = new BaseAction(element);
        let isActive = false;

        // Click handler
        action.target.addEventListener('click', (e) => {
            e.preventDefault();

            action.executeWithRateLimit(() => {
                isActive = !isActive;

                element.classList.toggle('is-active', isActive);
                action.setTextContent(isActive ? 'Active' : 'Inactive');
                action.log('info', `Toggled to ${isActive ? 'active' : 'inactive'}`);
            });
        });

        // Hover effects
        element.addEventListener('mouseenter', () => {
            if (!isActive) {
                action.setStyle('backgroundColor', '#f0f0f0');
            }
        });

        element.addEventListener('mouseleave', () => {
            if (!isActive) {
                action.setStyle('backgroundColor', '');
            }
        });
    }

    window.BlockActions.registerAction('interactive-toggle', 'Interactive Toggle', init);
})();
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

### Multiple Actions in One File

While not recommended, you can register multiple actions in one file:

```javascript
(function() {
    const { BaseAction } = window.BlockActions;

    // Action 1
    window.BlockActions.registerAction('action-1', 'Action One', (element) => {
        // ...
    });

    // Action 2
    window.BlockActions.registerAction('action-2', 'Action Two', (element) => {
        // ...
    });
})();
```

However, it's better to use separate files for organization.

### Debugging

Enable WordPress debug mode to see action logs:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Then check your browser console for messages like:

```
[Block Actions Frontend] Registered theme action: smooth-toggle
[Block Actions Frontend] Actions initialized: 3 total (2 built-in, 1 theme)
```

---

## Best Practices

### 1. Always Use IIFE

Wrap your action in an Immediately Invoked Function Expression to avoid polluting the global scope:

```javascript
(function() {
    // Your action code
})();
```

### 2. Use Rate Limiting

Always use `executeWithRateLimit()` or `canExecute()/completeExecution()` to prevent spam:

```javascript
// Good
action.executeWithRateLimit(() => { /* code */ });

// Also good
if (action.canExecute()) {
    try { /* code */ }
    finally { action.completeExecution(); }
}

// Bad - no rate limiting
element.addEventListener('click', () => { /* code */ });
```

### 3. Use Logging

Use the `log()` method for debugging and error tracking:

```javascript
action.log('info', 'Action started');
action.log('warning', 'Something unexpected happened');
action.log('error', 'Action failed', errorObject);
```

### 4. Sanitize User Input

If your action accepts data attributes, validate and sanitize:

```javascript
const userValue = element.getAttribute('data-user-value');
if (userValue && /^[a-zA-Z0-9-]+$/.test(userValue)) {
    // Use the value
} else {
    action.log('error', 'Invalid user value');
}
```

### 5. Clean Up

If your action creates event listeners or observers, clean them up:

```javascript
function init(element) {
    const action = new BaseAction(element);
    const observer = new IntersectionObserver(/* ... */);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        observer.disconnect();
    });
}
```

---

## Common Patterns

### Scroll-Based Action

```javascript
(function() {
    const { BaseAction } = window.BlockActions;

    function init(element) {
        const action = new BaseAction(element);

        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY > 300;
            element.classList.toggle('is-scrolled', scrolled);
        });
    }

    window.BlockActions.registerAction('scroll-indicator', 'Scroll Indicator', init);
})();
```

### Tab Navigation

```javascript
(function() {
    const { BaseAction } = window.BlockActions;

    function init(element) {
        const action = new BaseAction(element);
        const tabs = element.querySelectorAll('[data-tab]');
        const panels = element.querySelectorAll('[data-panel]');

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();

                action.executeWithRateLimit(() => {
                    // Update active states
                    tabs.forEach(t => t.classList.remove('active'));
                    panels.forEach(p => p.classList.remove('active'));

                    tab.classList.add('active');
                    panels[index].classList.add('active');
                });
            });
        });
    }

    window.BlockActions.registerAction('tab-navigation', 'Tab Navigation', init);
})();
```

---

## Troubleshooting

### Action Not Appearing in Editor

1. Check that the file is in `/wp-content/themes/[active-theme]/actions/`
2. Verify the filename doesn't start with `_` or `.`
3. Clear your browser cache
4. Check the browser console for errors

### Action Not Executing

1. Verify you called `window.BlockActions.registerAction()`
2. Check that the ID matches the filename
3. Ensure the action is registered before DOM content loads
4. Check browser console for error messages
5. If using Interactivity API mode, verify the PHP `Theme_Action` renderer is registered (it should be automatic)

### Rate Limiting Too Aggressive

The default is 5 executions per second. If you need more frequent execution, consider:
1. Using throttle/debounce for scroll/resize events instead of rate limiting
2. Creating a custom execution manager for your specific use case

### Interactivity API Mode Issues

1. Ensure WordPress 6.6+ is installed
2. Verify "Use Interactivity API" is checked in Settings > Block Actions
3. Check that the legacy bridge script (`build/compat/legacy-bridge.js`) exists
4. Check browser console for Interactivity API errors

---

## Examples Repository

Check `/docs/examples/` for complete, ready-to-use action examples:

- `smooth-scroll.js` - Smooth scrolling to page sections
- `modal-toggle.js` - Modal/dialog control
- `toggle-visibility.js` - Show/hide elements
- `copy-to-clipboard.js` - Copy text to clipboard
- `alert-message.js` - Simple alert action
- `boilerplate-action.js` - Starter template

---

## Need Help?

- Check the [main README](../README.md) for plugin overview
- Review built-in actions in `/src/actions/` (legacy) or `/src/stores/` (Interactivity API) for more examples
- Enable debug mode for detailed logs
- File issues on the GitHub repository
