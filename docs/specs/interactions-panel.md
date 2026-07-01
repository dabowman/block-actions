# Spec: Interactions Panel, Target Pickers & Validation

**Status:** Draft
**Task:** Roadmap 6.2 (`docs/plans/2026-06-12-review-fixes-and-roadmap.md`)
**Requires:** WP 7.0+ editor; builds on 5.1 (filterable supported blocks),
5.5 (anchor uniqueness), 5.6 (manifests)
**Decided:** 2026-07-01 — UI-only (no attribute-schema change); ToolsPanel
architecture; candidate-dropdown target picker; validation via inspector
notice + pre-publish check + List View badges (badges as a feasibility
spike with a declared fallback).

## Summary

Replace the current action UI — a ComboboxControl buried in the collapsed
**Advanced** section — with a first-class **Interactions** panel in the block
inspector, and replace every hand-typed element-ID field with a block picker
that lists eligible targets on the page. Add editor-side validation that
surfaces broken interactions where authors will actually see them.

This epic is **editor-only**. The stored attributes (`customAction`,
`actionData`), the save filter, the PHP transformer, and all frontend
behavior are untouched. A post saved with 6.2 is byte-identical to one saved
with 6.1.

## Goals

- Actions are discoverable: a visible panel, not a power-user Easter egg.
- Nobody types an anchor ID by hand: pick the target block from a list; the
  anchor is created for you if the block doesn't have one.
- Broken wiring is visible before publish, in the panel and at publish time.
- The panel's component structure is the foundation 6.3 extends to multiple
  interactions per block (trigger × behavior × target) without a rewrite.

## Non-goals (deferred)

- Attribute schema changes / `interactions[]` array → 6.3 (recorded
  decision: 6.3 pays the migration when triggers force schema evolution
  anyway).
- Multiple actions per block, trigger selection, conditions → 6.3.
- Canvas click-to-pick targeting mode → possible later layer on the same
  picker control; not v1 (recorded decision).
- Canvas outlines/badges on blocks (declined — sidebar + pre-publish +
  List View are the chosen surfaces).
- The standalone `customData` "Data Attribute" control: action-independent
  and applies to every block; stays in Advanced, out of scope.

## Panel design

### Structure: ToolsPanel

`InspectorControls` (default group) hosting a `ToolsPanel` titled
**Interactions** — the modern core pattern (Dimensions/Border):

- **Action** item: `isShownByDefault`, the existing searchable
  ComboboxControl (built-ins + theme actions + manifest actions). Selecting
  "None" resets, exactly like today.
- **Required fields** of the chosen action render as always-shown
  `ToolsPanelItem`s while that action is selected (a modal toggle without a
  target is meaningless — not optional).
- **Optional fields** (e.g. live-search debounce, scroll offset) are
  default-hidden ToolsPanelItems with per-item reset — the ToolsPanel menu
  gives them the standard show/hide + reset affordance for free.
- Field definitions keep coming from `action-registry.js` and 5.6 manifests;
  the registry field shape gains an optional `optional: true` flag mapping
  to `isShownByDefault: false`.

The panel body is factored as an `<InteractionItem>` component rendering one
action + its fields. 6.2 renders exactly one; 6.3 renders a list of them.
That factoring — not the schema — is 6.2's forward-compat obligation.

### Migration of the existing UI

`withActionInspectorControl` moves its output from
`InspectorAdvancedControls` to the new panel wholesale. No transition
period: the Advanced-section control is removed in the same release. (The
attributes are unchanged, so nothing about existing content breaks; only
where the controls live changes.)

## Target picker

### Control

A new field control, `TargetPicker`, replacing `TextControl` for every field
that names another block. Registry/manifest field declaration:

```js
{
  key: 'modal',
  label: 'Modal',
  type: 'target',
  targets: {
    blocks: [ 'core/group' ],      // eligible block types (empty = any)
    shape: 'dialog',                // optional named predicate, see below
  },
}
```

The control renders a searchable dropdown of **candidate blocks in the
current editing context**:

- Candidates come from the block tree (`core/block-editor` store), filtered
  by `targets.blocks` and the optional shape predicate.
- Each option shows the block's icon + display title (via
  `useBlockDisplayInformation`), a short content snippet, and its anchor
  (or "no anchor yet — will be created").
