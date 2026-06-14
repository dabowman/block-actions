# Implementation Plan: Review Fixes & Strategic Roadmap

Spec: No formal spec — sourced from the 2026-06-12 full-plugin code review and strategy
discussion. Phase 6 epics each require their own spec in `docs/specs/` before
implementation; everything in Phases 1–5 is implementable directly from this plan.

Goal context: position Block Actions as the missing interaction layer between the block
editor and the modern browser — making WordPress the default choice for modern developers
building interactive sites that non-technical users (marketers, content creators) can
safely operate.

## Decisions (resolved 2026-06-12)

- **Q1 — Distribution: GitHub now, wp.org later.** Build to wp.org standards; Plugin Check
  runs in CI as a non-blocking warning so later submission is a flip, not a project.
- **Q2 — Minimum WordPress: 7.0.** Unlocks Interactivity `watch()`, client-side Abilities,
  unique directive IDs, and router asset auto-loading. `Requires at least: 7.0`,
  `Tested up to: 7.0`.
- **Q3 — `data-custom`: keep as-is.** No removal/scoping work; feature stays on all blocks.
- **Q4 — Security headers / CSP: remove entirely.** Headers belong at the host/security-
  plugin layer. The settings page (whose only setting is CSP) goes with it — the plugin
  becomes zero-config. `uninstall.php` keeps deleting `block_actions_settings` so
  upgraders' stale options are cleaned.
- **Q5 — Next version: 3.0.0.** Min-WP bump to 7.0 + headers feature removal are breaking.
- **Q6 — Demo stores: delete both**; preserve the rate-limiting pattern as a copy-paste
  file in `docs/examples/`. Build drops to 7 entries.
- **Q7 — Phase 6 order: Query Loop actions first**, then Interactions panel, then
  manifests/platform.
- **Q8 — Forms: out of scope.** Revisit only if a clear gap remains after Phase 6.

---

## Phase 1 — Correctness & Trust Fixes

- [x] **Task 1.1: Unify version + requirements** — Set 3.0.0 everywhere; bump
  `Requires at least` to 7.0; set `Tested up to: 7.0` after a wp-env pass against current
  core. Add a runtime guard (admin notice + bail) for pre-7.0 WordPress.
  - Files: `block-actions.php` (header + `VERSION`), `package.json`, `readme.txt`,
    `README.md`, `CLAUDE.md`
  - Depends on: none (decisions resolved)
  - Tests: grep for version strings agrees everywhere; plugin activates on WP 7.0
  - Parallelizable: yes

- [x] **Task 1.2: Fix carousel `wrapAround` plumbing** — `Carousel::get_initial_context()`
  reads `data-wrap-around` from the processor (parse `'false'`/`'true'` strings) instead
  of hardcoding `true`.
  - Files: `includes/renderers/class-carousel.php`
  - Depends on: none (PHP test coverage arrives in 4.2)
  - Tests: context JSON reflects the attribute; frontend smoke test — toggle off, last
    slide's Next does nothing
  - Parallelizable: yes

- [x] **Task 1.3: Bind carousel disabled states** — Renderer binds
  `data-wp-bind--disabled` (real `<button>`) or `data-wp-class--disabled` +
  `data-wp-bind--aria-disabled` (non-button) on prev/next using the existing
  `state.isPrevDisabled`/`isNextDisabled` getters.
  - Files: `includes/renderers/class-carousel.php`, `docs/carousel-action.md`
  - Depends on: 1.2 (same file)
  - Tests: non-wrap carousel at index 0 → prev disabled; at last → next disabled
  - Parallelizable: no (after 1.2)

- [x] **Task 1.4: Fix modal scroll-lock bookkeeping for multiple triggers** — Key
  open-count bookkeeping on the dialog element (e.g. module-level `WeakSet` of open
  dialogs, or single close-listener per dialog) so N triggers targeting one dialog don't
  decrement `state.openCount` N times per close.
  - Files: `src/stores/modal-toggle/view.js`, `tests/stores/modal-toggle.test.js`
  - Depends on: none
  - Tests: two triggers → one dialog; open + close; `openCount` and body overflow correct
  - Parallelizable: yes

- [x] **Task 1.5: Normalize theme-action IDs once** — Derive the canonical ID in
  `discover_theme_actions()` (single sanitization) and use it for editor registration,
  renderer registration, and module handles; warn (debug log) when a filename normalizes
  away from its raw name.
  - Files: `block-actions.php`
  - Depends on: none
  - Tests: `MyAction.js` produces one consistent ID end-to-end (PHP test in 4.2)
  - Parallelizable: yes

