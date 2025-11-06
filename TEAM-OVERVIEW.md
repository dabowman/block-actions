# Block Actions Plugin - Team Overview

## What Is It?

Block Actions is a WordPress plugin that lets you add lightweight JavaScript interactions to core blocks **without writing custom blocks**. Think of it as "progressive enhancement" for the block editor.

Instead of creating dozens of custom blocks for simple interactions, you assign reusable "actions" to existing blocks (like Buttons and Groups) through a dropdown in the editor.

---

## 🎯 Key Benefits

### 1. **No Custom Blocks Needed**
- Use core WordPress blocks
- Add interactivity through the Advanced panel
- No need to maintain custom block code

### 2. **Theme-Based Extensibility** 🌟
- **Add actions without rebuilding the plugin**
- Drop JavaScript files in your theme's `/actions` folder
- Actions automatically appear in the editor
- Perfect for project-specific interactions

### 3. **Built-In Security & Best Practices**
- XSS protection with DOMPurify
- Rate limiting to prevent spam
- Nonce verification for API requests
- WordPress security standards baked in

### 4. **Developer-Friendly**
- Simple API: just register an action with one function call
- Comprehensive documentation and examples
- Access to utility class (BaseAction) with helpers
- No build process required for theme actions

---

## 🚀 How It Works

### For Content Editors:

1. **Select a Button or Group block** in the editor
2. **Open Advanced settings** panel
3. **Choose an action** from the dropdown (e.g., "Smooth Scroll")
4. **Add any configuration** via data attributes if needed
5. **Publish** - the action runs on the frontend automatically

Simple as that. No code required.

### For Developers:

**Adding a theme action is 3 steps:**

1. **Create a file** in `/wp-content/themes/your-theme/actions/my-action.js`

2. **Write your action:**
```javascript
(function() {
    const { BaseAction } = window.BlockActions;
    
    function init(element) {
        const action = new BaseAction(element);
        
        action.target.addEventListener('click', (e) => {
            e.preventDefault();
            action.executeWithRateLimit(() => {
                // Your code here
            });
        });
    }
    
    window.BlockActions.registerAction(
        'my-action',
        'My Custom Action',
        init
    );
})();
```

3. **That's it!** The action automatically:
   - ✅ Appears in the block editor
   - ✅ Executes on the frontend
   - ✅ Has access to security features
   - ✅ Works without rebuilding anything

---

## 📦 What's Included

### Built-In Actions:
- **Carousel** - Image galleries with thumbnails and navigation
- **Scroll to Top** - Smooth scroll back to page top

### Example Actions (Copy & Use):
- **Smooth Scroll** - Navigate to page sections
- **Modal Toggle** - Open/close dialogs
- **Toggle Visibility** - Show/hide elements
- **Copy to Clipboard** - One-click text copying
- **Alert Message** - Simple notifications
- **Plus templates** - Boilerplate for creating your own

All examples are production-ready and fully documented.

---

## 🎨 Real-World Use Cases

### Marketing Sites:
- Smooth scroll navigation
- "Back to top" buttons
- FAQ accordions
- Modal CTAs
- Copy coupon codes

### E-Commerce:
- Product image carousels
- Size chart modals
- Copy product codes
- Quick view overlays
- Filter toggles

### Content Sites:
- Table of contents navigation
- Read more expanders
- Share buttons
- Search toggles
- Mobile menu controls

### Custom Applications:
- Form step navigation
- Tab interfaces
- Slideout panels
- Interactive calculators
- Anything that needs JS interaction

---

## 🛠️ Technical Features

### BaseAction Utilities:
| Feature | What It Does |
|---------|-------------|
| `setTextContent()` | Update text with XSS protection |
| `setStyle()` | Safely change CSS with validation |
| `executeWithRateLimit()` | Prevent spam/rapid clicking |
| `log()` | Debug logging (respects WP_DEBUG) |
| `apiRequest()` | Authenticated WordPress API calls |
| `reset()` | Restore element to original state |

### Security Features:
- ✅ XSS protection via DOMPurify
- ✅ Rate limiting (5 executions/second default)
- ✅ Input validation for CSS properties
- ✅ Nonce verification for AJAX
- ✅ Optional CSP headers

