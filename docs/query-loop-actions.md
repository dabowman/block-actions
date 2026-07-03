# Query Loop Actions

Four actions that make a Query Loop feel like an app without being one:
instant pagination, infinite scroll, taxonomy filters, and live search.

The engine is URL-driven: every filter/search/page state is a real GET
URL, the server renders the result, and the Interactivity Router swaps
just the query's markup. No REST calls, no nonces — full-page caches and
JavaScript-off visitors both stay correct (states degrade to ordinary
links and form submissions).

Spec: [`docs/specs/query-loop-actions.md`](specs/query-loop-actions.md).

## Quick start

Insert one of the shipped patterns from the inserter (category: Posts):

- **Filterable Post Grid** — category buttons + a grid with instant
  pagination.
- **Live-Search Post List** — a search box wired to a list.
- **Infinite-Scroll Feed** — a feed that loads the next page as you
  scroll.

## The actions

### Query Pagination — Instant (`query-paginate`)

Set it on a **Query Loop** block. Pagination clicks swap the results in
place (with prefetch on hover) instead of reloading the page.

Setting a query action also **opts the query in** to being targeted by
filter/search triggers — a Query Loop without one can't be filtered
(that opt-in is a security boundary: URLs can never reshape a query
that didn't opt in).

> The plugin disables core's own "enhanced pagination" on these queries
> and takes over navigation — one owner per query.

### Query Infinite Scroll (`query-infinite-scroll`)

Set it on a **Query Loop** block that contains a Query Pagination block.
When the end of the list scrolls into view, the next page is fetched
(the same URL pagination would use) and its posts are appended. The
pagination block is hidden once JavaScript takes over — without
JavaScript it stays visible and working.

Notes:
- Refresh/share shows the current page's posts (standard
  infinite-scroll behavior).
- Interactive blocks *inside* appended posts don't hydrate in v1.

### Query Filter (`query-filter`)

Set it on a **Button** block. Fields:

| Field | Meaning |
|---|---|
| Target Query (anchor) | HTML anchor of the Query Loop to filter. Optional when the page has exactly one actions-enabled query. |
| Taxonomy | e.g. `category`, `post_tag` (public taxonomies only). |
| Term slug | The term this button toggles. Empty = an "All" button that clears the taxonomy's filter. |

Semantics: one term per taxonomy; clicking the active term clears it;
different taxonomies combine (AND); changing a filter resets pagination.
The active button gets `aria-pressed="true"` and an `is-active-filter`
class — style it from your theme.

### Query Live Search (`query-live-search`)

Set it on a **Search** block (or a Group containing an input). Fields:
Target Query, Debounce ms (default 300), Minimum characters. Typing
updates the target query's results in place, using `replace` history so
the back button isn't flooded. With JavaScript off, a core Search block
falls back to the site-wide search.

## Targeting a query

Give the Query Loop block an **HTML anchor** (Block → Advanced) and put
that anchor in the trigger's *Target Query* field. When the page has
exactly one actions-enabled Query Loop you can leave the field empty.
Ambiguity (zero or several candidates, no anchor) logs a console warning
and does nothing.

## URL contract

State lives in prefixed, per-query params — collision-proof with
multiple Query Loops and with WordPress's own query vars:

```
?bq-{queryId}-tax-{taxonomy}={term}   filter
?bq-{queryId}-s={search}              search
?query-{queryId}-page={n}             page (core's own param)
```

Caching note: responses are deterministic functions of the URL with no
per-visitor state. If a CDN normalizes query strings, include `bq-*`
and `query-*-page` in the cache key (the same requirement core's
pagination already has).

## No-JS behavior

Pagination and infinite scroll degrade to ordinary page links; live
search on a core Search block falls back to the site-wide search.
Filter buttons degrade to real toggle links **when they are link-style
buttons** (the pattern's default) — a `tagName: "button"` button has no
href to fall back to and is JavaScript-only. Queries living in template
parts can't be resolved at trigger render time, so their filter links
are also JS-only.

## Limitations

- Filters and live search require a **non-inherited** query (untick
  "Inherit query from template"). Instant pagination and infinite
  scroll work either way.
- The target query must carry a query action (see opt-in above).
- One term per taxonomy in v1; no multi-select.
