# Implementation Plan: Interactivity API Audit Fixes

Source: code quality audit against WordPress Interactivity API best practices (WP 6.8+).
Goal: make the plugin genuinely idiomatic — declarative directives, correct event wrappers, proper use of core helpers — so it lives up to the promise of "easy front-end interactivity for blocks."

Legend: 🔴 correctness bug · 🟠 fights the API · 🟡 medium · 🟢 polish

---

## Phase 1 — Correctness (blocking, ship first)

- [x] **Task 1.1: Wrap all `preventDefault` / `stopPropagation` actions in `withSyncEvent`** 🔴
  - Why: WP 6.8 deprecated unwrapped sync event access. Emits console warning in 6.8, will break in a later version. Applies regardless of `data-wp-on--` vs `data-wp-on-async--` variant. Zero current usages in the codebase.
  - Files:
    - `src/stores/toggle-visibility/view.js`
    - `src/stores/modal-toggle/view.js`
    - `src/stores/copy-to-clipboard/view.js` (generator — wrap around the `function*`)
    - `src/stores/example-rate-limited/view.js`
    - `src/stores/utils/create-feedback-store.js` (`createFeedbackAction` → bleeds into scroll-to-top, smooth-scroll, test-action)
    - `src/stores/carousel/view.js` (`nextSlide`, `prevSlide`, `goToSlide`, `handleKeydown`)
  - Depends on: none
  - Tests: update existing store tests to assert wrapped handler shape; verify `event.preventDefault()` still calls through.
  - Parallelizable: yes (per file)

- [x] **Task 1.2: Wrap carousel touch/observer callbacks in `withScope`** 🔴
  - Why: `handleTouchStart`/`handleTouchEnd` and IntersectionObserver fire outside the Interactivity scope; calls to `getContext()`/`getElement()` inside `store(...).actions.*` can resolve the wrong context.
  - Files: `src/stores/carousel/view.js` (lines ~241-289)
  - Depends on: 1.1 (avoid conflict on same file)
  - Tests: existing carousel tests — verify touch swipe still triggers slide change.
  - Parallelizable: no (same file as 1.1)

