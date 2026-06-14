# Block Actions

Requires at least: 7.0
Tested up to: 7.0
Requires PHP: 8.0
Stable tag: 3.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Assign modular actions and data attributes to blocks for lightweight frontend interactivity.

## Features

- **Custom Actions System**: Add dynamic behaviors to blocks through a modular action system
- **WordPress Interactivity API**: Declarative, reactive stores with server-side directive injection
- **Theme Actions Support**: Add custom actions from your theme without rebuilding the plugin
- **Data Attributes**: Add custom data attributes to any block
- **Block-Specific Actions**: Configure which blocks can receive actions
- **Searchable Action Selection**: ComboboxControl interface for easy action discovery and selection
- **Accessibility**: Server-rendered ARIA attributes, keyboard navigation, native `<dialog>` semantics
- **Security**: Server-side directive injection via `WP_HTML_Tag_Processor`, sanitized scalar-only context forwarding, escaped output
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

### Creating Custom Actions (Theme Developers)

**The easiest way** - No plugin rebuild required!

1. Create an `/actions` folder in your active theme
2. Add a JavaScript file (e.g., `my-action.js`) as an ES module using `@wordpress/interactivity`
3. Create a corresponding PHP renderer or rely on the generic `Theme_Action` renderer

```javascript
/**
 * My Custom Action
 * File: wp-content/themes/your-theme/actions/my-action.js
 */
import { store, getContext, withSyncEvent } from '@wordpress/interactivity';

store( 'block-actions/my-action', {
    actions: {
        // withSyncEvent is required when calling preventDefault() (WP 6.8+).
        handleClick: withSyncEvent( ( event ) => {
            event.preventDefault();
            const ctx = getContext();
            ctx.clicked = true;
            // Your action logic here
        } ),
    },
    callbacks: {
        init() {
            const ctx = getContext();
            const { ref } = getElement();
            // Initialization logic

            return () => { /* cleanup */ };
        },
    },
} );
```

4. The action will automatically appear in the block editor!

**[See full Theme Actions Guide](docs/THEME-ACTIONS.md)**

### Creating Built-in Actions (Plugin Developers)

To add actions that ship with the plugin:

1. **Using the Action Creator**:
   ```bash
   npm run create-action
   ```
   Follow the prompts to create a new action file.

2. **Manual Creation**:
   Create a store in `src/stores/your-action/view.js`:
   ```javascript
   import {
       store,
       getContext,
       withSyncEvent,
   } from '@wordpress/interactivity';

   store( 'block-actions/your-action', {
       actions: {
           // withSyncEvent is required when the handler calls
           // event.preventDefault() (WP 6.8+).
           handleClick: withSyncEvent( ( event ) => {
               event.preventDefault();
               const ctx = getContext();
               // Flip context flags; bind state getters from the PHP
               // renderer so the view updates reactively.
           } ),
       },
       callbacks: {
           init() {
               // Imperative setup only (listeners, observers).
               // Return a cleanup function if you set anything up.
               return () => { /* cleanup */ };
           },
       },
   } );
   ```

   Then create a PHP renderer in `includes/renderers/class-your-action.php` (extend `Action_Renderer`), register it in `block-actions.php` → `init_interactivity_api()`, and add the action to the `ACTIONS` array in `webpack.config.js`.

3. **Rebuild the plugin**: `npm run build`

### Available Actions

**Built-in Actions** (shipped with plugin):
- `scroll-to-top`: Smooth scroll-to-top functionality
- `carousel`: Image galleries with buttons, thumbnails, or both
- `toggle-visibility`: Show/hide any element by ID
- `modal-toggle`: Open/close modals and dialogs with backdrop, ESC key, and focus management
- `smooth-scroll`: Smooth scrolling to page sections with configurable offset
- `copy-to-clipboard`: Copy text to clipboard with visual feedback

**Copy-paste templates** for theme actions are available in `/docs/examples/`.

**Additional Resources:**
- [Create your own theme actions](docs/THEME-ACTIONS.md)

## Architecture

### Core Components

1. **Block Extensions (`block-extensions.js`)**:
   - Registers custom attributes and controls in the block editor
   - Manages the action selection interface
   - Handles saving of custom attributes to blocks
   - Displays both built-in and theme actions

