# CLAUDE.md — Block Actions

## Project Overview

**Block Actions** is a WordPress plugin that extends core blocks (`core/button`, `core/group`) with custom JavaScript actions and data attributes. It lets theme and plugin developers add interactivity (carousels, modals, scroll behavior, etc.) to WordPress blocks without building custom blocks or rebuilding the plugin.

The plugin uses the WordPress Interactivity API for its frontend: declarative stores using `@wordpress/interactivity` with server-side directive injection via PHP renderers.

- **Version:** 3.0.0
- **Requirements:** WordPress 7.0+ (runtime guard with admin notice on older versions), PHP 8.0+, Node.js 20+
- **License:** GPL-2.0-or-later
- **Namespace (PHP):** `Block_Actions`

## Repository Structure

```
block-actions/
├── block-actions.php              # Main plugin entry point (PHP)
├── package.json                   # Dependencies, scripts, Jest config
├── webpack.config.js              # Multi-entry webpack config (9 entries)
├── .babelrc                       # Babel config (WP element pragmas; browserslist in package.json keeps generators NATIVE — see Gotchas)
├── .eslintrc.js                   # ESLint config (extends @wordpress/eslint-plugin)
├── .github/workflows/ci.yml      # GitHub Actions CI
├── includes/                      # PHP classes for Interactivity API
│   ├── class-directive-transformer.php  # render_block filter, trigger wiring, keyboard-operability pass
│   ├── class-action-renderer.php        # Abstract base (get_namespace/get_entry_action/get_supported_triggers)
│   ├── class-interactions.php           # Trigger×behavior tuples: data-interactions parsing, trigger injection, engine enqueue
│   ├── class-query-params.php           # Query actions: bq-* param→query-var mapping, enhancedPagination force-off, no-JS hrefs
│   └── renderers/                       # Per-action PHP renderers
│       ├── class-scroll-to-top.php
│       ├── class-carousel.php           # Structural (owns its lifecycle; no trigger UI)
│       ├── class-toggle-visibility.php
│       ├── class-modal-toggle.php
│       ├── class-smooth-scroll.php
│       ├── class-copy-to-clipboard.php  # Click-only triggers (clipboard needs user activation)
│       ├── class-query-action.php       # ONE renderer for all four query-* action ids (shared namespace block-actions/query)
│       └── class-theme-action.php       # Generic renderer for theme actions
├── assets/
│   └── actions/                   # Per-action minimal functional CSS (enqueued on demand)
│       ├── carousel.css           # Carousel layout mechanics (theme owns appearance)
│       ├── query.css              # Region loading state + infinite-scroll pagination hiding
│       └── toggle-visibility.css  # `.is-hidden` utility (+ editor-canvas visibility override)
├── patterns/                      # Block patterns (registered from PHP)
│   ├── modal-with-trigger.php
│   ├── disclosure.php             # Button (toggle-visibility) + hidden Group
│   ├── carousel.php               # Carousel built from core blocks
│   ├── filterable-grid.php        # Category filter buttons + Query Loop (link-style buttons = no-JS capable)
│   ├── live-search-list.php       # Search block wired to a Query Loop
│   └── infinite-scroll-feed.php   # Query Loop with query-infinite-scroll
├── src/
│   ├── block-extensions.js        # Editor-side: attribute registration, HOCs, save filter (progressive data-interactions serialization)
│   ├── action-registry.js         # Built-in actions: ids/labels/fields + blocks hosting, entry/triggers/defaultTrigger/structural vocabulary
│   ├── interactions-panel.js      # "Interactions" ToolsPanel (InteractionItem is 6.3+'s repeatable unit)
│   ├── target-picker.js           # type:'target' fields: candidate dropdown, anchor generation, free text
│   ├── target-shapes.js           # Named shape predicates (dialog, query) + blockActions.targetShapes filter
│   ├── interaction-validation.js  # Advisory validation (panel notice / pre-publish / toolbar indicator)
│   ├── pre-publish.js             # PluginPrePublishPanel listing blocks with issues
│   ├── anchor-uniqueness.js       # Insertion-scoped re-keying: pattern anchors AND duplicate core/query queryIds
│   ├── block-variations.js        # Dialog variation of core/group
│   └── stores/                    # Interactivity API stores
│       ├── carousel/view.js       # Carousel store (directives for slides, imperative for touch/lazy)
│       ├── scroll-to-top/view.js
│       ├── toggle-visibility/view.js
│       ├── modal-toggle/view.js
│       ├── smooth-scroll/view.js
│       ├── copy-to-clipboard/view.js  # Generator function wrapped in withSyncEvent
│       ├── query/view.js          # ALL four query actions: URL-driven router-region engine
│       ├── interactions/view.js   # Trigger dispatcher: conditions + synthetic ba-fire event (runtime binds scope)
│       └── utils/                 # Shared utilities for stores
│           └── create-feedback-store.js # Shared feedback pattern helpers + getter
├── build/                         # Compiled output (gitignored, generated by `npm run build`)
├── composer.json                  # PHP dev deps (PHPUnit, WPCS) — dev-only, not shipped
├── phpunit.xml.dist               # PHPUnit config (suite = tests/php/)
├── phpcs.xml.dist                 # PHPCS config (WordPress + PHPCompatibilityWP)
├── tests/
│   ├── setup.js                   # Jest setup: WP global mocks, fake timers, fetch mock
│   ├── block-extensions.test.js   # Tests for editor-side filters, HOCs, registration
│   ├── stores/                    # Interactivity API store tests (Jest)
│   │   ├── scroll-to-top.test.js
│   │   ├── carousel.test.js
│   │   ├── toggle-visibility.test.js
│   │   ├── modal-toggle.test.js
│   │   ├── smooth-scroll.test.js
│   │   ├── copy-to-clipboard.test.js
│   │   └── utils/
│   │       └── create-feedback-store.test.js
│   ├── anchor-uniqueness.test.js  # Pure collision-resolver tests
│   ├── php/                       # PHPUnit integration tests (WP_UnitTestCase)
│   │   ├── bootstrap.php          # Loads WP test suite + plugin
│   │   ├── test-smoke.php
│   │   ├── test-directive-transformer.php
│   │   ├── test-renderers.php
│   │   ├── test-theme-action.php
│   │   ├── test-action-directories.php
│   │   ├── test-action-styles.php
│   │   ├── test-manifests.php
│   │   ├── test-query-action.php  # Query renderer, bq-* mapping, no-JS hrefs, cache invariants
│   │   ├── test-interactions.php  # Tuple parsing, trigger injection, kses survival, keyboard operability
│   │   └── test-modal-dialog.php
│   └── __mocks__/
│       ├── styleMock.js           # CSS mock for Jest
│       ├── interactivity.js       # @wordpress/interactivity mock (store REGISTRY + __setContext/__setElement)
│       ├── interactivity-router.js # navigate/prefetch spies
│       ├── wp-plugins.js          # registerPlugin stub (build-time external)
│       └── wp-editor.js           # PluginPrePublishPanel stub (build-time external)
├── scripts/
│   └── create-action.js           # CLI wizard: generate new action boilerplate
├── docs/                          # Guides, API reference, examples
│   ├── THEME-ACTIONS.md
│   ├── EXAMPLES.md
│   ├── carousel-action.md
│   ├── query-loop-actions.md      # User guide for the four query actions
│   ├── specs/                     # Design specs (query-loop-actions, interactions-panel, trigger-behavior-model)
│   └── examples/                  # Copy-paste action templates
└── README.md
```