- Named shape predicates live in one editor module: v1 ships `dialog`
  (group with the dialog variation / `tagName: 'dialog'`) and `query`
  (`core/query`, flagging `inherit: true` for 6.1's filter/search actions).
  Manifests can only reference named predicates — they're JSON, not code.

### Selection behavior

On pick:

1. If the target block has an anchor, store it in the same `actionData`
   field the text control used (e.g. `actionData.modal = 'my-modal'`) —
   **the stored value stays a plain anchor string**; the frontend contract
   is untouched.
2. If it lacks one, generate a slug from the block (reusing the 5.5
   anchor-uniqueness helpers for collision-safe naming), set it on the
   target block via `updateBlockAttributes`, then store it.

The control also accepts free-text entry (combobox, not a closed select) so
existing hand-typed values keep working, cross-context targets (below) stay
expressible, and nothing regresses for power users.

### Existing actions upgraded

`modal-toggle` (Modal Element ID), `toggle-visibility` (Target Element ID),
`smooth-scroll` (Target Element ID), and 6.1's Target Query fields all
switch to `type: 'target'` with appropriate constraints. This is a
registry-metadata change only.

## Validation

### The validation module

One editor module (`src/interaction-validation.js`) exporting
`validateInteraction( clientId ) → issues[]` and a memoized
`validateAll() → Map<clientId, issues[]>`, consumed by all three surfaces.
Checks per interaction:

- **Unresolved target**: the stored anchor matches no block in the current
  editing context.
- **Ambiguous target**: the anchor matches more than one block (shouldn't
  survive 5.5, but hand-edited markup can produce it).
- **Wrong shape**: target resolves but fails the action's shape predicate
  (modal target isn't a dialog group; filter targets an `inherit: true`
  query).
- **Missing required field**: action chosen, required field empty.

### Advisory, never blocking — the cross-context rule

A button in post content can legitimately target a modal that lives in a
template part; the post editor's block tree can't see it. Therefore:

- "Unresolved target" warnings say **"not found in this editing context"**
  and explicitly mention the template/template-part possibility.
- No validation ever blocks saving or publishing (`lockPostSaving` is not
  used).
- Wrong-shape and missing-required-field checks *are* definitive (they
  validate what's present, not what's absent) and use firmer copy.

### Surfaces

1. **Inspector notice** (baseline): an inline `Notice` (warning status)
   inside the Interactions panel listing the block's issues, live as the
   author edits.
2. **Pre-publish check**: a `PluginPrePublishPanel` ("Interactions") that
   renders only when `validateAll()` finds issues — each row shows the
   block's display title + the issue, and clicking selects that block
   (`selectBlock`) so the author lands in the right place.
3. **List View badges** — feasibility spike, not a promise:
   - **Spike:** determine whether WP 7.0 exposes any supported way to
     decorate List View rows (slot, filter, or block-card API). Timebox it;
     document the finding in the PR.
   - **If yes:** a small dot/icon badge on rows whose block has an
     interaction; warning-colored when it has issues.
   - **Fallback if no:** a compact indicator in the block toolbar (standard
     `BlockControls` icon button that opens the Interactions panel), which
     gives per-block visibility without List View injection and without the
     declined canvas-outline intrusion. The spec commits to *some*
     glanceable per-block indicator; List View is the preferred location,
     not the contract.

## Accessibility

- ToolsPanel, ComboboxControl, and Notice are core components with their
  a11y built in; the picker inherits combobox keyboard/AT behavior.
- Picker options must have text-complete labels (icon is decorative;
  block title + anchor read out).
- The pre-publish rows are buttons with descriptive labels ("Select Button
  'Read more' — target not found").
- Validation notices use `Notice` semantics (polite live region), not
  color alone.

## Extension points

- Theme actions get everything for free: manifest fields declaring
  `type: 'target'` render the picker; named shape predicates are the only
  constraint vocabulary exposed to JSON.
- `window.BlockActions.registerAction()` accepts the same field shape.
- A JS filter (`blockActions.targetShapes`) lets plugin/theme editor code
  register additional named predicates for their own actions.

## Test plan

**Jest (existing harness — HOC extraction + mocked `@wordpress/*`):**

- Panel renders in `InspectorControls` (not Advanced); action select works;
  required vs optional field rendering; reset behavior clears `actionData`.
- TargetPicker: candidate filtering by block type + shape predicate;
  anchor generation path calls the 5.5 helpers and `updateBlockAttributes`;
  free-text entry preserved; stored value is a plain string.
- Validation module: each issue type has a positive + negative case;
  cross-context copy for unresolved targets; memoization sanity.
- Pre-publish panel: renders only with issues; row click selects block.

**wp-env smoke (manual checklist in the PR):**

- Full flow: insert button → Interactions panel → pick modal target that
  lacks an anchor → anchor appears on the group → frontend works.
- Template-part-hosted modal targeted from a post: warning copy is
  advisory, publish not blocked, frontend works.
- Existing 2.x content (hand-typed IDs) renders the same values in the new
  picker and keeps working untouched.

## Rollout

One PR, sequenced internally: (1) panel migration to ToolsPanel, (2)
TargetPicker + registry field-type upgrade, (3) validation module + notice +
pre-publish, (4) List View spike outcome (badge or toolbar fallback).
Docs: `docs/THEME-ACTIONS.md` gains the `type: 'target'` field docs +
predicate list; README screenshots update to the new panel.

## Open questions (non-blocking)

- Whether `ToolsPanelItem` reset semantics fit the Action combobox itself
  (resetting the panel should clear the whole interaction — verify the
  UX reads clearly).
- List View spike outcome (by design).
- Whether candidate snippets need truncation/HTML-stripping helpers or
  `getBlockDisplayInformation` output suffices across block types.
