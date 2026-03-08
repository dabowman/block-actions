---
name: wordpress-interactivity
description: WordPress Interactivity API development for WordPress 6.9+. Use when building interactive block frontends, adding client-side behavior to blocks, implementing modals/dialogs/accordions, creating filters/search with live results, handling forms with validation, enabling client-side navigation (SPA-like), sharing state across multiple blocks, or any frontend interactivity beyond CSS. Covers directives, stores, state management, async patterns, server-side rendering, client navigation with the Interactivity Router, and accessibility.
---

# WordPress Interactivity API — Complete Implementation Guide

Build interactive WordPress block frontends using the declarative directive-based Interactivity API and the Interactivity Router for client-side navigation. Targets WordPress 6.9+. ~11KB gzipped runtime built on Preact Signals. Router adds ~3KB.

## When to Use

✅ **Use Interactivity API for:**
- Toggles, modals, accordions, tabs, dropdowns
- Forms with live validation and async submission
- Search/filter with instant results
- Shopping carts, wishlists, cross-block communication
- Client-side page navigation (SPA-like pagination, infinite scroll)
- Any reactive UI state on the block frontend

❌ **Don't use for:**
- CSS-only effects (hover, focus, animations)
- Editor-side functionality (use React)
- Third-party library wrappers (use traditional enqueue)
- Full single-page applications (use React Router etc.)

## Architecture Overview

The Interactivity API is **server-rendered first**. PHP renders the initial HTML with directive attributes. A ~10KB Preact/Signals runtime hydrates and manages reactivity client-side. Directive values are **references to store properties**, never JavaScript expressions.

**Three-layer model:**
1. **HTML (render.php)** — Server-rendered markup with `data-wp-*` directive attributes
2. **Store (view.js)** — JavaScript module defining state, actions, and callbacks
3. **State (PHP)** — Server initializes global state via `wp_interactivity_state()`

## Quick Start

### 1. block.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "myplugin/my-block",
  "title": "My Interactive Block",
  "supports": {
    "interactivity": true
  },
  "viewScriptModule": "file:./view.js",
  "render": "file:./render.php"
}
```

For blocks using the Interactivity Router (client-side navigation):

```json
{
  "supports": {
    "interactivity": {
      "clientNavigation": true,
      "interactive": true
    }
  }
}
```

### 2. Build config (package.json)

```json
{
  "scripts": {
    "build": "wp-scripts build --experimental-modules",
    "start": "wp-scripts start --experimental-modules"
  }
}
```

### 3. render.php

```php
<?php
$context = ['isOpen' => false];

wp_interactivity_state('myplugin/my-block', [
  'count' => 0,
]);
?>
<div
  data-wp-interactive="myplugin/my-block"
  <?php echo wp_interactivity_data_wp_context($context); ?>
  <?php echo get_block_wrapper_attributes(); ?>
>
  <button
    data-wp-on-async--click="actions.toggle"
    data-wp-bind--aria-expanded="context.isOpen"
    type="button"
  >
    <span data-wp-text="context.isOpen ? 'Hide' : 'Show'"></span>
  </button>
  <div data-wp-bind--hidden="!context.isOpen">
    <?php echo $content; ?>
  </div>
</div>
```

### 4. view.js

```javascript
import { store, getContext } from '@wordpress/interactivity';

const { state } = store('myplugin/my-block', {
  state: {
    count: 0,
    get doubleCount() {
      return state.count * 2;
    },
  },
  actions: {
    toggle() {
      const ctx = getContext();
      ctx.isOpen = !ctx.isOpen;
    },
  },
});
```

## Directive Reference

All directives use `data-wp-*` prefix. Values are **references** to store properties (state, context, actions, callbacks), never JS expressions.

### Namespace & Context

| Directive | Purpose | Example |
|-----------|---------|---------|
| `data-wp-interactive` | Activate namespace (required wrapper) | `="vendor/block"` |
| `data-wp-context` | Local state scoped to element tree | `='{"isOpen": false}'` |

```html
<div data-wp-interactive="myplugin/block"
     data-wp-context='{"id": 1, "isOpen": false}'>
  <!-- children can reference this store and context -->