- [x] **Task 1.6: Rewrite `create-action` scaffolding** — Templates must match the current
  API: renderer extends `Action_Renderer` with `get_initial_context( $processor, $block )`
  + `apply_directives( $processor, $block )`, ABSPATH guard; JS template uses
  `withSyncEvent`, no rate limiter, declarative-pattern comments. Stretch: auto-insert the
  webpack entry, registry entry, and renderer registration instead of printing manual steps.
  - Files: `scripts/create-action.js`
  - Depends on: none
  - Tests: run the wizard, build, register output — no fatals; generated action works in wp-env
  - Parallelizable: yes

- [x] **Task 1.7: Fix distribution zip** — Include `patterns/`, `uninstall.php`,
  `readme.txt` (and exclude docs/plans). Lay the zip out to wp.org conventions now (per
  Q1) — consider `wp-scripts plugin-zip` + a files allowlist.
  - Files: `package.json`
  - Depends on: none
  - Tests: unzip → activate in wp-env → pattern appears, uninstall cleans option
  - Parallelizable: yes

- [x] **Task 1.8: Remove dead code** — Delete `src/stores/utils/sanitize.js` (+ its tests,
  + `dompurify` dep), `@wordpress/api-fetch` dep, `getAllActions()` wrapper, the no-op
  `getFilteredOptions`/`onFilterValueChange` in `block-extensions.js`; remove
  `test-action` + `example-rate-limited` webpack entries and stores (decision Q6);
  preserve the rate-limiting pattern as a copy-paste example in `docs/examples/`.
  - Files: `webpack.config.js`, `package.json`, `src/block-extensions.js`,
    `src/stores/test-action/`, `src/stores/example-rate-limited/`,
    `src/stores/utils/sanitize.js`, `src/stores/utils/rate-limiter.js`, matching tests
  - Depends on: none
  - Tests: build succeeds; suite passes; bundle count drops to 7 entries
  - Parallelizable: yes

## Phase 2 — Documentation Truth Sweep

- [x] **Task 2.1: `withSyncEvent` sweep across all docs/examples** — Every
  `preventDefault()` example wrapped in `withSyncEvent`; `setTimeout`-touching-context
  examples use `withScope`; boilerplate aligned with the plugin's declarative conventions.
  - Files: `docs/examples/*.js` (6 files), `docs/THEME-ACTIONS.md`, `docs/EXAMPLES.md`,
    `README.md`
  - Depends on: none
  - Tests: grep — no bare `preventDefault` outside `withSyncEvent` in docs; copy one
    example into wp-env theme `/actions` and verify it runs without console warnings
  - Parallelizable: yes

- [x] **Task 2.2: Fix carousel doc drift** — CSS template `transition: transform` (not
  `left`); delete the claim that the script applies `container: carousel / inline-size`
  (author CSS responsibility — keep the CSS sample that does it); document the disabled
  bindings from 1.3; remove stale `position:relative; left:0` remnants.
  - Files: `docs/carousel-action.md`
  - Depends on: 1.3
  - Tests: build a carousel from the doc's copy-paste CSS in wp-env — slides animate
  - Parallelizable: no (after 1.3)

- [x] **Task 2.3: Correct capability claims + document tradeoffs** — Remove
  nonce-verification / rate-limiting / DOMPurify / CSP claims from README + readme.txt;
  describe the real security posture (Tag Processor injection, scalar context
  sanitization); add a documented note that deactivating the plugin invalidates blocks
  carrying action attributes (extraProps tradeoff) and how to recover.
  - Files: `README.md`, `readme.txt`
  - Depends on: 1.8, 3.3
  - Tests: claims match code (manual review)
  - Parallelizable: yes

## Phase 3 — Security & Performance Hygiene

- [x] **Task 3.1: Transformer fast path** — Early-return in
  `Directive_Transformer::transform()` when
  `! str_contains( $block_content, 'data-action' )` before constructing the processor.
  - Files: `includes/class-directive-transformer.php`
  - Depends on: none
  - Tests: PHP test (4.2): block without data-action returns identical string; with
    data-action still transforms
  - Parallelizable: yes

- [x] **Task 3.2: On-demand theme-action enqueue** — Register theme modules
  (`wp_register_script_module`) up front; `Theme_Action` overrides `enqueue_view_script()`
  to enqueue from a discovered id→URL map during render, matching built-in behavior. Theme
  action JS stops loading on pages that don't use it.
  - Files: `block-actions.php`, `includes/renderers/class-theme-action.php`
  - Depends on: 1.5 (canonical IDs)
  - Tests: page without the action → module absent; page with it → module loads, action works
  - Parallelizable: no (after 1.5)