### Performance:
- Lazy initialization (only loads when blocks use actions)
- requestAnimationFrame for animations
- Efficient event delegation
- No jQuery dependency
- Minimal bundle size

---

## 📚 Documentation

Comprehensive docs included:

1. **README.md** - Plugin overview and quick start
2. **THEME-ACTIONS.md** - Complete guide for creating theme actions
3. **EXAMPLES.md** - 7+ working examples with explanations
4. **API Reference** - Full method documentation

Plus inline code comments and JSDoc throughout.

---

## 🎯 Who Should Use This?

### Perfect For:
- ✅ Teams building WordPress sites with Gutenberg
- ✅ Agencies managing multiple client sites
- ✅ Developers who want to avoid custom block overhead
- ✅ Projects needing simple, reusable interactions
- ✅ Anyone tired of writing the same JS over and over

### Not Ideal For:
- ❌ Complex React-based interactions (use custom blocks)
- ❌ Full SPAs (use proper framework)
- ❌ When you need block previews in editor (actions are frontend-only)

---

## 🚦 Getting Started

### Installation:
```bash
1. Clone/download the plugin
2. Run: npm install
3. Run: npm run build
4. Activate in WordPress
```

### First Action (2 minutes):
```bash
1. Create: wp-content/themes/your-theme/actions/
2. Copy: docs/examples/alert-message.js
3. Test in block editor
```

### Learn More:
- Start with: `docs/EXAMPLES.md`
- Full guide: `docs/THEME-ACTIONS.md`
- See examples in: `docs/examples/`

---

## 💡 Development Approach

This plugin follows WordPress best practices:

- **Modular** - Actions are self-contained
- **Extensible** - Filter for custom action directories
- **Accessible** - ARIA attributes and keyboard support
- **Secure** - Multiple layers of protection
- **Performant** - Optimized loading and execution
- **Standards-Compliant** - WordPress coding standards
- **Well-Documented** - Extensive guides and examples

---

## 🎓 Key Concepts

### Actions vs. Custom Blocks

| Feature | Custom Blocks | Block Actions |
|---------|--------------|---------------|
| **Development Time** | Hours-days per block | Minutes per action |
| **Maintenance** | Register, render, save, edit | Single init function |
| **Editor Preview** | ✅ Shows in editor | ❌ Frontend only |
| **Reusability** | One block = one purpose | One action = many blocks |
| **Build Process** | Always required | Not for theme actions |
| **Best For** | Complex UI components | Simple interactions |

### When to Use Each:

**Use Custom Blocks when:**
- You need editor previews
- Complex layout structures
- Multiple configuration options
- Heavy React interactivity

**Use Block Actions when:**
- Simple click interactions
- DOM manipulation
- Progressive enhancement
- Quick wins without overhead

---

## 📊 Project Status

- ✅ **Version:** 1.0.0
- ✅ **WordPress:** 6.0+ tested
- ✅ **PHP:** 8.0+ required
- ✅ **Dependencies:** WordPress core only
- ✅ **License:** GPL-2.0-or-later
- ✅ **Tests:** Jest setup with test suites
- ✅ **Documentation:** Complete

---

## 🤝 Team Workflow

### For Content Editors:
1. Select block in editor
2. Choose action from dropdown
3. Add any needed data attributes
4. Publish

### For Developers:
1. Create action file in theme
2. Test in dev environment
3. Commit to theme repo
4. Deploy with theme

### For DevOps:
1. Plugin stays constant across sites
2. Theme-specific actions travel with theme
3. No plugin rebuilds needed
4. Easy to version control

---

## 🎉 Why This Is Cool

1. **It solves a real problem** - Most sites need simple JS interactions, not complex blocks
2. **It's extensible** - Add actions without touching the plugin
3. **It's reusable** - Write once, use on any block
4. **It's maintainable** - Clean separation of concerns
5. **It's fast to use** - From idea to implementation in minutes
6. **It's well-documented** - Everything you need to succeed

---

## Questions?

- 📖 **Read:** `docs/THEME-ACTIONS.md` for complete guide
- 👀 **See:** `docs/examples/` for working code
- 🎯 **Try:** Copy an example to your theme and test
- 💬 **Ask:** Team chat or GitHub issues

---

**Let's build better, faster!** 🚀

*The plugin that makes simple interactions simple again.*