</div>
```

PHP helper for context (handles escaping):
```php
<div <?php echo wp_interactivity_data_wp_context(['id' => $id, 'isOpen' => false]); ?>>
```

### Attribute Binding

| Directive | Purpose | Example |
|-----------|---------|---------|
| `data-wp-bind--[attr]` | Set HTML attribute | `--hidden="!state.visible"` |
| `data-wp-class--[name]` | Toggle CSS class (use kebab-case) | `--is-active="context.active"` |
| `data-wp-style--[prop]` | Set inline CSS property | `--color="state.textColor"` |
| `data-wp-text` | Set text content (auto-escapes HTML) | `="state.message"` |

```html
<button data-wp-bind--disabled="state.isLoading"
        data-wp-bind--aria-expanded="context.isOpen"
        data-wp-class--is-active="context.isOpen">
  <span data-wp-text="context.isOpen ? 'Close' : 'Open'"></span>
</button>
<div data-wp-bind--hidden="!context.isOpen"
     data-wp-style--opacity="state.contentOpacity">
  Content
</div>
```

**ARIA booleans** become string `"true"`/`"false"` (not removed):
```html
<button data-wp-bind--aria-expanded="context.isOpen">
```

### Event Handlers

| Directive | Purpose | When to Use |
|-----------|---------|-------------|
| `data-wp-on-async--[event]` | Async handler (yields to main thread) | **Default choice** — better INP scores |
| `data-wp-on--[event]` | Sync handler | Only when needing `preventDefault()`, `stopPropagation()`, `currentTarget` |
| `data-wp-on-window--[event]` | Window listener | Resize, scroll, global keydown |
| `data-wp-on-document--[event]` | Document listener | Outside clicks, global events |

```html
<!-- Preferred: async for non-blocking -->
<button data-wp-on-async--click="actions.logClick">

<!-- Sync: when you need event methods (must wrap with withSyncEvent) -->
<form data-wp-on--submit="actions.handleSubmit">
<a data-wp-on--click="actions.navigate">

<!-- Window/Document -->
<div data-wp-on-window--resize="callbacks.handleResize">
<div data-wp-on-document--keydown="callbacks.handleEscape">

<!-- Async variants for window/document -->
<div data-wp-on-async-window--scroll="callbacks.handleScroll">
```

### Lifecycle

| Directive | Purpose | Cleanup |
|-----------|---------|---------|
| `data-wp-init` | Runs once on mount | Return function for cleanup |
| `data-wp-watch` | Runs on mount AND when referenced state changes | Return function for cleanup before next run |
| `data-wp-run` | Enables Preact hooks (advanced) | Via useEffect cleanup |

```html
<div data-wp-init="callbacks.setup"
     data-wp-watch="callbacks.syncExternal">
```

```javascript
callbacks: {
  setup() {
    const observer = new IntersectionObserver(/*...*/);
    observer.observe(getElement().ref);
    return () => observer.disconnect(); // Cleanup
  },
  syncExternal() {
    const { count } = getContext();
    externalLib.update(count);
    return () => externalLib.cleanup(); // Runs before next invocation
  }
}
```

### Iteration

```html
<ul>
  <template data-wp-each="state.items">
    <li data-wp-text="context.item.name"></li>
  </template>
</ul>

<!-- Custom variable name -->
<template data-wp-each--product="state.products">
  <li data-wp-text="context.product.title"></li>
</template>

<!-- With key for efficient updates -->
<template data-wp-each--item="state.items"
          data-wp-each-key="context.item.id">
  <li data-wp-text="context.item.name"></li>
</template>
```

### Unique Directive IDs (6.9+)

Multiple directives of same type use triple-dash `---` suffix:

```html
<div data-wp-watch---analytics="callbacks.trackView"
     data-wp-watch---logging="callbacks.logState">
```

### Cross-Namespace References

```html
<div data-wp-interactive="myPlugin">
  <span data-wp-text="shop/cart::state.itemCount"></span>
  <button data-wp-on-async--click="shop/cart::actions.addItem">Add</button>
</div>
```

## Store API

### Core Functions

| Function | Purpose |
|----------|---------|
| `store(namespace, definition)` | Create/extend a store (multiple calls merge) |
| `getContext()` | Local context for current element |
| `getElement()` | DOM ref + attributes (`{ ref, attributes }`) |
| `getServerState()` | Read-only original server state (6.7+) |
| `getServerContext()` | Read-only original server context (6.7+) |
| `getConfig()` | Static config from `wp_interactivity_config()` |

### Store Structure

```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';