## Build & Development Commands

```bash
npm ci                  # Install dependencies (use this in CI, not npm install)
npm run build           # Production build → build/ (webpack, 9 entries; cleans build/ first)
npm run start           # Development watch mode with hot reload
npm test                # Run Jest (JS) tests once (221 tests across 12 suites)
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Jest with coverage report
npm run test:php        # PHPUnit (PHP) in the wp-env tests-cli container (needs composer install + wp-env)
npm run lint:php        # PHPCS (WPCS ruleset)
composer install        # Install PHP dev deps (PHPUnit, WPCS) into vendor/ (gitignored)
npm run create-action   # Interactive CLI to scaffold a new Interactivity API action
npm run zip             # Create dist/block-actions.zip for distribution

npm run env:start       # Boot @wordpress/env (Docker) with plugin mounted
npm run env:stop        # Stop containers
npm run env:restart     # Re-apply .wp-env.json (start --update)
npm run env:destroy     # Delete containers + volumes
npm run env:clean       # Reset DB only
npm run env:logs        # Tail container logs
npm run env:cli -- <args>  # wp-cli inside container (e.g. `npm run env:cli -- user list`)
```

Build uses a custom `webpack.config.js` extending `@wordpress/scripts`. Nine entry points: `block-extensions` (classic editor script) plus one ES-module entry per store — the six classic actions, `actions/query/view` (all four query actions share it), and `actions/interactions/view` (the trigger dispatcher).