- [x] **Task 3.3: Remove security headers, CSP, and settings page** — Delete
  `add_security_headers()`, the `block_actions_enable_csp` / `block_actions_csp_header`
  filters, `register_settings()` / `sanitize_settings()` / `render_settings_page()` /
  `get_plugin_settings()`, and the options page (decision Q4). Keep `uninstall.php`
  deleting `block_actions_settings` so upgraders' stale options are cleaned. Note the
  removal in the 3.0.0 changelog.
  - Files: `block-actions.php`, `readme.txt`, `README.md`
  - Depends on: none
  - Tests: no Block Actions headers on frontend responses; no settings page in admin;
    upgrading from 2.x leaves no orphaned behavior
  - Parallelizable: yes

- [x] **Task 3.4: KSES verification for low-capability roles** — Verify (wp-env, as a
  Contributor) that `data-action` / `data-modal` / `data-custom` attributes survive kses
  on save. Document the result; if stripped, add a `wp_kses_allowed_html` filter scoped to
  the plugin's attributes.
  - Files: possibly `block-actions.php`; `README.md`
  - Depends on: none
  - Tests: contributor-saved post retains attributes (or documented limitation)
  - Parallelizable: yes

## Phase 4 — Test & CI Infrastructure

- [x] **Task 4.1: PHP test environment** — Flip `.wp-env.json` `testsEnvironment` on, add
  `composer.json` with PHPUnit + WP test utils (or `wp-env`'s phpunit container), wire
  `npm run test:php`.
  - Files: `.wp-env.json`, `composer.json` (new), `package.json`, `tests/php/bootstrap.php` (new)
  - Depends on: none
  - Tests: a trivial PHP test runs green locally
  - Parallelizable: yes

- [x] **Task 4.2: PHP test suite for the logic core** — Transformer (fast path, context
  injection, renderer error isolation), each renderer's context + directives +
  `post_process_html`, theme-action discovery (ID normalization, URL mapping, underscore
  skip), pattern registration, `force_dialog_for_modal_groups`.
  - Files: `tests/php/*` (new)
  - Depends on: 4.1, plus 1.2/1.3/1.5/3.1 landed (tests assert fixed behavior)
  - Tests: is the tests
  - Parallelizable: no (after 4.1)

- [x] **Task 4.3: CI hardening** — Add `lint-js`, PHPCS (WPCS ruleset via
  `phpcs.xml.dist`), PHP test job, and Plugin Check as a non-blocking warning step
  (decision Q1) to the workflow.
  - Files: `.github/workflows/ci.yml`, `phpcs.xml.dist` (new)
  - Depends on: 4.1
  - Tests: CI green on main; deliberately broken lint fails CI
  - Parallelizable: no (after 4.1)

## Phase 5 — Extensibility & Out-of-Box Completeness

- [ ] **Task 5.1: Filterable supported blocks** — Run `BLOCKS_WITH_ACTIONS` through
  `applyFilters( 'blockActions.supportedBlocks', config )`; document the recipe (theme
  adds `core/image` with two lines of editor JS). Audit save-filter + HOCs to confirm they
  read the filtered config.
  - Files: `src/block-extensions.js`, `docs/THEME-ACTIONS.md`, `tests/block-extensions.test.js`
  - Depends on: none
  - Tests: filter adds a block → control appears, attributes save, transform applies
  - Parallelizable: yes

- [ ] **Task 5.2: Fix action-directory URL mapping** — Support `{ path, url }` entries in
  `block_actions_directories` plus automatic `content_url()` mapping for any path under
  `WP_CONTENT_DIR` (covers parent themes and plugins). Update the docs example that
  currently doesn't work.
  - Files: `block-actions.php`, `docs/THEME-ACTIONS.md`
  - Depends on: 1.5
  - Tests: PHP test — parent-theme dir and plugin dir both yield working URLs
  - Parallelizable: no (after 1.5)

- [ ] **Task 5.3: Ship `.is-hidden` + a toggle-visibility pattern** — Define `.is-hidden`
  in shipped frontend CSS (respecting editor canvas), add a "Disclosure / Show-Hide"
  pattern wiring a Button (toggle-visibility) to an anchored Group.
  - Files: new CSS (extend `src/block-variations.css` or a new frontend stylesheet entry),
    `patterns/toggle-visibility.php` (new)
  - Depends on: none
  - Tests: insert pattern on a fresh theme → toggle works visually with zero theme CSS
  - Parallelizable: yes

- [ ] **Task 5.4: Carousel pattern + working CSS** — Pattern with the full class-name
  contract (slides, buttons, thumbnails) and shipped CSS (container query +
  `transition: transform`), so a marketer gets a working carousel from the inserter.
  - Files: `patterns/carousel.php` (new), shipped CSS, `docs/carousel-action.md`
  - Depends on: 1.2, 1.3, 2.2
  - Tests: insert pattern, add images, works end-to-end including keyboard + disabled states
  - Parallelizable: no (after carousel fixes)

- [ ] **Task 5.5: Safe pattern reuse — unique anchors** — When a pattern instance would
  duplicate an existing anchor/`data-modal` pair on the page, auto-suffix both sides
  (editor-side subscription or insertion hook). Small spec note in the PR; v1 can be
  modal-pattern-specific.
  - Files: `src/block-extensions.js` (or new `src/anchor-uniqueness.js`), tests
  - Depends on: none
  - Tests: insert modal pattern twice → two independent working modals
  - Parallelizable: yes

- [ ] **Task 5.6: Theme-action manifests v1** — Optional sidecar (`my-action.json` next to
  `my-action.js`) declaring `label`, `fields`, `directives`. PHP discovery reads it; editor
  receives label + fields (no separate editor script needed); `Theme_Action` injects
  declared directives beyond init/click. This is the bridge to Phase 6.3.
  - Files: `block-actions.php`, `includes/renderers/class-theme-action.php`,
    `src/block-extensions.js`, `docs/THEME-ACTIONS.md`, PHP + JS tests
  - Depends on: 1.5, 5.2; benefits from a short spec (`docs/specs/action-manifests.md`)
  - Tests: manifest-equipped action gets custom label, inspector fields, and a
    `data-wp-on--keydown` directive without any editor script
  - Parallelizable: no (after 5.2)

## Phase 6 — Strategic Epics (spec-first; recommended order, pending Q7)

- [ ] **Task 6.1: Query Loop router actions** — `filter`, `live-search`, `paginate`,
  `infinite-scroll` actions on `core/query` via the Interactivity Router (router regions
  injected by renderer, prefetch on hover, loading states). The headline "SPA feel without
  the SPA" demo.
  - Files: spec first → `docs/specs/query-loop-actions.md`
  - Depends on: 5.1 (WP 7.0 floor from Q2 makes the router work clean — unique directive
    IDs, router asset auto-loading, `watch()` all available)
  - Tests: per spec; includes full-page-cache compatibility check
  - Parallelizable: spec can start immediately

- [ ] **Task 6.2: Interactions panel + target pickers + validation** — First-class
  inspector panel (not Advanced), block-picker UI for targets (no hand-typed IDs), List
  View badges, editor-side warnings for unresolvable targets.
  - Files: spec first → `docs/specs/interactions-panel.md`
  - Depends on: 5.1; informs 5.5
  - Tests: per spec
  - Parallelizable: spec can start immediately

- [ ] **Task 6.3: Trigger × behavior × target model** — Multiple actions per block,
  trigger selection (click / hover / scroll-into-view / load / timer), conditions
  (viewport, reduced-motion). Builds on manifests (5.6).
  - Files: spec first → `docs/specs/trigger-behavior-model.md`
  - Depends on: 5.6, 6.2
  - Parallelizable: no

- [ ] **Task 6.4: Modern-primitives pack** — View Transitions on router navigations,
  scroll-driven-animation action (CSS scroll/view timelines), Popover API action
  (tooltips/dropdowns), `core/navigation` mobile-drawer/mega-menu action, `core/details`
  accordion-group action.
  - Files: spec per primitive
  - Depends on: 6.1 (view transitions), 5.1 (new block support)
  - Parallelizable: individual primitives parallelize

- [ ] **Task 6.5: Ecosystem & platform** — Public PHP registration API
  (`block_actions_register_action()`) for plugin-provided action packs; shared utils as a
  registered script module (`block-actions/utils`) importable by theme actions; TypeScript
  types for action authors; Playground blueprint ("try in browser"); semver + deprecation
  policy doc for the action API.
  - Files: spec first → `docs/specs/action-platform.md`
  - Depends on: 5.6
  - Parallelizable: blueprint + utils module parallelize with the rest

- [ ] **Task 6.6: Abilities API integration** — Register abilities
  (`block-actions/list-actions`, `block-actions/attach-action`) so agents can discover and
  wire interactivity; keep manifests machine-readable as the data source. WP 7.0 floor
  means both server and client-side Abilities APIs are available.
  - Files: spec first
  - Depends on: 5.6
  - Parallelizable: yes (after 5.6)

---

## Suggested execution waves

- **Wave 1 (parallel):** 1.1, 1.2→1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 3.1, 4.1, 5.3
- **Wave 2 (parallel):** 2.2, 2.3, 3.2, 3.3, 3.4, 4.2, 4.3, 5.1, 5.2, 5.5
- **Wave 3:** 5.4, 5.6, then Phase 6 specs (6.1 + 6.2 specs can be drafted during Wave 2)