const { state, actions } = store('myplugin/block', {
  // Global state (shared across all instances)
  state: {
    count: 0,
    items: [],
    filter: '',

    // Derived state (getters) — auto-updates when dependencies change
    get itemCount() {
      return state.items.length;
    },
    get filteredItems() {
      return state.items.filter(i => i.name.includes(state.filter));
    },
    // Context-aware derived state
    get isSelected() {
      const { id } = getContext();
      return state.selectedId === id;
    },
  },

  // State mutations
  actions: {
    increment() {
      state.count++;
    },
    toggle() {
      const ctx = getContext();
      ctx.isOpen = !ctx.isOpen;
    },
    // ASYNC: Must use generator functions
    *fetchData() {
      state.loading = true;
      try {
        const response = yield fetch('/wp-json/wp/v2/posts');
        const data = yield response.json();
        state.items = data;
      } catch (e) {
        state.error = e.message;
      } finally {
        state.loading = false;
      }
    },
  },

  // Side effects
  callbacks: {
    onMount() {
      console.log('Mounted');
      return () => console.log('Cleanup');
    },
  },
});
```

### State Types

| Type | Scope | How to Define | How to Access |
|------|-------|---------------|---------------|
| Global state | All instances, persists across nav | `state: {}` in store | `state.prop` |
| Context | Single element tree, resets on nav | `data-wp-context` in HTML | `getContext().prop` |
| Derived | Computed from state | `get prop() {}` in state | `state.prop` |
| Server state | Read-only original values | PHP `wp_interactivity_state()` | `getServerState()` |
| Server context | Read-only original values | PHP `wp_interactivity_data_wp_context()` | `getServerContext()` |
| Config | Static, not reactive | PHP `wp_interactivity_config()` | `getConfig()` |

## Critical Patterns

### ⚠️ Async Actions MUST Use Generator Functions

**This is the #1 source of bugs.** `async/await` breaks the Interactivity API's scope tracking. Always use `function*` generators with `yield`.

```javascript
// ❌ WRONG — context lost after await
async fetchData() {
  const ctx = getContext();     // OK here
  await fetch('/api');
  ctx.items = data;             // BROKEN — wrong context!
}

// ✅ CORRECT — generators preserve scope across yields
*fetchData() {
  const ctx = getContext();     // OK
  const response = yield fetch('/api');
  const data = yield response.json();
  ctx.items = data;             // Still correct context ✓
}
```

### ⚠️ withSyncEvent() Required for Event Methods (6.8+)

Any action using `event.preventDefault()`, `event.stopPropagation()`, or `event.currentTarget` **must** be wrapped:

```javascript
import { store, withSyncEvent, splitTask } from '@wordpress/interactivity';

store('ns/block', {
  actions: {
    handleSubmit: withSyncEvent(function*(event) {
      event.preventDefault();       // Works because of withSyncEvent
      event.stopPropagation();
      const form = event.currentTarget;
      const formData = new FormData(form);

      yield splitTask();            // Yield to main thread after sync work

      // Continue with async operations
      yield fetch('/api', { method: 'POST', body: formData });
    }),

    // Non-generator version for simple sync-only handlers
    handleClick: withSyncEvent((event) => {
      event.preventDefault();
      // Sync-only work here
    }),
  },
});
```

### withScope() for External Callbacks

Preserves context in `setTimeout`, `setInterval`, event listeners, etc.:

```javascript
import { store, withScope, getContext } from '@wordpress/interactivity';

store('ns/block', {
  callbacks: {
    startTimer() {
      setInterval(
        withScope(() => {
          const ctx = getContext(); // Correct context ✓
          ctx.elapsed++;
        }),
        1000
      );
    },
  },
});
```

### Private Stores

```javascript
const { state } = store('ns/private', { state: { internal: 'value' } }, { lock: true });

