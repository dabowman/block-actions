=== Block Actions ===
Contributors: dabowman
Tags: blocks, gutenberg, actions, interactivity, editor
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Extend blocks with js snippets and custom data attributes.

== Description ==

Block Actions lets you assign lightweight, modular javascript "actions" to blocks via the block editor. It adds controls in Advanced settings and initializes js actions on the frontend.

== Installation ==

1. Upload the plugin to `/wp-content/plugins/`.
2. Activate it from Plugins.
3. Build assets if developing: `npm install && npm run build`.

== Frequently Asked Questions ==

= Does this add custom blocks? =
No. It extends existing blocks via filters and Advanced panel controls.

= Can I add my own actions? =
Yes. Add JS modules in `src/actions/` and rebuild.

== Screenshots ==
1. Action selector in the block editor.

== Changelog ==

= 1.0.0 =
Initial standalone release. Generic namespaces/handles, i18n, settings, opt-in CSP, refined actions registry, CI.

