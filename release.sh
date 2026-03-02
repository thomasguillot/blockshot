#!/usr/bin/env bash
set -euo pipefail

PLUGIN_SLUG="blockshot"
ZIP_NAME="${PLUGIN_SLUG}.zip"

DIST_DIR="dist"
STAGE_DIR="${DIST_DIR}/${PLUGIN_SLUG}"

rm -rf "$DIST_DIR"
mkdir -p "$STAGE_DIR"

cp blockshot.php "$STAGE_DIR/"
cp -r includes "$STAGE_DIR/"
cp -r build "$STAGE_DIR/"
cp -r templates "$STAGE_DIR/"
cp -r languages "$STAGE_DIR/" 2>/dev/null || mkdir -p "$STAGE_DIR/languages"
cp README.md "$STAGE_DIR/" 2>/dev/null || true

cd "$DIST_DIR"
zip -rq "../${ZIP_NAME}" "$PLUGIN_SLUG"
cd ..
rm -rf "$DIST_DIR"

echo "✅ ${ZIP_NAME} ($(du -h "$ZIP_NAME" | cut -f1))"