- [x] **Task 1.3: Remove or localize `window.blockActions.nonce` / `.debug`** 🔴
  - Why: `src/stores/utils/api.js` and `src/block-extensions.js` reference `window.blockActions.*` that no PHP ever sets. Debug logs silently never fire; any REST call would 403.
  - Option A (recommended): delete `src/stores/utils/api.js` entirely — nothing uses it. Delete `window.blockActions.debug` gates and just use `console.log` or remove the logs.
  - Option B: add `wp_localize_script('block-actions-editor', 'blockActions', ['nonce' => wp_create_nonce('wp_rest'), 'debug' => WP_DEBUG])` in `block-actions.php` and a matching frontend enqueue (note: it won't reach script modules — use `wp_interactivity_config()` for stores).
  - Files:
    - Delete `src/stores/utils/api.js` (+ tests) OR update `block-actions.php`
    - `src/block-extensions.js` (strip debug gates if going with A)
  - Depends on: none
  - Tests: delete `tests/stores/utils/api.test.js` if deleting api.js.
  - Parallelizable: yes

---

## Phase 2 — Use the Interactivity API declaratively

- [x] **Task 2.1: Rewrite `toggle-visibility` as declarative directives** 🟠
  - Why: currently uses `classList.toggle`, `textContent =`, manual `setAttribute('aria-expanded')` — defeats reactivity.
  - Approach:
    - Renderer adds `data-wp-bind--aria-expanded="context.isVisible"`, `data-wp-bind--aria-controls="context.targetId"`, `data-wp-text="state.buttonLabel"` to the button.
    - Store exposes `state.buttonLabel` getter that reads `ctx.isVisible`/`showLabel`/`hideLabel`.
    - The target element is outside the block — keep the one `classList.toggle` there, or better, register the target as a second interactive region with its own `data-wp-bind--hidden`.
  - Files:
    - `includes/renderers/class-toggle-visibility.php`
    - `src/stores/toggle-visibility/view.js`
    - `tests/stores/toggle-visibility.test.js`
  - Depends on: 1.1
  - Tests: assert directive strings in rendered HTML; assert store getter returns right label for `isVisible` true/false.
  - Parallelizable: yes

- [x] **Task 2.2: Rewrite `copy-to-clipboard` feedback to declarative** 🟠
  - Why: manually writes `target.style.backgroundColor` and `target.textContent`. Replace with `data-wp-style--background-color="state.feedbackColor"` and `data-wp-text="state.buttonText"`.
  - Approach: store exposes `state.feedbackColor` and `state.buttonText` getters keyed on `ctx.status` (`'idle' | 'success' | 'error'`). No more color validation needed (values are hard-coded getters).
  - Files:
    - `includes/renderers/class-copy-to-clipboard.php`
    - `src/stores/copy-to-clipboard/view.js`
    - `tests/stores/copy-to-clipboard.test.js`
  - Depends on: 1.1
  - Parallelizable: yes

- [x] **Task 2.3: Rewrite `scroll-to-top` / `smooth-scroll` feedback to declarative** 🟠
  - Why: `create-feedback-store.js` mutates `target.textContent` directly.
  - Approach: renderer adds `data-wp-text="state.buttonText"`; `ctx.isScrolling` toggles; getter returns `scrollingText` vs `originalText`. `originalText` captured in init via `getElement().ref.textContent`.
  - Files:
    - `includes/renderers/class-scroll-to-top.php`
    - `includes/renderers/class-smooth-scroll.php`
    - `src/stores/scroll-to-top/view.js`
    - `src/stores/smooth-scroll/view.js`
    - `src/stores/utils/create-feedback-store.js` (either delete or re-shape as a pure state helper)
    - `tests/stores/scroll-to-top.test.js`, `tests/stores/smooth-scroll.test.js`, new tests for util
    - `src/stores/test-action/view.js` + `tests/stores/test-action.test.js` — also consumes the util
  - Depends on: 1.1
  - Parallelizable: no (touches shared util)

- [x] **Task 2.4: Move carousel init-time a11y attributes to server render** 🟠
  - Why: `carousel/view.js` init sets `role`, `aria-label`, `tabindex` on ~4 element types imperatively — too late for first paint, invisible to no-JS users.
  - Approach: add them in `class-carousel.php::post_process_html()` via the existing `WP_HTML_Tag_Processor` pass.
  - Files:
    - `includes/renderers/class-carousel.php`
    - `src/stores/carousel/view.js` (remove imperative setAttribute calls; keep observer + touch setup)
    - `tests/stores/carousel.test.js`
  - Depends on: 1.1, 1.2
  - Parallelizable: no

- [x] **Task 2.5: Move `openModalCount` into store state** 🟡
  - Why: module-level `let` is fragile across client navigation and test isolation.
  - Approach: `state.openCount` (a store-level number), derived state getter `state.bodyScrollLocked` returning `'hidden' | ''`, bind via `data-wp-style--overflow` on `<body>`… actually `<body>` isn't in the block. Simpler: keep `openModalCount` but move to store state and use a global `data-wp-interactive` wrapper that manages body class. Or: drop count entirely and compute `document.querySelectorAll('[data-modal-open]').length === 0` before unlock.
  - Files: `src/stores/modal-toggle/view.js`, `tests/stores/modal-toggle.test.js`
  - Depends on: 1.1
  - Parallelizable: no (same file as 1.1)

- [~] **Task 2.6: Consider `wp_interactivity_state()` for shared state** 🟡
  - Why: anywhere multiple instances need to share a value (e.g. `openModalCount` today is a module-level `let`), use server-seeded state via `wp_interactivity_state('block-actions/<action>', [...])`. Lets PHP participate in state and makes SSR correctness possible.
  - NOT applicable: `wp_interactivity_data_wp_context()` — that helper is a template-echo shortcut that returns a pre-formatted `data-wp-context='…'` attribute string. The transformer uses `WP_HTML_Tag_Processor::set_attribute()` which handles attribute escaping itself, so raw `wp_json_encode()` output is the correct input. Leave as-is.
  - Files: any renderer that would benefit from server-seeded state (e.g. `class-modal-toggle.php` for open-count or other shared counters).
  - Depends on: none
  - Parallelizable: yes

---

## Phase 3 — Build & enqueue modernization *(DEFERRED)*

> Deferred 2026-04-17. Current classic-script enqueue works. Moving to
> ESM requires bypassing the wp-scripts CLI and hand-rolling the
> `experiments.outputModule` / `output.module` / DependencyExtractionWebpackPlugin
> `useModules: true` patches that `--experimental-modules` does internally.
> Worth doing, but as a standalone change with its own validation loop,
> not folded into an audit-fix series.

- [-] **Task 3.1: Switch built-in store build output to ES modules** 🟡
  - Why: `@wordpress/scripts ^31.6.0` supports `--experimental-modules`. Stale comment in CLAUDE.md claimed it didn't. Classic-script IIFEs work but miss import-map resolution, better tree-shaking, and parity with theme-action loading.
  - Approach: change `package.json` build to `wp-scripts build --experimental-modules` or update `webpack.config.js` to emit ESM.
  - Files: `package.json`, `webpack.config.js`, potentially `.babelrc`
  - Depends on: none
  - Tests: `npm run build`, diff bundle format.
  - Parallelizable: yes

- [-] **Task 3.2: Switch `Action_Renderer::enqueue_view_script()` to `wp_enqueue_script_module()`** 🟡
  - Why: follows from 3.1. Gets proper `@wordpress/interactivity` dependency via import-map.
  - Files: `includes/class-action-renderer.php`
  - Depends on: 3.1
  - Parallelizable: no

- [-] **Task 3.3: Make theme action module enqueue conditional** 🟡
  - Why: `enqueue_theme_action_modules()` currently enqueues every discovered theme action on every page load regardless of whether a block uses it.
  - Approach: remove the `wp_enqueue_scripts` hook entirely; enqueue inside `Theme_Action::enqueue_view_script()` on the render path (mirrors built-in stores).
  - Files: `block-actions.php`, `includes/renderers/class-theme-action.php`
  - Depends on: 3.2
  - Parallelizable: no

---

## Phase 4 — Data forwarding & security

- [x] **Task 4.1: Stop mangling theme action keys with `sanitize_key`** 🟡
  - Why: `sanitize_key()` lowercases camelCase → `wrapAround` becomes `wraparound`, breaking theme JS.
  - Approach: validate key matches `/^[A-Za-z_][A-Za-z0-9_]*$/`; reject others; leave case intact. Use `wp_interactivity_data_wp_context()` for safe JSON encoding (handles escaping).
  - Files: `includes/renderers/class-theme-action.php`
  - Depends on: none
  - Parallelizable: yes

- [x] **Task 4.2: Replace `wp_kses_post()` on context values with scalar validation** 🟡
  - Why: `wp_kses_post` is HTML-oriented; context values should be scalars. Permitting `<a>`/`<img>` in a data attribute value is a footgun.
  - Approach: accept only `is_scalar`; coerce to string via `sanitize_text_field()` for strings; pass numbers/bools through.
  - Files: `includes/renderers/class-theme-action.php`
  - Depends on: 4.1
  - Parallelizable: no (same file)

- [x] **Task 4.3: Drop or scope rate limiting** 🟡
  - Why: 5/sec cap on every user click is theatre — no XHR to guard. Can swallow legitimate keyboard-repeat carousel navigation.
  - Approach: remove `getRateLimiter` calls from click-only actions. Keep the utility; apply it only if/when an action does network I/O.
  - Files:
    - `src/stores/toggle-visibility/view.js`
    - `src/stores/modal-toggle/view.js`
    - `src/stores/copy-to-clipboard/view.js`
    - `src/stores/example-rate-limited/view.js` (keep this one as a *demo* of the util)
    - `src/stores/utils/create-feedback-store.js`
    - `src/stores/carousel/view.js`
  - Depends on: 1.1, 2.x
  - Parallelizable: no (touches files edited in other tasks)

---

## Phase 5 — Polish

- [x] **Task 5.1: Add `uninstall.php`** 🟢
  - Delete `block_actions_settings` option.
  - Files: `uninstall.php` (new)
  - Parallelizable: yes

- [x] **Task 5.2: Remove `lodash` dependency** 🟢
  - Replace `assign(settings.attributes, {...})` with `{...settings.attributes, ...}`.
  - Files: `src/block-extensions.js`, `package.json`
  - Parallelizable: yes

- [x] **Task 5.3: Remove dead telemetry object** 🟢
  - `telemetry` in `block-extensions.js` is never read. Delete.
  - Files: `src/block-extensions.js`
  - Parallelizable: no (likely conflicts with 5.2)

- [x] **Task 5.4: Replace `() => {}` empty cleanups with bare `return`** 🟢
  - Files: `src/stores/toggle-visibility/view.js`, `src/stores/modal-toggle/view.js`
  - Parallelizable: no (conflicts with phase 2 edits)

- [x] **Task 5.5: Fix `get_attribute()` `true` coercion** 🟢
  - Cast attribute reads through `is_string($val) ? $val : ''`.
  - Files: `includes/renderers/class-toggle-visibility.php`, `class-smooth-scroll.php`, `class-modal-toggle.php`, `class-copy-to-clipboard.php`
  - Parallelizable: yes

- [x] **Task 5.6: Add `BLOCK_ACTIONS_VERSION` + `BLOCK_ACTIONS_DIR` constants** 🟢
  - Clean up `plugin_dir_path(dirname(__FILE__))` boilerplate in renderers.
  - Files: `block-actions.php`, `includes/class-action-renderer.php`
  - Parallelizable: yes

- [x] **Task 5.7: Update CLAUDE.md + memory** 🟢
  - Remove stale claim about `@wordpress/scripts v26` not supporting modules; document new declarative patterns; update test counts.
  - Files: `CLAUDE.md`, memory files under `~/.claude/projects/.../memory/`
  - Depends on: everything else — do last
  - Parallelizable: no

---

---

## Validation log (2026-04-17)

Cross-checked against `~/.claude/skills/wordpress-interactivity/references/`:

- **Task 1.1** confirmed by `version-history.md` §6.8 Breaking Changes: "Sync event access without withSyncEvent() deprecated".
- **Task 1.2** confirmed by `store-api.md` `withScope()` section — carousel autoplay example matches our use case.
- **Task 2.6 reversed** — `wp_interactivity_data_wp_context()` is a template-echo helper, not a replacement for `wp_json_encode()` in tag-processor flows. Original plan entry was wrong; see corrected task above.
- **Task 3.1** confirmed — `@wordpress/scripts ^31.6.0` supports `--experimental-modules` (added v29). CLAUDE.md memory note about v26.19 is stale.
- **Task 4.1 / 4.2** confirmed — `sanitize_key()` lowercases and strips per WP core; `wp_kses_post()` allows `<a>`, `<img>`, etc.
- **Tasks 1.3** confirmed — grep across plugin shows zero PHP sets `window.blockActions.nonce` or `.debug`; both are dead references.

## Execution notes

- **Batching**: Phase 1 is three independent tracks → do in parallel. Phase 2 shares files with Phase 1, so serialize per-file. Phase 3 is sequential. Phases 4 & 5 parallelize well.
- **Test gate**: `npm test` must pass after each phase. The existing 158-test suite covers most store behavior.
- **Verification**: after Phase 2, manually test each action in WP to confirm directive hydration — unit tests won't catch a missing `data-wp-bind` in output.
- **Not in scope**: adding new actions, REST integration, i18n tooling (POT generation), TypeScript migration. Keep the audit fixes focused.