Note: The `webpack.config.js` destructures away the default `entry` function from `@wordpress/scripts` config to avoid conflicts. Build scripts use `webpack --config webpack.config.js` directly instead of `wp-scripts build`.

**CRITICAL — `browserslist` in package.json must stay** (`extends @wordpress/browserslist-config`). Without it, bare `@babel/preset-env` transpiles generators to regenerator wrappers, and the WP 7.0 Interactivity runtime detects generator actions via `constructor.name === 'GeneratorFunction'` — every `withSyncEvent(function*)` action then silently does nothing in the browser while all unit tests stay green.

## Local Dev Environment (@wordpress/env)

`.wp-env.json` boots a WordPress sandbox in Docker with this plugin mounted at `/wp-content/plugins/block-actions`.

- **Requirements:** Docker Desktop running, global `wp-env` CLI (`npm i -g @wordpress/env`). It is *not* a devDependency — the `@wordpress/scripts ^31.6.0` peer range pins `@wordpress/env ^10`, and we use `^11` features; adding it locally breaks `npm install`. Scripts resolve the global binary via PATH.
- **URL:** `http://localhost:8888` · **Admin:** `admin` / `password`
- **Stack:** latest WP core (`"core": null`), PHP 8.2, `WP_DEBUG`/`SCRIPT_DEBUG` on, `WP_ENVIRONMENT_TYPE=local`.
- **Tests environment:** enabled (the wp-env `tests` WordPress + `tests-cli` container, on `testsPort`). PHPUnit integration tests run there via `npm run test:php`. Requires `composer install` first so `vendor/` (mounted into the container) has PHPUnit.
- **Dev loop:** `npm run env:start` once, `npm run start` (webpack watch) in another terminal, edit → refresh. PHP reflects instantly; JS waits on webpack.
- **Local overrides:** create `.wp-env.override.json` (gitignored) to change port/PHP/etc without touching the committed config.

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes and PRs to `main`, in four jobs:
1. **js** — `npm ci` → `lint-js` (src/tests/scripts/docs) → `npm run build` → `npm test -- --ci` (Node 20, npm cache).
2. **phpcs** — `setup-php` 8.2 → `composer install` → `composer lint` (PHPCS against the WPCS ruleset).
3. **php-tests** — `composer install` → `wp-env start` → PHPUnit in the `tests-cli` container.
4. **plugin-check** — non-blocking (`continue-on-error`); runs WordPress Plugin Check, excluding dev dirs. Informational signal for the eventual wp.org submission.

## Linting

**JavaScript** — ESLint config in `.eslintrc.js`, extending `plugin:@wordpress/eslint-plugin/recommended`. It adds:
- `no-console: 'off'` (logging is intentional throughout)
- Jest environment override for `tests/**/*.js`
- `@jest-environment` JSDoc tag allowed in test files

