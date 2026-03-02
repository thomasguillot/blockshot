# Blockshot

A WordPress plugin that lets admins create **block art** using Gutenberg blocks and export the result as a high-quality **JPG** or **PNG** image.

## Requirements

- WordPress 6.9+
- PHP 8.1+
- A block theme (e.g. Twenty Twenty-Five)

## Features

- **Private CPT** — Blockshot posts are only accessible to administrators. Hidden from search, feeds, sitemaps, and public queries.
- **Canvas block** — A resizable artboard that constrains your design. Drag the handles or set an exact pixel width in the sidebar.
- **Export as image** — Click the camera button on the frontend or use the "Export as Image" panel in the editor to download your canvas as PNG or JPG.
- **Settings** — Choose export format (PNG/JPG), quality (for JPG), and pixel scale (1x–4x) under Settings → Blockshot.
- **Minimal template** — Blockshot posts render on a blank page (no header, footer, or nav) so the exported image is clean.

## Installation

1. Clone or copy this repository into `wp-content/plugins/blockshot`.
2. Install dependencies and build:

```bash
cd wp-content/plugins/blockshot
npm install
npm run build
```

3. Activate the plugin in **Plugins → Installed Plugins**.

## Development

Start the watcher for live rebuilds while editing JS/SCSS:

```bash
npm start
```

Build for production:

```bash
npm run build
```

## How It Works

1. Go to **Blockshot → Add New** in the admin.
2. The editor pre-loads a single **Canvas** block. Add any Gutenberg blocks inside it (images, text, shapes, groups, etc.).
3. Resize the canvas width by dragging the handles or entering a value in the block sidebar.
4. Export your design:
   - **From the editor:** Open the "Export as Image" panel in the document sidebar and click "Export as Image".
   - **From the frontend:** Visit the blockshot post while logged in as admin and click the camera button in the bottom-right corner.
5. Adjust export format, quality, and scale under **Settings → Blockshot**.

## File Structure

```
blockshot/
├── blockshot.php              # Main plugin file
├── includes/
│   ├── class-cpt.php          # CPT registration
│   ├── class-security.php     # Security hardening
│   └── class-settings.php     # Settings page
├── templates/
│   └── single-blockshot.html  # Minimal block template
├── src/
│   ├── blocks/
│   │   ├── canvas/            # Canvas block (edit, save, block.json)
│   │   └── svg/               # SVG block
│   ├── editor-panel/          # Editor sidebar export panel
│   ├── frontend/              # Frontend camera button + snackbar
│   └── shared/                # Shared utilities
├── build/                     # Compiled assets (gitignored)
└── languages/                 # i18n
```

## License

This plugin is licensed under the [GNU General Public License v2.0 or later](https://www.gnu.org/licenses/gpl-2.0.html). See [LICENSE](LICENSE) for the full text.
