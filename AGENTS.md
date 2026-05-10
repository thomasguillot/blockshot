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

### Important: `blockshot/canvas` is a **static block**

It has no `render_callback` and no `render` in `block.json` — the saved HTML in `post_content` is rendered to the frontend literally. Two consequences for agents:

1. The JSON attributes in the `<!-- wp:blockshot/canvas {...} -->` comment are **only** consumed by the editor's `save.js` to regenerate the saved `<div>`. They do **not** affect frontend rendering on their own. An agent that writes only the comment + an empty wrapper `<div>` produces a canvas that ignores the requested dimensions, layout, and colors until the user opens the post in the editor and saves once.
2. To get correct dimensions/layout/colors on **first frontend render** (no editor round-trip), the agent must hand-author the full saved `<div>`, mirroring what `src/blocks/canvas/save.js` would produce.

The `data-blockshot-canvas` attribute is also required — both the editor and frontend export code locate the artboard via `document.querySelector('[data-blockshot-canvas]')` (see `src/shared/export-canvas.js`, `src/frontend/index.js`, `src/editor/index.js`).

### Canonical saved markup (copy this template)

For a 1080×1080 canvas with default colors and top vertical alignment:

```html
<!-- wp:blockshot/canvas {"width":1080,"minHeight":1080} -->
<div class="wp-block-blockshot-canvas blockshot-canvas blockshot-canvas__layout-top"
     data-blockshot-canvas="true"
     style="background-color:#fff;color:#1e1e1e;display:flex;flex-direction:column;justify-content:flex-start;width:1080px;min-height:1080px">
  <!-- ...inner blocks go here... -->
</div>
<!-- /wp:blockshot/canvas -->
```

What changes for non-defaults:

- **Different size:** swap the `width` (px) and `minHeight` (px) values in both the JSON comment **and** the inline `style`.
- **Vertical alignment:** for `center` / `bottom` / `space-between`, change `blockshot-canvas__layout-top` → `blockshot-canvas__layout-<value>` and `justify-content:flex-start` → `center` / `flex-end` / `space-between`. Also add `"verticalAlignment":"<value>"` to the JSON.
- **Custom hex colors via `style.color.*`:** add `has-background has-text-color` classes; replace the fallback `background-color:#fff;color:#1e1e1e` with the user-chosen hexes; add `"style":{"color":{"background":"#0f172a","text":"#f8fafc"}}` to the JSON.
- **Theme-palette color slugs:** add `has-<slug>-background-color has-background` (and similarly for text); drop the inline `background-color`/`color` for that channel; add `"backgroundColor":"<slug>"` / `"textColor":"<slug>"` to the JSON.
- **Gradient via `style.color.gradient`:** add `has-background` class; append `background:<gradient>` to the inline style (the `background` shorthand wins over the fallback `background-color:#fff` when listed after it); add `"style":{"color":{"gradient":"linear-gradient(135deg,#0ea5e9,#8b5cf6)"}}` to the JSON. Example tail of the inline style: `…width:1080px;min-height:1080px;background:linear-gradient(135deg,#0ea5e9,#8b5cf6)`.
- **Padding via `style.spacing.padding`:** append `padding-top:<n>;padding-right:<n>;padding-bottom:<n>;padding-left:<n>` to the inline style (each value either a px string like `"48px"` or a theme spacing slug rendered as `var(--wp--preset--spacing--<slug>)`); add `"style":{"spacing":{"padding":{"top":"48px","right":"48px","bottom":"48px","left":"48px"}}}` to the JSON.

If any of that gets too gnarly (gradients and padding are common offenders), the safe fallback is: still write the **canonical wrapper** above (the `<!-- wp:blockshot/canvas {...} -->` comment plus the `<div>` with its required class list, `data-blockshot-canvas="true"`, and the base inline `style` covering width / minHeight / display / flex-direction / justify-content / fallback colors), but leave the harder gradient/padding values in the JSON only. Then tell the user that the first frontend render won't reflect those advanced values until they open the post in the editor and hit Save once — `save.js` will reconcile the saved `<div>` with the JSON. **Do not** skip the wrapper or omit the required class / `data-blockshot-canvas` / base style fields, or the post will fail block validation when the user opens it and frontend export will silently no-op.

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

`core/image` works with either a media-library attachment ID or a bare URL, but **prefer media-library or same-origin URLs**: browser-side export (`html-to-image`) reads pixels from the rendered DOM, and remote images can fail or render blank under CORS, slow loads, or hotlink protection. For decorative graphics with no source image, prefer `blockshot/svg` or CSS-styled `core/group` shapes.

## Recipe: create a Blockshot from a prompt

```bash
wp post create \
  --post_type=blockshot \
  --post_status=publish \
  --post_title="Launch announcement" \
  --post_content='<!-- wp:blockshot/canvas {"width":1080,"minHeight":1080,"style":{"color":{"background":"#0f172a","text":"#f8fafc"}}} -->
<div class="wp-block-blockshot-canvas blockshot-canvas blockshot-canvas__layout-top has-background has-text-color"
     data-blockshot-canvas="true"
     style="color:#f8fafc;background-color:#0f172a;display:flex;flex-direction:column;justify-content:flex-start;width:1080px;min-height:1080px">
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
- **Treating the canvas comment-attributes as authoritative.** They're not — `blockshot/canvas` is a static block. The `width`, `minHeight`, `verticalAlignment`, and color attributes in the `<!-- wp:blockshot/canvas {...} -->` comment are only consumed when the editor next saves (via `save.js`). On first frontend render of an agent-created post, only the literal saved `<div class=... style=...>` markup matters. Keep the comment JSON and the saved `<div>`'s class/style **in sync**, or expect surprises after the user opens the post and Gutenberg "fixes" the markup.
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
