# Spec: Query Loop Actions

**Status:** Draft
**Task:** Roadmap 6.1 (`docs/plans/2026-06-12-review-fixes-and-roadmap.md`)
**Requires:** WP 7.0+ (already the plugin floor), Interactivity Router
**Decided:** 2026-07-01 — own router region with core's enhanced pagination
force-disabled; all four actions in v1; prefixed per-query URL params;
existing blocks + patterns for author UX; fetch-and-append infinite scroll;
explicit `data-query` targeting with a single-query smart default.

## Summary

Four actions that make `core/query` feel like an app without being one:

| Action ID | Attaches to | What it does |
|---|---|---|
| `query-filter` | `core/button` | Sets/toggles a taxonomy term on the target query |
| `query-live-search` | `core/search`, `core/group` (with an input) | Debounced search scoped to the target query |
| `query-paginate` | `core/query` | Instant pagination with prefetch + loading states |
| `query-infinite-scroll` | `core/query` | Appends the next page when a sentinel scrolls into view |

The engine underneath all four is the same: **every UI state is a real URL**.
Triggers build a URL (query params), the server renders the filtered/paged
result markup, and the Interactivity Router swaps the query's router region.
No REST calls, no client-side querying, no nonces — which is what keeps
full-page caches, curl, and JavaScript-off visitors correct.

## Goals

- The "SPA feel without the SPA" headline demo: filter + search + paginate a
  post grid with zero custom code, from the pattern inserter.
- Full-page-cache friendly by construction (every state is a cacheable GET URL).
- Progressive enhancement: with JS off, filters/pagination are ordinary links
  and search is an ordinary GET form. Everything works, just with page loads.
- Compose: filters across different taxonomies AND together, and combine with
  search and pagination on the same query.

## Non-goals (deferred)

- Inspector panel redesign, target block-pickers, List View badges → 6.2.
- Triggers beyond click/input/scroll-into-view (hover, timer, conditions) → 6.3.
- View Transitions on region swaps → 6.4 (this spec must not preclude it).
- Filtering **inherited** queries (`inherit: true`) — see Limitations.
- Faceted counts ("Show 12 more"), multi-select within one taxonomy, sort
  controls. All possible later on the same URL contract.

## Architecture

### URL contract

Params are prefixed per query so multiple Query Loops coexist and nothing
collides with WP core or other plugins (`s`, `paged`, taxonomy vars stay
untouched):

```
?bq-{queryId}-tax-{taxonomy}={term-slug}    e.g. ?bq-1-tax-category=news
?bq-{queryId}-s={search}                    e.g. ?bq-1-s=coffee
?query-{queryId}-page={n}                   (core's existing pagination param — reused, not duplicated)
```

- `{queryId}` is the query block's own `queryId` attribute — the same ID
  core already uses for `query-{id}-page`, so pagination needs no new param.
- Multiple `bq-*-tax-*` params on one query AND together in a `tax_query`.
- Changing a filter or the search term **drops the page param** (you're on a
  new result set; page 3 of it may not exist).
- Param values are slugs/plain text; full sanitization matrix under Security.

### Server side: params → query vars

A new hook module (`includes/class-query-params.php` or functions in
`block-actions.php`) registers on `query_loop_block_query_vars` and, for a
query block that (a) carries one of the four actions and (b) has matching
`bq-{queryId}-*` params in the request:

- maps `bq-{id}-tax-{taxonomy}` params into `tax_query` clauses
  (`AND` relation, `field => slug`),
- maps `bq-{id}-s` into `s`,
- leaves `paged` alone (core already maps `query-{id}-page`).

The action check reads the block's parsed attributes (the editor stores
`data-action` and its fields as block attributes, available on the `$block`
instance passed to the filter). Queries without an action never look at the
params — a crafted URL can't reshape an unrelated query.

### Renderer: `Query_Action` (PHP)

One renderer class, `includes/renderers/class-query-action.php`, registered
for all four action IDs (the `Theme_Action` multi-ID precedent). On the
**query block** (`query-paginate` / `query-infinite-scroll` directly, or when
it is the target of a filter/search trigger elsewhere on the page) it:

1. Injects the router region + store on the root element:
   - `data-wp-interactive="block-actions/query"`
   - `data-wp-router-region="block-actions-query-{queryId}"`
   - `data-wp-context` with `{ queryId, action-specific config }`
   - `data-wp-class--is-loading` + `data-wp-bind--aria-busy` bound to the
     per-query loading getter.
2. **Force-disables core's enhanced pagination** for that block
   (`render_block_data` filter sets `enhancedPagination => false` before
   render) so core's router region and store never mount — one navigation
   owner per query, no double-router edge cases.
3. Via `post_process_html()`:
   - pagination links (`.wp-block-query-pagination a`) get
     `data-wp-on--click="actions.navigate"` and
     `data-wp-on-async--mouseenter="actions.prefetch"`;
   - for `query-infinite-scroll`, a sentinel `<div>` with
     `data-wp-init="callbacks.initSentinel"` is appended after the post
     template and the pagination block is visually replaced by a fallback
     "Load more" link (the next-page URL — this is also the no-JS path).

On **trigger blocks** (`query-filter` on a button, `query-live-search` on a
search block) it injects:

- `data-wp-interactive="block-actions/query"` + context
  `{ targetQuery, taxonomy, term }` or `{ targetQuery, debounce, minChars }`,
- filter buttons: `data-wp-on--click="actions.applyFilter"`,
  `data-wp-on-async--mouseenter="actions.prefetchFilter"`, server-rendered
  `aria-pressed` reflecting whether the term is active in the current URL,
- search inputs: `data-wp-on--input="actions.search"` on the inner `<input>`,
  with the form's GET fallback pointed at the same URL contract
  (`name="bq-{id}-s"`).

Because triggers usually live *outside* the query block, trigger markup sits
outside the router region and is **not** swapped on navigation — active
states on buttons must therefore be **client-reactive**
(`data-wp-class--is-active` / `data-wp-bind--aria-pressed` bound to a getter
that reads the current URL from `state`), with the server-rendered value only
as first paint.

### Targeting: `data-query`

- Explicit: trigger sets `data-query="my-posts"` → matches the query block
  whose anchor (`id`) is `my-posts`.
- Smart default: if `data-query` is absent and exactly **one**
  actions-enabled query exists on the page, bind to it. If zero or several:
  do nothing and `console.warn` with a fix-it message. (Editor-side
  validation UI is 6.2; v1 warns at runtime.)
- Resolution happens server-side where possible (the transformer sees the
  whole page's blocks via `render_block` order — resolution may need a
  late pass) with a client-side fallback in `callbacks.init`.

### Store: `block-actions/query` (JS)

One module, `src/stores/query/view.js` (one new webpack entry), shared by all
four actions. Sketch:

```
state:
  navigatingQueries: {}            // queryId → bool (global; survives region swaps)
  get isLoading()                  // reads context.queryId against navigatingQueries
  get isFilterActive()             // trigger context vs current URL params
actions:
  navigate(event)                  // withSyncEvent generator: preventDefault,
                                   // set loading, yield router.navigate(href), finally clear
  prefetch()                       // lazy-import router, prefetch link/computed URL
  applyFilter(event)               // toggle semantics: build URL ±bq-{id}-tax-{tax}=term,
                                   // drop page param, navigate()
  prefetchFilter()
  search(event)                    // debounce (context.debounce, default 300ms),
                                   // set/delete bq-{id}-s, drop page param,
                                   // navigate(url, { replace: true })
  loadMore()                       // infinite scroll append path (below)
callbacks:
  init / initSentinel              // sentinel IntersectionObserver (withScope),
                                   // returns cleanup disconnecting the observer
```

Conventions carried over from the existing stores: generator actions (never
`async` for anything touching scope), `withSyncEvent` for `preventDefault`,
`withScope` for observer/timeout callbacks, cleanup functions from `init`,
cross-instance state in `state` not module-level `let`. The router is
lazy-imported inside actions (`yield import( '@wordpress/interactivity-router' )`)
so the ~3KB router only loads for visitors who interact.