```bash
npx wp-scripts lint-js src tests scripts docs   # or: npm run lint
```

**PHP** — PHPCS config in `phpcs.xml.dist` (WordPress + PHPCompatibilityWP, text domain + prefixes set). Requires `composer install` first.
```bash
npm run lint:php        # phpcs in the wp-env cli container
npm run lint:php:fix    # phpcbf autofix
# or on the host after composer install:
vendor/bin/phpcs   /   vendor/bin/phpcbf
```

JS indentation is spaces (not tabs); PHP follows WP standards (tabs).

## Testing

Two suites: JS unit tests (Jest, no WordPress) and PHP integration tests (PHPUnit + the real WordPress test suite via wp-env).

### JavaScript (Jest)

- **Framework:** Jest 29 with jsdom environment
- **Setup:** `tests/setup.js` — mocks `wp.i18n`, `window.blockActions`, fake timers, fetch
- **Test patterns:** `tests/**/*.test.js` and `tests/**/test-*.js`
- **Interactivity mock:** `tests/__mocks__/interactivity.js` — `store`, `getContext`, `getElement` with `__setContext()`, `__setElement()`, `__reset()` helpers
- **Stats:** 221 tests across 12 suites. Run: `npm test`.

### PHP (PHPUnit, integration)

- **Location:** `tests/php/` — files named `test-*.php`, classes extend `WP_UnitTestCase`.
- **Bootstrap:** `tests/php/bootstrap.php` loads the WP test suite from `getenv('WP_TESTS_DIR')` (wp-env sets it to `/wordpress-phpunit` in `tests-cli`), then loads the plugin on `muplugins_loaded`.
- **Config:** `phpunit.xml.dist` (suite = `tests/php/`, `prefix="test-"` so `bootstrap.php` is excluded).
- **Run:** `npm run test:php` (needs `composer install` once + a running wp-env). Real `WP_HTML_Tag_Processor` output is asserted, so these are integration tests, not mocked units.
- **Coverage:** transformer (fast path, directive injection, context escaping, renderer error isolation), every renderer's context/directives/`post_process_html`, `Theme_Action` context forwarding (the scalar/key-validation security boundary), `force_dialog_for_modal_groups`, and pattern registration.
- **Stats:** 106 tests, 251 assertions.
- **Note:** `discover_theme_actions()` caches in a `static`, so glob/ID-normalization isn't unit-tested here (proven via wp-env smoke tests instead); the cache-free `Theme_Action` forwarding is covered.

Run both before submitting:
```bash
npm test && npm run test:php
```

### Test architecture notes

- **`block-extensions.js`**: Requires mocking all `@wordpress/*` packages and `lodash`. HOC tests call the filter functions extracted from `addFilter` mock calls and inspect `wp.element.createElement` output.

#### Interactivity API store tests
- **Mock setup**: `tests/__mocks__/interactivity.js` provides controllable `getContext()` and `getElement()`. Use `__setContext(ctx)` and `__setElement({ ref })` before each test.
- **Store capture**: Tests use `beforeAll` with `require()` to load the store module once, then extract the `storeDefinition` from `store.mock.calls`. Avoid `jest.isolateModules` — it creates a separate mock registry and breaks `store.mock.calls` capture.
- **Carousel tests**: `jest.useFakeTimers()` in `beforeEach` overrides the `requestAnimationFrame` mock; re-mock RAF in `beforeEach` after `jest.useFakeTimers()`.
- **Utility tests**: `create-feedback-store.test.js` is a straightforward unit test.

## Architecture

### Frontend System

