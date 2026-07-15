#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 研思录 macOS DMG Notarization Script
# ============================================================
# Prerequisites:
#   1. Valid Developer ID Application certificate in keychain
#   2. Apple ID email
#   3. App-specific password (generate at https://appleid.apple.com)
#      Go to: Sign-In and Security → App-Specific Passwords
#
# Environment variables (required):
#   APPLE_ID          - Apple ID email
#   APPLE_TEAM_ID     - Team ID (T7G29AJ3L5)
#   APPLE_APP_PASSWORD - App-specific password (NOT your Apple ID password)
#
# Usage:
#   APPLE_ID="your@email.com" \
#   APPLE_TEAM_ID="T7G29AJ3L5" \
#   APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
#   ./scripts/notarize-dmg.sh
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DMG_DIR="$PROJECT_DIR/apps/desktop/src-tauri/target/release/bundle/dmg"

# Find the DMG file
DMG_FILE=$(ls -t "$DMG_DIR"/*.dmg 2>/dev/null | head -1)

if [ -z "$DMG_FILE" ]; then
  echo "❌ No DMG file found in: $DMG_DIR"
  echo "   Run 'npm run build:desktop:mac' first."
  exit 1
fi

echo "📦 DMG found: $(basename "$DMG_FILE")"

# Check required env vars
: "${APPLE_ID:?Environment variable APPLE_ID is required}"
: "${APPLE_TEAM_ID:?Environment variable APPLE_TEAM_ID is required}"
: "${APPLE_APP_PASSWORD:?Environment variable APPLE_APP_PASSWORD is required}"

echo ""
echo "=========================================="
echo "🔐 Submitting DMG for notarization..."
echo "=========================================="

xcrun notarytool submit "$DMG_FILE" \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_PASSWORD" \
  --wait

echo ""
echo "=========================================="
echo "📎 Stapling notarization ticket to DMG..."
echo "=========================================="

xcrun stapler staple "$DMG_FILE"

echo ""
echo "=========================================="
echo "✅ Notarization complete!"
echo "   DMG: $DMG_FILE"
echo ""
echo "🔍 Verify with:"
echo "   spctl -a -vvv -t install \"$DMG_FILE\""
echo "   xcrun stapler validate \"$DMG_FILE\""
echo "=========================================="
