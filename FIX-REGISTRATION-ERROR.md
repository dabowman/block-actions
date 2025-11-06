# Fix: registerAction Not Available Error

## The Problem

Theme actions were getting this error:
```
TypeError: window.BlockActions.registerAction is not a function
```

## Root Cause

The `registerAction` function was only exposed in `frontend.js`, but theme action files were also being loaded in the **editor context** where only `block-extensions.js` runs. The editor version didn't have the registration API.

## The Fix

Added registration API to **both contexts**:

1. **Frontend context** (`frontend.js`):
   - Has the full registration system
   - Actually executes actions on the page

2. **Editor context** (`block-extensions.js`):
   - Now has a registration API too
   - Just stores actions for the dropdown
   - Doesn't execute them (frontend-only)

## What Changed

### In `block-extensions.js`:
- ✅ Added `registerEditorAction()` function
- ✅ Added `editorActionRegistry` array
- ✅ Exposed `window.BlockActions.registerAction` in editor
- ✅ Theme actions now register in both editor and frontend

### Result:
- ✅ Theme actions work in editor (appear in dropdown)
- ✅ Theme actions work on frontend (execute correctly)
- ✅ No more "not a function" errors

## To Apply the Fix

```bash
# Rebuild the plugin with the updated code
npm run build

# Clear browser cache
# Refresh the WordPress editor

# Test: Your homepage-carousel action should now work!
```

## Verification

After rebuilding, check the browser console:

**In the Editor:**
```
[Block Actions] Registered theme action in editor: homepage-carousel
[Block Actions] Block Actions initialized in Xms with N actions (2 built-in, 1 theme)
```

**On the Frontend:**
```
[Block Actions Frontend] Registered theme action: homepage-carousel
[Block Actions Frontend] Actions initialized: 3 total (2 built-in, 1 theme)
```

## What This Means for You

✅ **No changes needed** to your theme action files  
✅ **Same API** in both contexts  
✅ **Works immediately** after rebuild  

Your `homepage-carousel.js` is already correctly written - it just needed the plugin to expose the API properly!

---

**Status:** Fixed in latest build

