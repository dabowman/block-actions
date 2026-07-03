# Spec: Trigger × Behavior × Target Model

**Status:** Draft
**Task:** Roadmap 6.3 (`docs/plans/2026-06-12-review-fixes-and-roadmap.md`)
**Requires:** WP 7.0+ (unique directive suffixes, cross-namespace refs);
builds on 5.6 (manifests), 6.2 (Interactions panel / `<InteractionItem>`)
**Decided:** 2026-07-01 — progressive serialization (simple case keeps
today's format forever); hybrid fast-path + engine runtime; all five
triggers in v1 (hover paired with focus); viewport + reduced-motion
conditions evaluated at trigger time.

## Summary

Generalize "a block has an action" into "a block has a list of
**interactions**", each a tuple:

```
{ trigger, action (behavior), data (incl. target), conditions? }
```

Triggers: `click` · `hover` · `scroll-into-view` · `load` · `timer`.
Conditions: viewport min/max width, reduced-motion — client-side gates,
evaluated when the trigger fires (cache-safe by construction).

A single click-triggered, unconditioned interaction — today's entire
universe, and tomorrow's 99% case — continues to compile to exactly today's
markup and runtime. The new machinery only engages when authors reach for
more.

## Behavioral vs structural actions

Not every action fits the trigger model:

- **Behavioral** actions have one entry point a trigger invokes:
  `modal-toggle`, `toggle-visibility`, `smooth-scroll`, `scroll-to-top`,
  `copy-to-clipboard`, `query-filter`. These gain trigger selection
  (modal on a timer, reveal on scroll-into-view…).
- **Structural** actions own their whole lifecycle (init, observers,
  several handlers): `carousel`, `query-paginate`, `query-infinite-scroll`,
  `query-live-search`. Trigger selection is meaningless; the editor hides
  the trigger UI; a structural action can still coexist with behavioral
  interactions on the same block.

Registry + manifest vocabulary (5.6 manifests get this for free):

```js
{
  id: 'modal-toggle',
  entry: 'actions.toggle',        // store action a trigger invokes
  triggers: [ 'click', 'hover', 'scroll-into-view', 'load', 'timer' ],
  defaultTrigger: 'click',
  // …or, for carousel etc.:
  structural: true,
}
```

## Serialization: progressive format

**Simple case — unchanged, forever.** One interaction, default trigger, no
conditions serializes as today: `data-action="modal-toggle"` +
`data-modal="…"`. This is not a back-compat shim; it is the canonical
simple format. Existing content never migrates; patterns and hand-authored
markup stay hand-authorable; kses exposure stays as already verified.

**Rich case.** Anything beyond that — a second interaction, a non-default
trigger, or conditions — serializes as one JSON attribute on the block
root:

```html
<div data-interactions='[
  { "action": "modal-toggle", "trigger": "timer",
    "data": { "modal": "newsletter" },
    "conditions": { "minWidth": 782, "reducedMotion": "skip" } },
  { "action": "toggle-visibility", "trigger": "click",
    "data": { "target": "details" } }
]'>
```

- The editor's save path computes which format applies; downgrading (author
  removes the second interaction / resets trigger) returns the block to the
  simple format. Round-tripping is a test requirement.
- If both attributes are somehow present, `data-interactions` wins;
  `WP_DEBUG` warning.
- **Spike #2 (kses):** verify a JSON-valued `data-interactions` attribute
  survives `wp_kses_post()` for Contributor/Author saves on WP 7.0 (single-
  quoted attribute, double quotes inside). If it's mangled, fallback is an
  HTML-encoded value the transformer decodes — verify before building.

## Runtime: hybrid fast path + engine

### Fast path (no new runtime)

A single `click`/`hover` interaction without conditions compiles to direct
directive injection — for `click` + default everything, byte-identical to
today's transformer output. Zero regression surface for existing content.

### The engine: `block-actions/interactions`

A small dispatcher store engaged only for: `scroll-into-view`/`load`/`timer`
triggers, any conditions, or multiple interactions on one block. The
transformer puts the engine namespace on the root:

