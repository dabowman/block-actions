=== Block Actions ===
Contributors: dabowman
Tags: blocks, gutenberg, actions, interactivity, editor
Requires at least: 6.6
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Assign modular actions and data attributes to blocks for lightweight frontend interactivity.

== Description ==

Block Actions lets you add JavaScript interactions to core WordPress blocks (Button, Group) without building custom blocks. Assign reusable "actions" like carousels, modals, smooth scroll, and more through the block editor's Advanced panel.

**Key features:**

* **Theme Actions** — Drop a JS file in your theme's `/actions` folder. No plugin rebuild needed.
* **WordPress Interactivity API** — Declarative stores with server-side directive injection.
* **Security** — XSS protection via DOMPurify, nonce verification, rate limiting, optional CSP headers.
* **Accessibility** — Built-in keyboard navigation, ARIA attributes, and focus management.

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

== Screenshots ==
1. Action selector in the block editor.

== Changelog ==

= 2.0.0 =
* Migrated to WordPress Interactivity API with server-side directive injection.
* Added per-action PHP renderers and Directive Transformer.
* Added shared store utilities: rate limiter, sanitizer, API helper.
* Added cleanup returns to init callbacks (Interactivity API best practice).
* Removed legacy frontend system (BaseAction, IIFE actions, frontend.js).

= 1.0.0 =
Initial standalone release. Generic namespaces/handles, i18n, settings, opt-in CSP, refined actions registry, CI.