// Or with shared key
const KEY = Symbol('key');
store('ns/private', { state: {} }, { lock: KEY });
// Other module: store('ns/private', {}, { lock: KEY }); // Access granted
```

## Client-Side Navigation (Interactivity Router)

The `@wordpress/interactivity-router` package (~3KB) enables SPA-like navigation by updating designated "router regions" without full page reloads.

### Router Setup

**block.json** must declare `clientNavigation: true`:
```json
{
  "supports": {
    "interactivity": {
      "clientNavigation": true,
      "interactive": true
    }
  }
}
```

**render.php** — wrap updatable content in a router region:
```php
<div data-wp-interactive="myplugin/posts"
     data-wp-router-region="posts-list"
     <?php echo get_block_wrapper_attributes(); ?>>
  <!-- This content updates on client navigation -->
  <?php while (have_posts()) : the_post(); ?>
    <article><?php the_title(); ?></article>
  <?php endwhile; ?>

  <a href="<?php echo get_pagenum_link($page + 1); ?>"
     data-wp-on--click="actions.navigate"
     data-wp-on-async--mouseenter="actions.prefetch">
    Next Page
  </a>
</div>
```

**view.js** — navigate and prefetch:
```javascript
import { store, getElement, withSyncEvent } from '@wordpress/interactivity';

store('myplugin/posts', {
  actions: {
    navigate: withSyncEvent(function*(event) {
      event.preventDefault();
      const { actions } = yield import('@wordpress/interactivity-router');
      yield actions.navigate(event.target.href);
    }),

    prefetch: async () => {
      const { ref } = getElement();
      const { actions } = await import('@wordpress/interactivity-router');
      actions.prefetch(ref.href);
    },
  },
});
```

### navigate() Options

```javascript
yield actions.navigate(url, {
  force: false,              // Bypass cache, re-fetch
  replace: false,            // Replace history entry (don't push)
  timeout: 10000,            // Abort after ms
  loadingAnimation: true,    // Show loading bar
  screenReaderAnnouncement: true,  // Announce to assistive tech
  html: null,                // Use provided HTML instead of fetching
});
```

### Router Region Matching

| Current Page | Target Page | Result |
|-------------|-------------|--------|
| Region A exists | Region A exists | Content **replaced** |
| Region A exists | Region A missing | Region **removed** |
| Region A missing | Region A exists (no `attachTo`) | Region **NOT added** |
| Region A missing | Region A exists (with `attachTo`) | Region **created & appended** |

### Dynamic Regions with attachTo (6.9+)

Create regions on-the-fly for modals, overlays, toast notifications:

```html
<div data-wp-interactive="shop"
     data-wp-router-region='{"id": "cart-modal", "attachTo": "body"}'>
  <div class="modal">Cart Contents</div>
</div>
```

### Router Navigation State

```javascript
const { state } = store('core/router');
// state.url — current URL (reactive)
// state.navigation.hasStarted — true when navigation begins
// state.navigation.hasFinished — true when complete

store('myblock', {
  state: {
    get isNavigating() {
      const routerState = store('core/router').state;
      return routerState.navigation.hasStarted &&
             !routerState.navigation.hasFinished;
    },
  },
});
```

### CSS Loading State

```css
body.wp-interactivity-router-loading [data-wp-router-region] {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.2s;
}
```

### State Synchronization After Navigation

Global state **persists** across navigation. Context within router regions is **reset** to server values.

**6.9 behavior**: Server state/context **fully replaces** on navigation (properties not on new page are removed).

Use `getServerState()` and `getServerContext()` to access fresh server values:

```javascript
import { store, getContext, getServerContext, getServerState } from '@wordpress/interactivity';

store('myblock', {
  callbacks: {
    syncAfterNav() {
      const ctx = getContext();
      const serverCtx = getServerContext();
      ctx.items = serverCtx.items;
      ctx.page = serverCtx.page;
    },
  },
});
```

### Automatic Asset Loading (6.9+)

Script modules and stylesheets required by blocks on the navigated page load automatically. No manual handling needed.

## Server-Side PHP

### wp_interactivity_state()

Initialize global state from PHP. Called in render.php or a hook.

```php
wp_interactivity_state('myplugin/block', [
  'items'    => get_posts(['post_type' => 'product']),
  'nonce'    => wp_create_nonce('my_action'),
  'ajaxUrl'  => admin_url('admin-ajax.php'),
  // Derived state via closure
  'isInCart' => function() {
    $ctx   = wp_interactivity_get_context();
    $state = wp_interactivity_state();
    return in_array($ctx['productId'], $state['cartItems'] ?? []);
  },
]);
```

### wp_interactivity_config()

Static config (not reactive, never changes client-side):

```php
wp_interactivity_config('myplugin/block', [
  'apiEndpoint' => rest_url('myplugin/v1/'),
  'maxItems'    => 100,
]);
```

### wp_interactivity_data_wp_context()

Safe JSON encoding for the context attribute:

```php
<div <?php echo wp_interactivity_data_wp_context([
  'postId' => get_the_ID(),
  'title'  => get_the_title(),
]); ?>>
```

### wp_interactivity_process_directives()

Process directives for non-block HTML (shortcodes, classic themes):

```php
$html = '<div data-wp-interactive="ns/block"><span data-wp-text="state.msg"></span></div>';
echo wp_interactivity_process_directives($html);
```

## TypeScript Support

### Typed Context

```typescript
type MyContext = {
  isOpen: boolean;
  itemId: number;
  items: Array<{ id: number; name: string }>;
};