```html
data-wp-interactive="block-actions/interactions"
data-wp-context='{ "interactions": [ …validated tuples… ] }'
data-wp-init="callbacks.init"
```

`callbacks.init` wires each tuple — event listeners for click/hover (added
via directives where possible, see spike), one shared IntersectionObserver
for scroll-into-view (`once` by default), `setTimeout` for timer (withScope,
cleared in the cleanup function), immediate dispatch for load — checking
conditions at fire time, then invoking the behavior's `entry` action.

### Spike #1 — context multiplexing (decides how thin the engine is)

Behavioral actions read their config via `getContext()` in their own
namespace. With two interactions (two stores) on one element, both contexts
must be available there. WP 7.0's unique directive suffixes
(`data-wp-on--click---a`) and cross-namespace values (`ns::actions.x`) are
documented; whether **repeated namespaced context directives**
(`data-wp-context---i1="block-actions/modal-toggle::{…}"`) hydrate correctly
is not. Timeboxed spike; the outcome picks one of:

- **Supported →** the transformer injects each renderer's context and
  namespaced trigger directives side by side; the engine only mediates
  observer/timer/condition dispatch, and even multi-click cases are pure
  directives (`data-wp-on--click---i1="block-actions/copy::actions.copy"`).
- **Not supported →** behavioral entry actions accept an explicit config
  argument, falling back to `getContext()` when omitted
  (`toggle( data? )`). The engine passes each tuple's `data` directly.
  This contract addition is small, mechanical across six built-ins, and
  independently useful — 6.6 (Abilities) wants programmatically invocable
  actions anyway.

The spec intentionally works under either outcome; the spike only
determines plumbing.

**v1 outcome (PR #11 review):** neither branch — a third design landed.
The engine never dispatches programmatically at all: the transformer
arms `data-wp-on--ba-fire="{entry}"` against the action's own store,
and the engine dispatches a synthetic cancelable `ba-fire` DOM event
when the trigger condition is met. The RUNTIME evaluates the entry in
the element's real namespace scope (generators, withSyncEvent, all of
it) exactly as a native click would. Verified in-browser: a timer
tuple opens a modal whose action reads its own context correctly. The
multiplexing question remains open only for MULTI-interaction blocks
(several namespaces on one element), still deferred.

## Triggers (v1 semantics)

| Trigger | Wiring | Notes |
|---|---|---|
| `click` | `data-wp-on--click` (or async variant, matching what the action uses today) | Default for every behavioral action |
| `hover` | `mouseenter` **and** `focusin`, always paired | Keyboard parity is not optional; docs say "hover/focus" |
| `scroll-into-view` | IntersectionObserver in the engine | `once: true` default; optional `threshold` field; observer disconnected in cleanup |
| `load` | Engine init dispatch | Fires post-hydration, not literal window load |
| `timer` | Engine `setTimeout` | Required `delay` (ms) field; canceled in cleanup; a `once`-per-pageview semantics only (no storage) |

## Conditions (v1)

```
conditions: { minWidth?: px, maxWidth?: px, reducedMotion?: 'skip' }
```

- Evaluated via `matchMedia` **at trigger time** — resizing after page load
  behaves correctly, and nothing about the server render varies (fully
  page-cache-safe).
- `reducedMotion: 'skip'` gates the whole interaction when
  `prefers-reduced-motion: reduce`. Distinct from *motion handling inside*
  actions: smooth-scroll should degrade to an instant jump internally
  regardless of conditions (audit as part of this epic — it's an existing
  gap if not). The condition is for "don't do this at all" cases
  (auto-playing reveals, timed popups).
- Vocabulary is extensible by design (keys are validated allowlist); v1
  ships exactly these two. Once-per-session was considered and declined
  (localStorage state edges toward consent territory; revisit on demand).

## PHP pipeline changes

- **Transformer:** parses `data-interactions` (strict `json_decode`;
  validation below), falls back to today's `data-action` path. Applies the
  fast path or engine markup accordingly. Structural actions render exactly
  as today regardless of format.
