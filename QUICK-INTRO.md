# Block Actions Plugin - Quick Intro

## TL;DR

Add JavaScript interactions to core WordPress blocks **without building custom blocks**. Drop a JS file in your theme, it automatically appears in the editor.

As of v2.0.0, Block Actions also supports the **WordPress Interactivity API** for declarative, reactive frontend behavior with server-side rendering.

**Result:** Build interactive sites faster with less code to maintain.

---

## What Problem Does This Solve?

You know how you often need a button to:
- Scroll to a section
- Toggle a menu
- Open a modal
- Copy text to clipboard

And you end up either:
1. Building a custom block (overkill)
2. Writing one-off jQuery in footer (messy)
3. Using a page builder (vendor lock-in)

**Block Actions fixes this.** It's the middle ground.

---

## How It Works

### For Content Editors (No Code):

1. Add a Button block
2. In Advanced settings, choose "Smooth Scroll"
3. Add `data-target="section-id"`
4. Done. Button now scrolls to that section.

### For Developers (Minimal Code):

**Option 1: Theme Action (IIFE pattern, no build required)**

Create: `/wp-content/themes/your-theme/actions/my-action.js`

```javascript
(function() {
    const { BaseAction } = window.BlockActions;

    function init(element) {
        const action = new BaseAction(element);
        element.addEventListener('click', (e) => {
            e.preventDefault();
            action.executeWithRateLimit(() => {
                // Your code here
                alert('Hello!');
            });
        });
    }

    window.BlockActions.registerAction('my-action', 'My Action', init);
})();
```

**That's it.** No build process, no plugin modification, no custom blocks.

This pattern works in both legacy mode and Interactivity API mode (via the built-in legacy bridge).

**Option 2: Interactivity API Store (v2.0.0)**

For plugin developers building built-in actions, you can use the Interactivity API directly:

```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';
import { getRateLimiter } from '../utils/rate-limiter';

store( 'block-actions/my-action', {
    actions: {
        handleClick( event ) {
            event.preventDefault();
            const { ref } = getElement();
            if ( ! getRateLimiter( ref ).canExecute() ) return;
            // Your reactive action code here
        },
    },
    callbacks: {
        init() {
            // Initialize from context set by PHP renderer
        },
    },
} );
```

This approach requires a PHP renderer and webpack entry but provides fully reactive, server-rendered behavior.

---

## Key Features

- **Theme-Based** - Actions live in your theme, not the plugin
- **No Rebuild** - Drop file in folder, it works
- **Interactivity API** - Opt-in declarative stores with server-side directive injection (v2.0.0)
- **Legacy Bridge** - Existing theme actions work automatically with new system
- **Secure** - XSS protection, rate limiting, nonce verification built-in
- **Simple API** - One function call to register
- **Well-Documented** - Full guides and working examples
- **Battle-Tested** - Security, accessibility, performance baked in

---

## What's Included

### Built-In Actions:
- Carousel (image galleries with buttons, thumbnails, keyboard and touch support)
- Scroll to Top

### Ready-to-Use Examples:
- Smooth Scroll (navigation)
- Modal Toggle (dialogs)
- Toggle Visibility (show/hide)
- Copy to Clipboard
- Alert Message
- Boilerplate template

**All production-ready.** Copy, customize, ship.

---

## Real Use Cases

- **Marketing sites:** Smooth navigation, CTAs, modals
- **E-commerce:** Product carousels, quick views, copy codes
- **Content sites:** Table of contents, read more, share buttons
- **Custom apps:** Tabs, accordions, filters, calculators

---

## Why You'll Love It

1. **Fast** - Minutes to add new interactions
2. **Clean** - No messy jQuery in footer
3. **Reusable** - Write once, use on any block
4. **Maintainable** - Organized, version-controlled actions
5. **Flexible** - Works with any theme, any site
6. **Modern** - Interactivity API support for reactive behavior
7. **Documented** - You won't be guessing

---

## Getting Started (5 minutes)