Loading UX: the region gets `is-loading` + `aria-busy="true"` during
navigation; minimal shipped CSS (`assets/actions/query.css`) does the
opacity/pointer-events treatment, theme owns real appearance — same contract
as carousel/toggle-visibility CSS.

### Filter semantics (v1)

- One term per taxonomy: clicking a term button **sets** that taxonomy's
  param (replacing any previous term); clicking the **active** term clears it
  (toggle-off).
- An "All" button is a filter button with an empty `term` — it clears that
  taxonomy's param.
- Different taxonomies compose (AND). Multi-select within a taxonomy is a
  non-goal for v1.

### Infinite scroll: fetch-and-append

Decision: **fetch-and-append**, not cumulative render.

- The sentinel's IntersectionObserver fires `loadMore()`: fetch the *real*
  next-page URL (the same URL pagination would use — so it's the same
  cacheable page any visitor gets), parse the response, extract the new
  `.wp-block-post` items from the matching region, append them to the
  post-template list, and `history.replaceState` to the fetched URL.
- Guard flag in context (`isFetching`) prevents overlapping loads; the
  sentinel unwires (observer cleanup) when the last page is reached (no next
  link in the fetched page).
- Newly appended posts contain no interactive directives of their own in the
  common case; if they do (e.g. a button with an action inside the post
  template), the append path must run the fetched markup through the region
  hydration the router uses — implementation must verify appended directives
  hydrate, and this is an explicit test case.
- Accepted tradeoff (recorded decision): refresh/share shows only the
  current page's posts, matching standard infinite-scroll behavior. Back
  button returns to the previous *page URL*, not the scroll position.
- A visible "Load more" link remains as the no-JS fallback and is what the
  sentinel programmatically drives; reduced-motion users get identical
  behavior (append is not an animation).

### Interop rules