store('ns/block', {
  actions: {
    toggle() {
      const ctx = getContext<MyContext>();
      ctx.isOpen = !ctx.isOpen;
    },
  },
});
```

### Async Action Types (6.9+)

```typescript
import { store, type AsyncAction, type TypeYield } from '@wordpress/interactivity';

store('ns/block', {
  actions: {
    *fetchData(): AsyncAction<number> {
      const response = yield fetch('/api');
      const data = (yield response.json()) as TypeYield<typeof response.json>;
      return data.count;
    },
  },
});
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `async/await` in actions | Use `function*` generators with `yield` |
| `preventDefault()` without wrapper | Wrap handler in `withSyncEvent()` |
| Context wrong in setTimeout/setInterval | Use `withScope()` |
| camelCase class names in `data-wp-class` | Use kebab-case: `--is-open` |
| Using actions in attribute bindings | Use derived state getters instead |
| Accessing `getElement().ref` during render | Check for null; use in `wp-init` |
| Missing `clientNavigation: true` | Add to block.json supports for router |
| Router region ID mismatch between pages | Use identical `data-wp-router-region` values |
| Expecting state overwrite after nav (pre-6.9) | Use `getServerState()`/`getServerContext()` |
| Putting JS expressions in directive values | Only store references work (state.x, context.y) |
| Using in the block editor | Interactivity API is frontend-only |

## Implementation Templates

Complete working examples in `assets/templates/`:

| Template | Use Case | Key Features |
|----------|----------|--------------|
| `basic-toggle/` | Show/hide content | Context, bind, class, aria |
| `modal-dialog/` | Dialog with backdrop | Native `<dialog>`, focus trap, ESC, body scroll lock |
| `filter-search/` | Live filtering | Debounce, abort controller, async fetch, each directive |
| `form-handling/` | Form with validation | withSyncEvent, splitTask, field validation, nonce |
| `cross-block-state/` | Shared cart/wishlist | Multiple blocks sharing one store, derived state |
| `client-navigation/` | Paginated posts | Router region, prefetch on hover, loading state |
| `infinite-scroll/` | Load on scroll | Intersection Observer, router, append content |
| `tabbed-filter/` | Filter with URL updates | replace history, category tabs, a11y announcements |
| `modal-overlay/` | Modal from other page | attachTo, dynamic region creation (6.9+) |

**Replace `NAMESPACE` in templates** with your actual plugin namespace (e.g., `myplugin/block-name`).

## References

Detailed documentation for deep dives:

- **`references/directives.md`** — Complete directive syntax, all variants, SSR notes
- **`references/store-api.md`** — All functions, TypeScript types, async patterns, private stores, cleanup
- **`references/client-navigation.md`** — Router overview, regions, navigate/prefetch, pagination/search patterns
- **`references/router-api.md`** — Full API signatures, NavigateOptions, PrefetchOptions, TypeScript definitions, error types
- **`references/region-behavior.md`** — Region matching algorithm, attachTo, nested regions, lifecycle, asset handling
- **`references/state-management.md`** — State persistence, sync patterns, server state, loading states
- **`references/accessibility.md`** — Screen readers, focus management, ARIA, keyboard nav, reduced motion
- **`references/version-history.md`** — Changes from 6.5 → 6.9, migration guides

## Scaffolding

```bash
npx @wordpress/create-block@latest my-block \
  --template @wordpress/create-block-interactive-template
```