2. **Interactivity API Stores (`src/stores/`)**:
   - Per-action stores using `@wordpress/interactivity` `store()` API
   - Reactive derived state (getters), declarative actions, and init callbacks
   - Shared feedback-pattern helpers in `src/stores/utils/create-feedback-store.js`

3. **PHP Directive Transformer**:
   - `render_block` filter using `WP_HTML_Tag_Processor` for safe HTML manipulation
   - Per-action renderers inject `data-wp-interactive`, `data-wp-context`, and directives
   - Script modules enqueued automatically via `wp_enqueue_script_module()`

### Action System

**Built-in Actions** are per-action Interactivity API stores built as script modules, with PHP renderers for server-side directive injection.

**Theme Actions** are ES module JavaScript files that:
- Live in `/wp-content/themes/your-theme/actions/`
- Use `@wordpress/interactivity` `store()` for frontend behavior
- Register themselves in the editor via `window.BlockActions.registerAction()`
- Don't require rebuilding the plugin

## Development

### Local WordPress environment

The repo ships a [`@wordpress/env`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/) config that boots a sandboxed WordPress in Docker with this plugin pre-mounted.

**Prereqs:** Docker Desktop running, and `wp-env` installed globally (`npm install -g @wordpress/env`).

```bash
npm run env:start      # first time takes ~1–2 min
# → http://localhost:8888  (admin / password)

npm run env:stop       # stop containers
npm run env:destroy    # nuke containers + volumes
npm run env:cli -- plugin list   # run wp-cli inside the container
```

Configure in `.wp-env.json`; copy to `.wp-env.override.json` (gitignored) for machine-local tweaks.

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
| `registerAction(id, label, init)` | Register a custom action (populates editor dropdown) |

See the [Theme Actions Guide](docs/THEME-ACTIONS.md) for complete API documentation.

### Interactivity API Store Utilities

When building built-in stores, shared helpers for the "transient feedback" pattern live in `src/stores/utils/create-feedback-store.js`:

| Export | Description |
|--------|-------------|
| `createFeedbackInit(timers)` | Init callback capturing the button's original text + timer cleanup |
| `createFeedbackAction(timers, config)` | Click handler that runs a side effect and flips `context.isScrolling` for a duration |
| `feedbackButtonText(ctx)` | Derived-state helper returning the feedback or original label |

Theme actions are standalone ES modules and can't import these — copy the patterns from `/docs/examples/` instead.

## Security

- **Server-side directive injection** uses `WP_HTML_Tag_Processor` — no regex HTML manipulation, attribute values are safely encoded
- **Theme action context forwarding** accepts scalar values only; keys are validated and string values pass through `sanitize_text_field`
- **Action IDs from content** are only honored when a registered renderer exists for them
- **Renderer errors are isolated** — a failing renderer logs and returns the original block markup rather than breaking the page
- **All PHP output is escaped**; stores use `textContent`-style updates (never `innerHTML`)

### A note on deactivation

Action attributes are added to block markup at save time. If you deactivate the plugin, existing blocks that carry an action will show an "unexpected or invalid content" notice the next time they're edited, because the saved markup no longer matches what core generates. The frontend keeps rendering fine (the attributes are inert without the plugin). To recover, either reactivate the plugin or use "Attempt recovery" on the affected blocks to strip the attributes.

### Debug Mode

With `WP_DEBUG` enabled, the plugin logs renderer errors and theme-action discovery warnings to the PHP error log, and the stores log warnings (e.g. a modal target that isn't a `<dialog>`) to the browser console.

## FAQ

**Can I use this with any theme?**
Yes. Create an `/actions` folder in your theme and drop in your action files.

**Do I need to rebuild the plugin for new actions?**
No. Theme actions are auto-discovered — no rebuild required.

**What if I need editor preview?**
Build a custom block. Actions are for frontend-only interactions.

**Does it work with block themes?**
Yes. Works with classic or block themes.

**What happens if I deactivate the plugin?**
The frontend keeps rendering (saved attributes are inert without the plugin), but blocks carrying an action will show an invalid-content notice when next edited. Reactivate the plugin or use "Attempt recovery" to strip the attributes. See the Security section above.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

GPL-2.0-or-later