- **Core enhanced pagination:** force-disabled on actions-enabled queries
  (see renderer #2). Queries elsewhere on the page keep whatever they had.
- **Inherited queries (`inherit: true`):** `query-paginate` and
  `query-infinite-scroll` work (their URLs are real archive pagination URLs;
  region swap doesn't care how the query vars were built).
  `query-filter`/`query-live-search` are **unsupported** on inherited
  queries in v1 (`query_loop_block_query_vars` doesn't run for them);
  renderer no-ops + `WP_DEBUG` warning, docs call it out.
- **Multiple actions-enabled queries per page:** fully supported — params,
  region IDs, and loading state are all keyed by `queryId`.
- **6.4 View Transitions:** region swap is the single choke point; keep the
  navigate call in one place so 6.4 can wrap it.

## Security

- Taxonomy names from URL params validated against
  `get_taxonomies( [ 'public' => true ] )` **and** must match the taxonomy
  declared on some filter trigger for that query where determinable; term
  slugs through `sanitize_title()`. Exposure equals what core taxonomy
  archives already make public.
- Search through `sanitize_text_field()`; page through `absint()` (core's).
- Params only consumed by queries carrying a query action (attribute check).
- No nonces anywhere on the frontend path (public reads only) — this is a
  requirement, not an accident: a nonce in markup breaks page caching.
- All markup manipulation via `WP_HTML_Tag_Processor`, per existing rules.

## Full-page-cache compatibility

By construction: state lives in the URL, responses are deterministic
functions of the URL, no cookies/nonces/user-variant markup on the path.
Explicit checks (test plan):

- Rendered query region markup is byte-identical for logged-out requests to
  the same URL (no timestamps, no per-request IDs beyond queryId).
- Filter/search/pagination all work when responses come from a cache that
  keys on the full URL (wp-env smoke test with a page-cache drop-in, e.g.
  Batcache-style, or `cache-control` inspection as proxy).
- Documented host note: param-normalizing CDNs must be configured to include
  `bq-*` and `query-*-page` params in the cache key (same requirement core's
  pagination already has).
- Cache-fragmentation note: filter combinations multiply cache entries; this
  is inherent to URL-state architectures and identical to core taxonomy
  archives. Documented, not mitigated, in v1.

## Editor UX (v1 — pre-6.2 minimum)

`src/action-registry.js` gains the four actions with fields:

- `query-filter` (on `core/button`): Target Query (`data-query`), Taxonomy,
  Term slug (empty = "All"/clear).
- `query-live-search` (on `core/search`, `core/group`): Target Query,
  Debounce ms (default 300), Min characters (default 0).
- `query-paginate` (on `core/query`): no fields.
- `query-infinite-scroll` (on `core/query`): Load More label.

`BLOCKS_WITH_ACTIONS` additions: `core/query`, `core/search` (via the same
config used by the 5.1 filter mechanism). Per-block action scoping — the
dropdown on a query block should offer the two query-hosted actions, not
carousel — reuses/extends whatever per-block action filtering exists;
if none does, add an `allowedActions` key to the supported-blocks config
(small, benefits all actions).

## Patterns (ship with the epic)

1. **Filterable post grid** — Group (filter buttons wired to
   `query-filter`) + Query Loop (grid) with anchors pre-wired via the 5.5
   anchor-uniqueness machinery.
2. **Live-search list** — Search block (`query-live-search`) + Query Loop
   list with an "N results" heading area.
3. **Infinite-scroll feed** — Query Loop with `query-infinite-scroll` and
   the Load-more fallback styled.

Each pattern must work from the inserter on a stock theme with zero custom
CSS beyond the shipped functional CSS — same bar as the carousel pattern.

## Accessibility

- Region: `aria-busy` during loads; router announces navigation; on filter
  and search swaps, announce "N results" via a `wp.a11y`-style live region
  injected by the renderer (count comes from the swapped markup).
- Filter buttons: `aria-pressed` reflects active state (server-rendered
  first paint + client-reactive binding).
- Search: input keeps focus across the region swap (input is outside the
  region — verify and test).
- Infinite scroll: appended items follow the sentinel in DOM order so
  keyboard/screen-reader flow continues naturally; "Load more" fallback is
  focusable and functional at all times.
- Reduced motion: no scroll animation on paginate (or respect
  `prefers-reduced-motion` if smooth-scroll-to-top is added).

## Test plan

**JS (Jest, existing harness + mocked router):**
URL building (set/toggle/clear per taxonomy, page-param reset, prefix
correctness with two queries), debounce behavior + `replace: true` history,
loading-state getters, sentinel wiring/cleanup, append path with mocked
fetch + parser, no-target/ambiguous-target warnings.

**PHP (PHPUnit, wp-env):**
Renderer directive/region injection on query root, `enhancedPagination`
force-off, pagination-link directive injection, sentinel/Load-more markup,
trigger directives + `aria-pressed`, param→query-var mapping (tax AND
composition, search, sanitization, unknown-taxonomy rejection), inherited
-query no-op + warning, params ignored on action-less queries, cache checks
(no nonce in output, deterministic markup).

**wp-env smoke (manual checklist in the PR):**
two filtered queries on one page; back/forward through filter states;
refresh mid-infinite-scroll; JS disabled (links + GET form still work);
pattern-inserter → working demo on Twenty Twenty-Five.

## Rollout

Three stacked PRs, same engine landing first:

1. **Engine + `query-paginate`** — renderer, region, store, URL/navigation
   core, loading states, force-off interop, tests.
2. **`query-filter` + `query-live-search`** — param mapping, trigger
   wiring, patterns 1–2, a11y announcements.
3. **`query-infinite-scroll`** — append path, sentinel, pattern 3.

Docs: new `docs/query-loop-actions.md` user guide grows with each PR;
README headline demo updates in PR 2.

## Open questions (non-blocking)

- Whether the trigger→query smart default can be fully resolved server-side
  in one `render_block` pass (block order isn't guaranteed trigger-first) or
  needs the client-side fallback to be primary. Affects implementation, not
  the contract.
- Appended-markup hydration mechanics for infinite scroll (router internals
  vs. manual `wp_interactivity` region processing) — spike in PR 3.
- Whether `core/search`'s rendered form can carry the GET fallback params
  cleanly (`name="bq-{id}-s"`) or needs a hidden-input injection.
