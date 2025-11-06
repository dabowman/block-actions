# Theme Action Examples

Ready-to-use examples for creating custom theme actions. Copy any of these to your theme's `/actions` folder to get started.

## 📚 Available Examples

### 1. **Boilerplate Action** (`boilerplate-action.js`)
**Perfect for:** Creating your first action  
**Complexity:** ⭐ Beginner

The essential template with detailed comments explaining every part. Start here!

**What it does:**
- Provides complete structure with comments
- Shows basic click handling
- Demonstrates rate limiting
- Includes logging examples

**Copy this when:** You're creating a brand new action from scratch.

---

### 2. **Alert Message** (`alert-message.js`)
**Perfect for:** Understanding the basics  
**Complexity:** ⭐ Beginner

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
**Complexity:** ⭐⭐ Intermediate

Toggles the visibility of a target element.

**What it does:**
- Shows/hides element by ID
- Tracks visibility state
- Updates button text dynamically
- Error handling for missing elements

**Learn from this:**
- State management
- DOM manipulation
- Error handling patterns
- Data attributes for configuration

**Use cases:**
- Toggle navigation menus
- Show/hide forms
- Expand/collapse content sections
- FAQ accordions

---

### 4. **Copy to Clipboard** (`copy-to-clipboard.js`)
**Perfect for:** Browser API interaction  
**Complexity:** ⭐⭐ Intermediate

Copies text to user's clipboard with visual feedback.

**What it does:**
- Uses Clipboard API
- Async/await pattern
- Success/error feedback
- Temporary button styling

**Learn from this:**
- Async operations
- Error handling with try/catch
- Visual feedback techniques
- Modern browser APIs

**Use cases:**
- Copy coupon codes
- Share URLs
- Copy email addresses
- Code snippet copying

---

### 5. **Smooth Scroll** (`smooth-scroll.js`)
**Perfect for:** Navigation actions  
**Complexity:** ⭐⭐ Intermediate

Smoothly scrolls to a target element on the page.

**What it does:**
- Smooth scrolling to element by ID
- Optional offset for fixed headers
- Loading state feedback
- Error handling

**Learn from this:**
- Position calculations
- Scroll API usage
- Timing feedback
- Configuration via data attributes

**Use cases:**
- Jump to section links
- Scroll to top/bottom
- Navigation within long pages
- Back to top buttons

---

### 6. **Modal Toggle** (`modal-toggle.js`)
**Perfect for:** Complex interactions  
**Complexity:** ⭐⭐⭐ Advanced

Opens and closes modals with accessibility features.

**What it does:**
- Opens modal by ID
- Multiple close methods (button, backdrop, escape key)
- Focus management
- Body scroll lock
- Accessibility attributes

**Learn from this:**
- Complex event management
- Accessibility patterns
- Focus handling
- Multiple interaction methods

**Use cases:**
- Contact forms
- Image lightboxes
- Video players
- Cookie notices

---

### 7. **Homepage Carousel** (`homepage-carousel.js` / `homepage-carousel-enhanced.js`)
**Perfect for:** Continuous animations  
**Complexity:** ⭐⭐⭐⭐ Advanced

Continuously scrolling carousel with cloning for seamless loops.

**What it does:**
- Infinite scroll animation
- Opacity effects based on position
- Automatic cloning for seamless loop
- Window resize handling
- requestAnimationFrame for smooth performance

**Learn from this:**
- Animation loops
- DOM cloning
- Performance optimization
- Position calculations
- Cleanup patterns

**Use cases:**
- Hero sections
- Logo carousels
- Image galleries
- Testimonial sliders

---

## 📋 Quick Start Guide

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
2. Update the action ID and label at the bottom
3. Modify the `init()` function with your logic
4. Save the file

### Step 4: Test

1. Refresh your WordPress admin
2. Open the block editor
3. Select a Button or Group block
4. Look for your action in the dropdown
5. Test on the frontend!

---

## 🎯 Common Patterns

### Reading Data Attributes

```javascript
const customValue = element.getAttribute('data-custom-value');
if (!customValue) {
    action.log('error', 'Missing data-custom-value attribute');
    return;
}
```

### Finding Target Elements

```javascript
const targetId = element.getAttribute('data-target');
const targetElement = document.getElementById(targetId);

if (!targetElement) {
    action.log('error', `Target element #${targetId} not found`);
    return;
}
```

### Providing User Feedback

```javascript
// Change button text temporarily
const originalText = action.originalText;
action.setTextContent('Success! ✓');
setTimeout(() => action.setTextContent(originalText), 2000);

// Change button color
action.setStyle('backgroundColor', '#10b981'); // Green for success
setTimeout(() => action.reset(), 2000);
```

### State Management

```javascript
let isActive = false;

action.target.addEventListener('click', (e) => {
    e.preventDefault();
    
    action.executeWithRateLimit(() => {
        isActive = !isActive;
        element.classList.toggle('is-active', isActive);
        action.log('info', `State changed to: ${isActive}`);
    });
});
```

### Cleanup on Unload

```javascript
function init(element) {
    const action = new BaseAction(element);
    
    // Your setup code...
    const myInterval = setInterval(() => { /* ... */ }, 1000);
    
    // Cleanup
    window.addEventListener('beforeunload', () => {
        clearInterval(myInterval);
        action.log('info', 'Cleaned up resources');
    });
}
```

---

## 📖 Full Documentation

For complete API reference and detailed guides, see:
- [Theme Actions Guide](THEME-ACTIONS.md) - Complete documentation
- [Main README](../README.md) - Plugin overview

---

## 🎨 Example Combinations

### "Read More" Expander
Combine `toggle-visibility.js` pattern with custom text changes:
```javascript
if (isVisible) {
    action.setTextContent('Read Less ▲');
} else {
    action.setTextContent('Read More ▼');
}
```

### Copy with Modal Confirmation
Combine `copy-to-clipboard.js` with `modal-toggle.js`:
```javascript
await navigator.clipboard.writeText(text);
// Then open success modal
document.getElementById('success-modal').removeAttribute('hidden');
```

### Scroll with Animation
Enhance `smooth-scroll.js` with custom animations:
```javascript
window.scrollTo({ top: position, behavior: 'smooth' });
element.classList.add('animating');
setTimeout(() => element.classList.remove('animating'), 1000);
```

---

## 💡 Pro Tips

1. **Always use rate limiting** - Wrap actions in `executeWithRateLimit()`
2. **Log everything** - Use `action.log('info', ...)` for debugging
3. **Handle errors** - Check for missing elements and data attributes
4. **Provide feedback** - Users need to know actions worked
5. **Clean up** - Remove event listeners and intervals on unload
6. **Test edge cases** - What if element doesn't exist? What if data is invalid?
7. **Use data attributes** - Make actions configurable without code changes

---

## 🆘 Troubleshooting

### Action not appearing in editor?
- Check filename matches action ID
- Verify file is in `/wp-content/themes/[active-theme]/actions/`
- Check browser console for errors
- Try clearing browser cache

### Action not executing?
- Check browser console for errors
- Verify `data-action` attribute is on the block
- Enable `WP_DEBUG` to see logs
- Check if rate limiting is blocking (try increasing delay)

### Target element not found?
- Verify the element ID exists in your page HTML
- Check spelling of `data-target` attribute
- Use browser DevTools to inspect the DOM

---

**Happy coding!** 🚀 If you create something cool, consider contributing it back as an example!