```bash
# 1. Build the plugin
npm install && npm run build

# 2. Create actions folder in your theme
mkdir wp-content/themes/your-theme/actions

# 3. Copy an example
cp docs/examples/alert-message.js wp-content/themes/your-theme/actions/

# 4. Test in editor - it's already there!
```

**Then:** Read `docs/THEME-ACTIONS.md` for complete guide.

### Enabling the Interactivity API (optional)

1. Go to **Settings > Block Actions** in WordPress admin
2. Check **"Use Interactivity API"**
3. Save. Built-in actions now use reactive stores with server-side rendering.

Existing theme actions continue working via the legacy bridge.

---

## Documentation

**Full Documentation:**
- `README.md` - Overview & installation
- `docs/THEME-ACTIONS.md` - Complete developer guide
- `docs/EXAMPLES.md` - Working examples explained
- `docs/carousel-action.md` - Carousel configuration and styling
- `docs/examples/` - Copy-paste ready code

**Learning Path:**
1. Read this file (you are here!)
2. Try the alert-message example
3. Read EXAMPLES.md
4. Build your own action

---

## Tech Stack

- **WordPress:** 6.6+ (6.0+ for legacy mode only)
- **PHP:** 8.0+
- **JavaScript:** ES6+, no jQuery
- **Build:** webpack via @wordpress/scripts (11 entry points)
- **Interactivity API:** `@wordpress/interactivity` stores + `WP_HTML_Tag_Processor`
- **Security:** DOMPurify, WordPress nonces, WeakMap rate limiting
- **Standards:** WordPress coding standards

---

## The "Aha!" Moment

**Old way:**
1. Need smooth scroll button
2. Build custom "Smooth Scroll Button" block
3. Register block, create edit component, save function
4. Build assets, test in editor
5. Repeat for every interaction type
6. **Result:** 10 custom blocks for 10 simple interactions

**New way:**
1. Need smooth scroll button
2. Create smooth-scroll.js in theme
3. Use core Button block in editor
4. **Result:** 1 reusable action, works on any button

**That's the difference.**

---

## Team Benefits

**Content Editors:**
- Use familiar core blocks
- Simple dropdown to add interactions
- No custom block training needed

**Developers:**
- Write less code
- Organized action library
- Easy to test and debug
- No plugin modifications

**DevOps:**
- Actions deploy with theme
- No plugin rebuilds
- Easy version control
- Clean separation of concerns

**Project Managers:**
- Faster development
- Lower maintenance
- Reusable across projects
- Easy to scope and estimate

---

## Questions You Might Have

**Q: Can I use this with any theme?**
A: Yes! Just create an `/actions` folder.

**Q: Do I need to rebuild the plugin for new actions?**
A: No! That's the whole point. Theme actions = no rebuild.

**Q: What's the difference between legacy and Interactivity API mode?**
A: Legacy uses imperative DOM manipulation. Interactivity API uses declarative stores with server-side rendering. Both produce the same user-facing behavior. The Interactivity API is the WordPress standard going forward.

**Q: Will my existing theme actions break if I enable the Interactivity API?**
A: No. The legacy bridge automatically wraps IIFE-style `registerAction()` calls into Interactivity API stores.

**Q: What if I need editor preview?**
A: Then build a custom block. Actions are for frontend-only interactions.

**Q: Is this production-ready?**
A: Yes. Security, accessibility, and performance are built-in.

**Q: Can I use this with block themes?**
A: Yes! Works with classic or block themes.

**Q: Does it work with other plugins?**
A: Yes. It just adds functionality to core blocks.

---

## Try It Now

```bash
# Quick test (2 minutes)
cd your-theme
mkdir actions
echo '(function(){window.BlockActions.registerAction("test","Test",(el)=>{el.onclick=()=>alert("Works!")})})()' > actions/test.js
# Refresh editor -> select button -> choose "Test" -> click on frontend
```

---

## Status

Version 2.0.0
- Fully documented
- Production tested
- WordPress standards compliant
- Interactivity API support
- 244 tests passing
- Ready to use

---

**Questions?** Check `docs/THEME-ACTIONS.md` or ask the team!
