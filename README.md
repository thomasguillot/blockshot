# Blockshot

[![License: GPL-2.0](https://img.shields.io/badge/License-GPL--2.0-blue.svg)](https://www.gnu.org/licenses/gpl-2.0)

**Experimental** -- This plugin is a work-in-progress and may break. Use at your own risk.

A WordPress plugin that lets you create **block art** using Gutenberg blocks and export the result as a high-quality **JPG** or **PNG** image. Design social media graphics, banners, thumbnails, or any visual content directly inside the WordPress editor.

## Requirements

- WordPress 6.9+
- PHP 8.1+
- A block theme (e.g. Twenty Twenty-Five)

## Features

- **Private CPT** — Blockshot posts are only accessible to administrators. Hidden from search, feeds, sitemaps, and public queries.
- **Canvas block** — A resizable artboard that constrains your design.
- **Export Blockshot** — Click the camera button on the frontend or use the "Export Blockshot" button in the editor's **Blockshot** panel to download your canvas as PNG or JPG.
- **Settings** — Choose export format (PNG/JPG), quality (for JPG), and pixel scale (1x–4x). Settings live in the **Blockshot** panel inside the editor's Post tab and persist site-wide.
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

## Testing

JS unit tests (Jest, runs from a clean checkout after `npm install`):

```bash
npm test          # run once
npm run lint:js   # lint
```

PHP unit tests (PHPUnit + the WordPress test framework). The WP test framework is **not** vendored — install it once before running the suite:

```bash
composer install
# Install the WP test framework + create the test DB. Replace creds for your env.
bin/install-wp-tests.sh wordpress_test root '' localhost latest
composer test
```

By default the script writes the WP test framework to `/tmp/wordpress-tests-lib` and a copy of WP core to `/tmp/wordpress`. Override with `WP_TESTS_DIR` / `WP_CORE_DIR` env vars if needed.

## How It Works

1. Go to **Blockshot → Add New** in the admin.
2. The editor pre-loads a single **Canvas** block. Add any Gutenberg blocks inside it (images, text, shapes, groups, etc.).
3. Adjust export format, quality, and scale in the **Blockshot** panel inside the Post tab on the right sidebar. Changes persist site-wide.
4. Export your design:
   - **From the editor:** In the **Blockshot** panel, click "Export Blockshot".
   - **From the frontend:** Visit the blockshot single page while logged in as admin and click the camera button in the bottom-right corner.

## License

This plugin is licensed under the [GNU General Public License v2.0 or later](https://www.gnu.org/licenses/gpl-2.0.html). See [LICENSE](LICENSE) for the full text.