1. **Editor side** (`block-extensions.js`): Uses WordPress `hooks` to add `data-action` and `data-*` attributes to supported blocks via inspector panel controls. Action list comes from `action-registry.js` (static list) plus theme actions registered via `window.BlockActions.registerAction()`.
2. **PHP renderers** (`includes/renderers/*.php`): Each action has a renderer that declares initial context and directives. Extends `Action_Renderer` abstract class.
3. **Directive Transformer** (`includes/class-directive-transformer.php`): Hooked to `render_block` filter. Uses `WP_HTML_Tag_Processor` to find `data-action` on root elements (falling back to the `customAction` block attribute for dynamic blocks like core/search, mirroring it into the markup) and inject `data-wp-interactive`, `data-wp-context`, and action-specific directives. Since the trigger model, the TRANSFORMER also owns trigger wiring for behavioral actions (renderers declare `get_entry_action()`; default click compiles byte-identical to the old renderer-injected handler) and runs a keyboard-operability pass (href-less `<a>` controls get tabindex/role/Enter-Space activation).
4. **JS stores** (`src/stores/*/view.js`): Each action is an Interactivity API `store()` with `state`, `actions`, and `callbacks`. Loaded as script modules via `wp_enqueue_script_module()`.
5. **Theme actions**: Theme devs drop ES module `.js` files in their theme's `/actions` directory using `@wordpress/interactivity`. PHP auto-discovers and enqueues them. `window.BlockActions.registerAction()` is available in the editor to populate the action dropdown.

### How the Pipeline Works

```
Block saved with data-action="carousel"
        ↓
PHP render_block filter fires
        ↓
Directive_Transformer finds data-action, looks up Carousel renderer
        ↓
Carousel renderer injects:
  - data-wp-interactive="block-actions/carousel"
  - data-wp-context='{"currentIndex":0,...}'
  - data-wp-init="callbacks.init"
  - data-wp-on--keydown="actions.handleKeydown"
  - Child directives via post_process_html() (buttons, slides, thumbnails)
        ↓
Carousel view script module enqueued via wp_enqueue_script_module()
        ↓
Browser: Interactivity API processes directives, store hydrates
```

### Query Loop actions (one URL-driven engine)

`query-paginate` / `query-infinite-scroll` host on `core/query`; `query-filter` (Button) and `query-live-search` (Search/Group) target a query by anchor. Every state is a real GET URL: `bq-{queryId}-tax-{tax}` / `bq-{queryId}-s` params map to query vars via `query_loop_block_query_vars` (opt-in registry recorded at `render_block_data` — that filter receives the INNER post-template block, context only). The renderer injects a router region (`block-actions-query-{queryId}` — the id doubles as the client-side anchor→queryId channel) and force-disables core's enhancedPagination on opted-in queries. No REST, no nonces (page-cache requirement). Filter links get server-computed no-JS toggle hrefs (link-style buttons only). Infinite scroll fetch-and-appends and REQUIRES a Query Pagination block (hidden once JS activates; it's the no-JS fallback and the next-URL source).

### Trigger × behavior model

Behavioral actions (all but carousel and the query actions) support triggers click / hover(+focus) / scroll-into-view / load / timer and viewport/reduced-motion conditions. Progressive serialization: the default click case keeps classic `data-action` + `data-*` markup forever; a non-default trigger or conditions ADD one validated `data-interactions` JSON tuple (kses entity-encodes it; `get_attribute()` decodes byte-identical — verified). Editor state lives in ONE registered attribute (`interactionSettings`), cleared on action change. Engine dispatch is scope-correct by construction: the transformer arms `data-wp-on--ba-fire="{entry}"` against the action's own store and the dispatcher (`block-actions/interactions`) fires a synthetic cancelable `ba-fire` event when conditions pass — the RUNTIME evaluates the entry in the element's real namespace (never call `store(ns).actions.x()` programmatically; wrong scope). One interaction per block in v1; multi-interaction awaits the context-multiplexing spike.

### Interactions panel (editor)

The "Interactions" ToolsPanel replaces the old Advanced-section control. `type:'target'` fields render the TargetPicker (candidate dropdown constrained by `targets: { blocks, shape }` named predicates — `dialog`, `query`, extensible via the `blockActions.targetShapes` filter; picking an anchor-less block generates a collision-safe anchor via the shared `uniqueAnchor()`). Validation is advisory-never-blocking (unresolved targets may live in template parts) and surfaces in the panel notice, a pre-publish check, and a block-toolbar indicator (List View has no supported decoration API). All panel components are hook-free so the direct-call test harness works.

