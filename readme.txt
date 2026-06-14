=== Block Actions ===
Contributors: dabowman
Tags: blocks, gutenberg, actions, interactivity, editor
Requires at least: 7.0
Tested up to: 7.0
Requires PHP: 8.0
Stable tag: 3.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Assign modular actions and data attributes to blocks for lightweight frontend interactivity.

== Description ==

Block Actions lets you add JavaScript interactions to core WordPress blocks (Button, Group) without building custom blocks. Assign reusable "actions" like carousels, modals, smooth scroll, and more through the block editor's Advanced panel.

**Key features:**

* **Theme Actions** — Drop a JS file in your theme's `/actions` folder. No plugin rebuild needed.
* **WordPress Interactivity API** — Declarative stores with server-side directive injection.
* **Security** — Safe HTML manipulation via WP_HTML_Tag_Processor, sanitized context forwarding, escaped output.
* **Accessibility** — Server-rendered ARIA attributes, keyboard navigation, native dialog semantics.

== Installation ==

1. Upload the plugin to `/wp-content/plugins/`.
2. Activate it from Plugins.
3. Build assets if developing: `npm install && npm run build`.

== Frequently Asked Questions ==

= Does this add custom blocks? =
No. It extends existing core blocks (Button, Group) via filters and Advanced panel controls.

= Can I add my own actions without rebuilding the plugin? =
Yes. Create an `/actions` folder in your active theme and add your action JS files there. They are auto-discovered and available in the editor immediately.

= Does it work with block themes? =
Yes. Works with both classic and block themes.

= What happens if I deactivate the plugin? =
The frontend keeps rendering — the saved action attributes are inert without the plugin. Blocks carrying an action will show an invalid-content notice the next time they are edited; reactivate the plugin or use "Attempt recovery" to strip the attributes.

== Screenshots ==
1. Action selector in the block editor.

== Changelog ==

= 3.0.0 =
* Minimum WordPress raised to 7.0 (runtime guard with admin notice on older versions).
* Carousel: the editor's "Wrap Around" toggle now takes effect on the frontend; prev/next buttons get disabled-state bindings for non-wrapping carousels.
* Modal toggle: body scroll-lock bookkeeping is now keyed on the dialog, fixing early unlock when several triggers share one modal.
* Theme actions: action IDs are normalized once at discovery, so mixed-case filenames can't produce mismatched IDs.
* Theme action script modules now load only on pages where a block uses them (on-demand enqueue), instead of on every page.
* Performance: the render_block filter skips a substring-absent fast path before parsing, so action-free blocks cost almost nothing.
* Removed the Content-Security-Policy / security-header feature and its settings page — the plugin is now zero-config. (Security headers belong at the host or a dedicated security plugin. The legacy block_actions_settings option is removed on upgrade.)
* create-action scaffolding regenerated against the current renderer API (previous output was incompatible).
* Distribution zip now includes patterns/, uninstall.php, and readme.txt.
* Removed unused code: DOMPurify sanitizer, rate limiter (preserved as a docs example), unreachable demo stores, unused dependencies.
* Documentation overhaul: all examples use withSyncEvent (required since WP 6.8), carousel CSS guidance fixed (transition: transform), capability claims corrected.

= 2.0.0 =
* Migrated to WordPress Interactivity API with server-side directive injection.
* Added per-action PHP renderers and Directive Transformer.
* Added shared store utilities: rate limiter, sanitizer, API helper.
* Added cleanup returns to init callbacks (Interactivity API best practice).
* Removed legacy frontend system (BaseAction, IIFE actions, frontend.js).

= 1.0.0 =
Initial standalone release. Generic namespaces/handles, i18n, settings, opt-in CSP, refined actions registry, CI.
