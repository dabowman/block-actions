# Theme Action Examples

Ready-to-use examples for creating custom theme actions. Copy any of these to your theme's `/actions` folder to get started.

> All examples use the Interactivity API `store()` pattern. Theme actions must be ES modules using `@wordpress/interactivity`.

## Available Examples

### 1. **Boilerplate Action** (`boilerplate-action.js`)
**Perfect for:** Creating your first action
**Complexity:** Beginner

The essential template with detailed comments explaining every part. Start here!

**What it does:**
- Provides complete structure with comments
- Shows basic click handling with context state
- Demonstrates CSS class toggling
- Shows cleanup function pattern

**Copy this when:** You're creating a brand new action from scratch.

---

### 2. **Alert Message** (`alert-message.js`)
**Perfect for:** Understanding the basics
**Complexity:** Beginner

The simplest possible working action - just shows an alert.

**What it does:**
- Shows browser alert on click
- Reads custom message from data attribute
- Updates button text with feedback

**Learn from this:**
- Basic action structure
- Data attribute usage
- User feedback patterns

---

### 3. **Toggle Visibility** (`toggle-visibility.js`)
**Perfect for:** Show/hide interactions
**Complexity:** Intermediate

Toggles the visibility of a target element.

**What it does:**
- Shows/hides element by ID
- Tracks visibility state in context
- Updates button text dynamically
- Sets `aria-controls` and `aria-expanded` for accessibility

**Use cases:**
- Toggle navigation menus
- Show/hide forms
- Expand/collapse content sections
- FAQ accordions

---

### 4. **Copy to Clipboard** (`copy-to-clipboard.js`)
**Perfect for:** Browser API interaction
**Complexity:** Intermediate

Copies text to user's clipboard with visual feedback.

**What it does:**
- Uses Clipboard API
- Generator function for async flow
- Success/error feedback
- Temporary button styling

**Use cases:**
- Copy coupon codes
- Share URLs
- Copy email addresses
- Code snippet copying

---

### 5. **Smooth Scroll** (`smooth-scroll.js`)
**Perfect for:** Navigation actions
**Complexity:** Intermediate

Smoothly scrolls to a target element on the page.

**What it does:**
- Smooth scrolling to element by ID
- Optional offset for fixed headers
- Loading state feedback
- Error handling

**Use cases:**
- Jump to section links
- Scroll to top/bottom
- Navigation within long pages
- Back to top buttons

---

### 6. **Modal Toggle** (`modal-toggle.js`)
**Perfect for:** Complex interactions
**Complexity:** Advanced

Opens and closes a native `<dialog>` element. The browser handles focus
trap, ESC to close, and focus restore; the action layers on body scroll
lock, backdrop-click to close, and close-button helpers.

**Target markup** — the modal must be a `<dialog>`:

```html
<dialog id="my-modal">
  <div class="modal-content">
    <h2 id="my-modal-title">Title</h2>
    <p>Body.</p>
    <button class="modal-close">&times;</button>
  </div>
</dialog>
```

**What it does:**
- Opens the dialog via `showModal()` (modal semantics + top layer → free focus trap)
- Closes via button click, backdrop click, ESC, or programmatic `close()`
- Body scroll lock while any modal is open; original overflow restored when the last closes
- Adds `aria-labelledby` pointing at the first heading if the author didn't set one

**Use cases:**
- Contact forms
- Image lightboxes
- Video players
- Cookie notices

---

## Quick Start Guide

### Step 1: Choose an Example

Pick an example based on what you want to build:

- **First action?** → Start with `boilerplate-action.js`
- **Simple interaction?** → Use `alert-message.js` or `toggle-visibility.js`
- **API interaction?** → Check out `copy-to-clipboard.js`
- **Advanced UI?** → Try `modal-toggle.js` or `smooth-scroll.js`

### Step 2: Copy to Your Theme

```bash
# Navigate to your theme
cd wp-content/themes/your-theme

# Create actions folder if it doesn't exist
mkdir -p actions

# Copy the example (rename as needed)
cp /path/to/docs/examples/boilerplate-action.js actions/my-action.js
```

### Step 3: Customize

1. Open the file in your editor
2. Update the store namespace to match your action ID (`block-actions/my-action`)
3. Modify the `actions` and `callbacks` with your logic
4. Save the file

### Step 4: Test

1. Refresh your WordPress admin
2. Open the block editor
3. Select a Button or Group block
4. Look for your action in the dropdown
5. Test on the frontend!

---

## Common Patterns

### Reading Data Attributes

```javascript
callbacks: {
    init() {
        const ctx = getContext();
        const { ref } = getElement();
        ctx.targetId = ref.getAttribute( 'data-target' ) || '';

        return () => {};
    },
},
```

### Finding Target Elements

```javascript
const target = document.getElementById( ctx.targetId );
if ( ! target ) {
    return; // Silently skip if target doesn't exist
}
```

### State Management

```javascript
// Use context for per-instance state
actions: {
    handleClick( event ) {
        event.preventDefault();
        const ctx = getContext();
        ctx.isActive = ! ctx.isActive;
    },
},
state: {
    get activeClass() {
        return getContext().isActive ? 'is-active' : '';
    },
},
```

### Cleanup on Destroy

```javascript
callbacks: {
    init() {
        const { ref } = getElement();
        const myInterval = setInterval( () => { /* ... */ }, 1000 );
        const observer = new IntersectionObserver( /* ... */ );
        observer.observe( ref );

        return () => {
            clearInterval( myInterval );
            observer.disconnect();
        };
    },
},
```

---

## Full Documentation

For complete API reference and detailed guides, see:
- [Theme Actions Guide](THEME-ACTIONS.md) - Complete documentation
- [Main README](../README.md) - Plugin overview
- [Carousel Action](carousel-action.md) - Detailed carousel documentation

---

## Example Combinations

### "Read More" Expander
Use reactive state to toggle text:
```javascript
state: {
    get buttonText() {
        return getContext().isVisible ? 'Read Less' : 'Read More';
    },
},
```

### Copy with Modal Confirmation
Combine clipboard and modal patterns:
```javascript
actions: {
    *handleCopyAndConfirm( event ) {
        event.preventDefault();
        yield navigator.clipboard.writeText( getContext().text );
        getContext().showModal = true;
    },
},
```

---

## Pro Tips

1. **Return cleanup functions** - Always clean up observers, timers, and listeners in `callbacks.init()`
2. **Use context for state** - Per-instance state belongs in context, not module variables
3. **Handle missing elements** - Check for null from `getElementById()` before using
4. **Use generator functions** - For async operations, use `function*` with `yield` (never `async/await`)
5. **Use `textContent`** - Never use `innerHTML` for user-provided data
6. **Use data attributes** - Make actions configurable without code changes

---

## Troubleshooting

### Action not appearing in editor?
- Check filename matches action ID
- Verify file is in `/wp-content/themes/[active-theme]/actions/`
- Check browser console for errors
- Try clearing browser cache

### Action not executing?
- Check browser console for errors
- Verify `data-action` attribute is on the block
- Ensure store namespace matches `block-actions/<action-id>`
- Enable `WP_DEBUG` to see logs

### Target element not found?
- Verify the element ID exists in your page HTML
- Check spelling of `data-target` attribute
- Use browser DevTools to inspect the DOM