### Key Extension Points

- **`window.BlockActions.registerAction(id, label, fieldsOrInit, init, extras)`** — Register actions from theme JS (populates the editor action dropdown; `extras` carries entry/triggers/defaultTrigger/structural)
- **`blockActions.supportedBlocks` filter (JS)** — Opt additional block types into the action UI
- **`block_actions_directories` filter (PHP)** — Add custom action directories (string paths under theme/wp-content auto-map to URLs; `{ path, url }` pairs for anywhere else)
- **Theme-action manifests** — a `{action}.json` sidecar declares editor `label`, inspector `fields` (incl. `type:'target'` + `targets`), extra `data-wp-*` `directives`, and the trigger vocabulary (`entry`/`triggers`/`structural`) — all validated server-side; no editor script needed. A `{action}.css` sidecar ships functional CSS.
- **`blockActions.targetShapes` filter (JS)** — Register named target-shape predicates for `type:'target'` fields
- **`Action_Renderer` abstract class (PHP)** — Extend for custom action renderers; optional `assets/actions/{id}.css` ships minimal functional CSS, enqueued on demand

### Modal Toggle — target markup contract

The `modal-toggle` action operates on a native `<dialog>` element. Authors must use:

```html
<dialog id="my-modal">
  <div class="modal-content">
    <h2>Title</h2>
    <p>Body.</p>
    <button class="modal-close">Close</button>
  </div>
</dialog>
```

`<div hidden>` targets are rejected (store warns in the console). The browser provides focus trap / ESC / focus restore via `showModal()`; the store layers body scroll lock, backdrop-click close, and `.modal-close` / `[data-modal-close]` helpers.

### Adding a New Built-in Action

1. Create `src/stores/your-action/view.js` with an Interactivity API `store()` call
2. Create `includes/renderers/class-your-action.php` extending `Action_Renderer`
3. Register the renderer in `block-actions.php` → `init_interactivity_api()`
4. Add the webpack entry in `webpack.config.js`
5. Add test files in `tests/stores/`
6. Run `npm run build`

Or use the scaffolding tool: `npm run create-action`

## Interactivity API Conventions

All built-in stores follow the same declarative contract:

