# AI Agent Instructions — Blockshot

This file tells AI coding agents how to **create a Blockshot from a prompt**. A Blockshot is a `blockshot` CPT post whose `post_content` is serialized Gutenberg block markup wrapped in a `blockshot/canvas` block. The plugin then renders that post on a clean, header/footer-less template that the user exports as PNG or JPG from the browser.

## What an agent can and can't do

- **Can do, end-to-end via WP-CLI / REST:** create the post, compose the canvas + inner blocks, set dimensions, colors, and SVGs, return an edit URL.
- **Cannot do headlessly:** generate the final PNG/JPG file. Export runs in the browser via [`html-to-image`](https://github.com/bubkoo/html-to-image) (Editor "Export Blockshot" button, or the camera button on the singular frontend page). Hand the user a URL and let them click.

## Prerequisites

Before an agent can create Blockshots, the plugin must be installed, built, and activated.

```bash
cd wp-content/plugins/blockshot
npm install
npm run build                   # builds build/blocks/canvas, build/blocks/svg, build/editor, build/frontend
wp plugin activate blockshot    # or activate via Plugins → Installed Plugins
```

> This doc uses bare `wp`. Substitute whatever WP-CLI invocation your host provides (`docker exec <container> wp …`, `wp-env run cli wp …`, `ddev wp …`, etc.).

Requirements: WordPress 6.9+, PHP 8.1+, a block theme (e.g. Twenty Twenty-Five). On activation, the `administrator` role is granted the `*_blockshots` capability set, so the WP-CLI user must be an admin (or `--user=<admin>` must be passed).

If the build directory is missing the blocks won't register — `blockshot_register_block()` no-ops when `build/blocks/canvas` and `build/blocks/svg` aren't present. Always confirm the build step ran before composing markup.

## The block markup contract

A Blockshot post's `post_content` MUST follow this shape:

```html
<!-- wp:blockshot/canvas {"width":1080,"minHeight":1080} -->
<div class="wp-block-blockshot-canvas blockshot-canvas blockshot-canvas__layout-top" data-blockshot-canvas="true">
  <!-- ...inner blocks go here... -->
</div>
<!-- /wp:blockshot/canvas -->
```

The `data-blockshot-canvas` attribute is **required** — both the editor and frontend export code locate the artboard via `document.querySelector('[data-blockshot-canvas]')` (see `src/shared/export-canvas.js`, `src/frontend/index.js`, `src/editor/index.js`). If you omit it, exporting from the singular frontend page silently does nothing until the user opens the post in the editor and saves once (which regenerates the saved markup). Include the attribute upfront so the post is exportable without that round-trip.

You do not need to hand-author inline styles — Gutenberg regenerates the saved `<div>`'s `style` from the JSON attributes (`width`, `minHeight`, `verticalAlignment`, colors, etc.) when the post is first opened in the editor.

### `blockshot/canvas` (required wrapper, exactly one)

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `width` | number (px) | `1440` | Canvas width in pixels. Common: 1080 (square), 1080×1920 (story), 1200×630 (OG). |
| `minHeight` | number (px) | `800` | Minimum canvas height in pixels. |
| `verticalAlignment` | `top` \| `center` \| `bottom` \| `space-between` | `top` | Inner-block vertical layout. |
| `backgroundColor` | string | — | Slug from theme palette; or use `style.color.background` for hex. |
| `textColor` | string | — | Slug from theme palette; or `style.color.text` for hex. |
| `style.color.background` | string | — | Hex color, e.g. `"#0f172a"`. |
| `style.color.text` | string | — | Hex color. |
| `style.color.gradient` | string | — | CSS gradient string. |
| `style.spacing.padding` | object | — | `{ top, right, bottom, left }` in px or theme spacing slugs. |

`multiple: false` — there can only be one canvas per post. `lock: { move: true, remove: true }` is set by default; do **not** override it.

### `blockshot/svg`

For vector graphics. One attribute: `content` (string of SVG markup). The renderer runs the value through `wp_kses` with a strict allowlist defined in `src/blocks/svg/render.php` — anything outside that allowlist is stripped silently. The current allowlist (check `render.php` for the canonical list and per-element attributes) covers: `svg`, `g`, `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`, `text`, `tspan`, `defs`, `clipPath`, `mask`, `use`, `symbol`, `title`, `desc`, `linearGradient`, `radialGradient`, `stop`, `filter`, `pattern`, `image`, `animate`, `animateTransform`, plus a specific subset of filter primitives: `feGaussianBlur`, `feOffset`, `feMerge`, `feMergeNode`, `feColorMatrix`, `feBlend`, `feFlood`, `feComposite`. Other `fe*` primitives (e.g. `feTurbulence`, `feDisplacementMap`) are **not** allowed and will be stripped.

```html
<!-- wp:blockshot/svg {"content":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"#0ea5e9\"/></svg>"} /-->
```

Note the self-closing `/-->` — `blockshot/svg`'s `save.js` returns `null`, so it's a dynamic block with no inner HTML.

### Inner blocks

Inside the canvas you can use any registered block — these two are common building blocks:

```html
<!-- wp:heading {"level":1,"style":{"typography":{"fontSize":"96px"}},"textColor":"white"} -->
<h1 class="wp-block-heading has-white-color has-text-color" style="font-size:96px">Hello</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"style":{"typography":{"fontSize":"24px"}}} -->
<p style="font-size:24px">Subtitle goes here.</p>
<!-- /wp:paragraph -->
```

`core/image` works but requires a media-library attachment ID — agents should prefer `blockshot/svg` or CSS-styled `core/group` shapes when no media exists.

## Recipe: create a Blockshot from a prompt

```bash
wp post create \
  --post_type=blockshot \
  --post_status=publish \
  --post_title="Launch announcement" \
  --post_content='<!-- wp:blockshot/canvas {"width":1080,"minHeight":1080,"style":{"color":{"background":"#0f172a","text":"#f8fafc"}}} -->
<div class="wp-block-blockshot-canvas blockshot-canvas blockshot-canvas__layout-top" data-blockshot-canvas="true">
<!-- wp:heading {"level":1,"style":{"typography":{"fontSize":"96px","fontWeight":"800"}}} -->
<h1 class="wp-block-heading" style="font-size:96px;font-weight:800">We shipped it.</h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"style":{"typography":{"fontSize":"28px"}}} -->
<p style="font-size:28px">Blockshot is live.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:blockshot/canvas -->' \
  --porcelain
```

`--porcelain` returns the new post ID. Hand the user the edit URL:

```
https://<site>/wp-admin/post.php?post=<ID>&action=edit
```

…and tell them to click **Export Blockshot** in the editor's Blockshot panel, or visit the singular permalink and click the camera button.

### Via REST API

The CPT has `show_in_rest: true`, so an authenticated `POST /wp-json/wp/v2/blockshot` with `{ "title": "...", "content": "...", "status": "publish" }` works equivalently. Auth must come from a user with `edit_blockshots`.

## Export settings

Format/quality/scale are stored in the `blockshot_settings` option and are **site-wide**, not per-post. Defaults: `{ format: "png", quality: 100, scale: 2 }`. To change them programmatically:

```bash
# Read
curl -u <admin>:<app-pw> https://<site>/wp-json/blockshot/v1/settings

# Update
curl -u <admin>:<app-pw> -X POST https://<site>/wp-json/blockshot/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"format":"jpg","quality":92,"scale":3}'
```

Valid values: `format` ∈ {`png`, `jpg`}, `quality` 1–100 (jpg only; png ignores), `scale` ∈ {1, 2, 3, 4}.

## Common pitfalls

- **Forgetting the canvas wrapper.** Inner blocks placed at the post's root render but won't constrain to the artboard or export cleanly. Always wrap.
- **Omitting `data-blockshot-canvas`.** The export selector requires it. Without the attribute, frontend export silently no-ops; the user has to open the post in the editor and save once before the camera button works.
- **Using non-allowlisted SVG elements.** `wp_kses` strips them silently. If your SVG vanishes, check `src/blocks/svg/render.php` for the allowlist.
- **Pixel sizing for typography.** Block themes often coerce `fontSize` to fluid CSS clamp(). Pin sizes by using `style.typography.fontSize` with an explicit `px` value as shown above; avoid relying on theme-token sizes if you need pixel-accurate exports.
- **Building before activating.** With no `build/` directory the plugin activates but neither block registers, so `wp post create` succeeds but produces an empty/broken canvas.
- **WP-CLI invocation.** Bare `wp` only works if WP-CLI is on `PATH` and run from inside the WP install. In Docker setups use `docker exec <container> wp ...`; in `wp-env` use `wp-env run cli wp ...`.
- **Caps on multisite.** `grant_admin_capabilities()` is per-site. On a network-activated multisite, capabilities are granted to admins of every existing site, but new sites added later need the plugin re-activated (or caps granted manually).

## Quick reference

- Plugin file: `blockshot.php`
- CPT registration: `includes/class-cpt.php` (`Blockshot\CPT::POST_TYPE = 'blockshot'`)
- Settings + REST: `includes/class-settings.php` (`/wp-json/blockshot/v1/settings`)
- Canvas block: `src/blocks/canvas/block.json`, `src/blocks/canvas/save.js`
- SVG block: `src/blocks/svg/block.json`, `src/blocks/svg/render.php`
- Frontend template: `templates/single-blockshot.html`