- **Renderer API:** renderers gain `get_entry_action(): ?string` (null =
  structural). The transformer — not the renderer — injects the trigger
  directive for behavioral actions; each renderer's `apply_directives()`
  drops its hardcoded `data-wp-on--click` and keeps everything else
  (context, ARIA, `post_process_html`). Mechanical change across six
  built-ins + `Theme_Action` (manifest `entry`/`triggers` keys).
- **Validation (the security boundary, same posture as `Theme_Action`
  forwarding):** unknown action IDs → tuple skipped; trigger must be in the
  action's declared set; `data` keys validated against the action's
  declared fields, scalar values only, `sanitize_text_field` on strings;
  `conditions` keys allowlisted, numeric values `absint`ed; interactions
  array capped (10) with `WP_DEBUG` warning on truncation.

## Editor

Builds directly on 6.2's `<InteractionItem>`:

- The Interactions ToolsPanel renders the list + an **Add interaction**
  button (list of one behaves exactly like 6.2).
- Each item gains a **Trigger** select (options = the action's declared
  triggers; hidden for structural actions) and, per trigger, its fields
  (timer delay, scroll threshold).
- **Conditions** render as default-hidden ToolsPanelItems per item
  (viewport min/max px inputs, reduced-motion toggle) — the ToolsPanel
  show/reset affordance again.
- The save filter computes the progressive format; the parser reads both.
- 6.2 validation extends per-tuple (each interaction validated
  independently; issues name the interaction: "Interaction 2 (Timer →
  Modal Toggle): …").

## Test plan

**Spikes first** (documented in the PR): #1 context multiplexing,
#2 kses survival of the JSON attribute.

**JS (Jest):** serializer round-trip (simple↔rich, downgrade returns to
simple format); engine — each trigger wires and cleans up (observer
disconnect, timer cancel), conditions matrix (matchMedia mocked; evaluated
at fire time, not init), dispatch reaches the target store action, hover
always pairs focusin, `once` semantics; editor — trigger select filtered by
action, structural hides trigger UI, Add-interaction flow.

**PHP (PHPUnit):** transformer parses valid tuples; every validation
rejection (unknown action, undeclared trigger, non-scalar data, unknown
condition key, over-cap array); fast-path output byte-identical to the 6.1
pipeline for a simple click interaction; engine markup for rich cases;
renderer `get_entry_action()` migration (no renderer still injects its own
click handler); kses integration test (Contributor role saves a
`data-interactions` block; attribute survives).

**wp-env smoke:** modal on timer + reveal on scroll on one page; same block
carrying both a click and a scroll interaction; reduced-motion emulation
skips gated interactions; resize across a viewport condition boundary
changes behavior without reload; old 2.x content untouched and working.

## Rollout

1. **PR 1 — spikes + contract:** both spikes, registry/manifest vocabulary
   (`entry`/`triggers`/`structural`), renderer `get_entry_action()`
   migration, transformer fast path reading both formats. No new UX yet;
   everything existing must be green and byte-identical.
2. **PR 2 — engine + serializer:** the dispatcher store, five triggers,
   conditions, save-filter progressive serialization, JS/PHP suites.
3. **PR 3 — editor UX:** Add-interaction list UI, trigger/condition
   controls, per-tuple validation, docs (`docs/THEME-ACTIONS.md` manifest
   keys; a new interactions guide with the timer-modal and
   scroll-reveal recipes).

## Open questions (non-blocking)

- Spike outcomes (#1 context multiplexing, #2 kses) — by design.
- Whether `hover` should also dispatch on `touchstart`-adjacent signals or
  simply never fire on touch devices (lean: never fire; hover-only
  enhancements must be non-essential by definition).
- Whether the engine's IntersectionObserver should be shared per page or
  per block (lean: one per page, keyed callbacks — measure in PR 2).
- Timer + `once` interplay if the same URL is revisited via the 6.1 router
  region swaps (does a swapped-in region re-arm timers? define in PR 2
  tests).