- **Accessibility and structural attributes belong in PHP.** Renderers inject `role`, `aria-*`, `tabindex`, and directive attributes on child elements via `post_process_html()`. Nothing in a JS `init` callback should `setAttribute('aria-…')` — it'll be wrong on first paint.
- **Reactive view = state getter + `data-wp-*`.** Button text, inline styles, and classes are bound via `data-wp-text="state.…"`, `data-wp-style--…="state.…"`, `data-wp-class--…="state.…"`. Actions flip context flags; getters derive the rendered value. No `target.textContent =` from JS.
- **Event handlers with `preventDefault` must be wrapped in `withSyncEvent`.** Required as of WP 6.8.
- **External callbacks (`setTimeout`, event listeners) that call `getContext` / `getElement` must be wrapped in `withScope`.** The carousel touch handler is the canonical example.
- **Async actions use generator functions, never `async`/`await`.** `copy-to-clipboard` is the example.
- **Shared state across instances goes in `state`, not a module-level `let`.** Modal open-count is in `state.openCount`.
- **Rate limiting is for network I/O, not UI clicks.** No limiter ships in the plugin; a copy-paste pattern lives in `docs/examples/rate-limited-action.js`. UI click guards use context flags (see carousel's `isAnimating`).
- **`data-wp-on-async` is deprecated in WP 7.0** — plain `data-wp-on` is async by default; `withSyncEvent` marks the sync handlers. Never inject the `-async` variant.
- **NO reactive bindings on regions whose DOM is mutated imperatively.** A signal-driven binding makes the hydrated Preact island re-render and reconcile against its original vdom — wiping imperative classes and duplicating appended nodes (infinite scroll learned this the hard way). Such regions apply feedback imperatively.
- **Never invoke another store's action programmatically** (`store(ns).actions.x()`) — it runs in the CALLER's scope, so `getContext()` inside resolves the wrong namespace. Dispatch a DOM event that a directive on the element handles instead (the interactions engine's `ba-fire` pattern).
- **Config for dynamic blocks comes from `actionData` block attributes.** Blocks with no saved wrapper (core/search) never carry the editor's `data-*` field attributes in rendered markup — renderers read the markup attribute first and fall back to `$block['attrs']['actionData']`.

## Code Conventions

### JavaScript
- ES6+ (arrow functions, const/let, template literals, modules)
- No jQuery — vanilla JS only
- JSDoc on all exported functions with `@since` tags
- camelCase for functions/variables, UPPER_SNAKE_CASE for constants, kebab-case for filenames
- JSX uses WordPress pragmas (`wp.element.createElement`), not React
- Spaces for indentation in JS (not tabs, despite WordPress standards)
- Interactivity API stores use `store()` from `@wordpress/interactivity`
- Generator functions (`function*`) for async Interactivity API actions (e.g., copy-to-clipboard)

### PHP
- Namespaced under `Block_Actions` (renderers under `Block_Actions\Renderers`)
- WordPress coding standards: tabs for indentation, snake_case functions
- All output escaped (`esc_html`, `esc_url_raw`, etc.)
- All input sanitized via `sanitize_callback`
- Comprehensive docblocks with `@since`, `@param`, `@return` tags
- Uses `WP_HTML_Tag_Processor` for safe HTML manipulation (not regex)

### Error Handling
- Try/catch in all WordPress filter callbacks; return unmodified state on error
- Centralized logging via `log(type, message, error)` utility in stores
- Graceful degradation over hard failures
- `data-wp-init` callbacks return cleanup functions to disconnect observers and cancel animation frames (per Interactivity API best practices)

### Security
- Server-side HTML manipulation only via `WP_HTML_Tag_Processor`; attribute values safely encoded
- Theme action context forwarding: scalar values only, validated keys, `sanitize_text_field` on strings
- `data-action` values from content only honored when a registered renderer exists
- Action `data-*` attributes (`data-action`, `data-modal`, `data-custom`, etc.) survive `wp_kses_post()`, so low-capability authors (Contributor/Author, no `unfiltered_html`) can save blocks carrying actions — verified on WP 7.0. No `wp_kses_allowed_html` filter needed.
- No security-header / CSP feature and no settings page — removed in 3.0.0 (headers belong at the host/security-plugin layer; the plugin is zero-config). `uninstall.php` still deletes the legacy `block_actions_settings` option for upgraders.

## Important Notes

- **Supported blocks:** `core/button`, `core/group`, `core/query`, and `core/search` by default; extend via the `blockActions.supportedBlocks` JS filter. Actions may declare `blocks` hosting constraints so they only appear in the right dropdowns (`getSupportedBlocks()` in `block-extensions.js` resolves it at call time, routing attribute registration + inspector + save through one source of truth)
- **Build output is gitignored:** The `build/` and `dist/` directories are not committed; run `npm run build` after cloning
- **Theme actions don't require rebuild:** They're ES module JS files auto-discovered by PHP
- **Action IDs come from filenames:** `my-action.js` → action ID `my-action` (normalized via `sanitize_key()`, so use lowercase kebab-case)
- Files prefixed with `_` or `.` in theme action directories are skipped
- **Script modules:** Interactivity API stores (built-in and theme) are enqueued via `wp_enqueue_script_module()` with `@wordpress/interactivity` as a dependency. The webpack config uses `@wordpress/scripts`' dual-config mode (`WP_EXPERIMENTAL_MODULES=true`) — `block-extensions.js` stays a classic script; every `actions/*/view.js` is an ES module.
