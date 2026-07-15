#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 研思录 (Yansilu) macOS Release Build Script
# Universal Binary (arm64 + x86_64) + Code Sign + DMG + Notarize
# ============================================================
# Prerequisites:
#   1. Apple Developer ID Application certificate in keychain
#   2. App-specific password for notarization (https://appleid.apple.com)
#   3. Rust targets: aarch64-apple-darwin + x86_64-apple-darwin
#
# Usage (set env vars before running):
#   export APPLE_ID="your@email.com"
#   export APPLE_TEAM_ID="T7G29AJ3L5"
#   export APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
#   bash scripts/build-mac-release.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Config ---
CERT_NAME="Developer ID Application: Beijing Chuangcache Technology Co.,Ltd. (T7G29AJ3L5)"
APP_NAME="研思录"
BUNDLE_ID="com.notesprout.yansilu"
TAURI_DIR="$PROJECT_DIR/apps/desktop/src-tauri"
ENTITLEMENTS="$TAURI_DIR/entitlements.plist"

# Notarization credentials (from env vars)
APPLE_ID="${APPLE_ID:-}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-T7G29AJ3L5}"
APPLE_APP_PASSWORD="${APPLE_APP_PASSWORD:-}"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }

# --- Check prerequisites ---
check_prereqs() {
  log "Checking prerequisites..."

  if ! command -v cargo &>/dev/null; then
    err "Rust/Cargo not found. Install from https://rustup.rs"
    exit 1
  fi

  if ! command -v node &>/dev/null; then
    err "Node.js not found"
    exit 1
  fi

  # Check Rust targets
  for target in aarch64-apple-darwin x86_64-apple-darwin; do
    if ! rustup target list --installed 2>/dev/null | grep -q "$target"; then
      warn "Rust target $target not installed. Installing..."
      rustup target add "$target"
    fi
  done

  # Check certificate
  if ! security find-identity -v -p codesigning 2>/dev/null | grep -q "Developer ID Application"; then
    err "Developer ID Application certificate not found in keychain."
    err "Please install it via Xcode → Settings → Accounts → Manage Certificates."
    exit 1
  fi
  ok "Prerequisites OK"
}

# --- Step 1: Prepare API runtime ---
prepare_runtime() {
  log "Step 1/5: Preparing desktop API runtime..."
  sudo rm -rf "$TAURI_DIR/desktop-api-runtime" 2>/dev/null || true
  node "$PROJECT_DIR/scripts/prepare-desktop-api-runtime.mjs"
  ok "Runtime prepared"
}

# --- Step 2: Build Tauri app ---
build_app() {
  log "Step 2/5: Building Tauri desktop app (Universal Binary)..."
  cd "$TAURI_DIR"
  cargo clean 2>/dev/null || true
  cd "$PROJECT_DIR"
  npm run build:desktop:mac
  ok "App built"
}

# --- Step 3: Sign the .app bundle ---
sign_app() {
  log "Step 3/5: Signing .app bundle..."

  local bundle_dir=$(find "$TAURI_DIR/target" -path "*/release/bundle/macos" -type d 2>/dev/null | head -1)
  if [ -z "$bundle_dir" ]; then
    err "Bundle directory not found"
    exit 1
  fi

  cd "$bundle_dir"

  local app_path="$bundle_dir/${APP_NAME}.app"
  local node_bin="$app_path/Contents/Resources/desktop-api-runtime/node/node"

  # Sign the embedded Node.js binary first
  log "  Signing embedded Node.js binary..."
  codesign --force --sign "$CERT_NAME" --options runtime --timestamp \
    --entitlements "$ENTITLEMENTS" "$node_bin"

  # Deep sign the entire .app
  log "  Signing entire .app bundle..."
  codesign --deep --force --sign "$CERT_NAME" --options runtime --timestamp \
    --entitlements "$ENTITLEMENTS" "$app_path"

  # Verify
  log "  Verifying signature..."
  if codesign --verify --deep --strict --verbose=1 "$app_path"; then
    ok "App signed and verified"
  else
    err "Signature verification failed"
    exit 1
  fi
}

# --- Step 4: Create DMG (with Applications shortcut) ---
create_dmg() {
  log "Step 4/5: Creating DMG..."

  local bundle_dir=$(find "$TAURI_DIR/target" -path "*/release/bundle/macos" -type d 2>/dev/null | head -1)
  cd "$bundle_dir"

  local app_path="$bundle_dir/${APP_NAME}.app"
  local dmg_name="${APP_NAME}.dmg"
  local staging="/tmp/yansilu-dmg-staging"

  rm -rf "$staging"
  mkdir -p "$staging"
  cp -R "$app_path" "$staging/"
  ln -s /Applications "$staging/Applications"

  # Create read-write DMG for layout customization
  hdiutil create -volname "$APP_NAME" \
    -srcfolder "$staging" \
    -ov -format UDRW "${APP_NAME}_rw.dmg"

  # Mount and customize layout
  hdiutil attach "${APP_NAME}_rw.dmg" -readwrite

  osascript -e "
  tell application \"Finder\"
    tell disk \"$APP_NAME\"
      open
      set current view of container window to icon view
      set toolbar visible of container window to false
      set statusbar visible of container window to false
      set bounds of container window to {400, 100, 900, 400}
      set theViewOptions to the icon view options of container window
      set arrangement of theViewOptions to not arranged
      set icon size of theViewOptions to 128
      set position of item \"$APP_NAME.app\" of container window to {150, 100}
      set position of item \"Applications\" of container window to {350, 100}
      update without registering applications
      delay 1
      close
    end tell
  end tell
  " 2>/dev/null || true

  hdiutil detach "/Volumes/$APP_NAME" 2>/dev/null || true

  # Convert to compressed read-only DMG
  rm -f "$dmg_name"
  hdiutil convert "${APP_NAME}_rw.dmg" -format UDZO -o "$dmg_name"
  rm -f "${APP_NAME}_rw.dmg"
  rm -rf "$staging"

  # Sign DMG
  log "  Signing DMG..."
  codesign --force --sign "$CERT_NAME" --timestamp "$dmg_name"

  ok "DMG created: $bundle_dir/$dmg_name"
}

# --- Step 5: Notarize and staple ---
notarize_dmg() {
  log "Step 5/5: Notarizing DMG..."

  if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_PASSWORD" ]; then
    warn "APPLE_ID or APPLE_APP_PASSWORD not set. Skipping notarization."
    warn "Set these env vars and run:"
    echo "  xcrun notarytool submit \"<dmg>\" --apple-id \"...\" --team-id \"$APPLE_TEAM_ID\" --password \"...\" --wait"
    echo "  xcrun stapler staple \"<dmg>\""
    return 0
  fi

  local bundle_dir=$(find "$TAURI_DIR/target" -path "*/release/bundle/macos" -type d 2>/dev/null | head -1)
  cd "$bundle_dir"
  local dmg_name="${APP_NAME}.dmg"

  log "  Submitting to Apple notary service..."
  xcrun notarytool submit "$dmg_name" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_PASSWORD" \
    --wait

  log "  Stapling notarization ticket..."
  xcrun stapler staple "$dmg_name"

  # Verify
  log "  Verifying notarization..."
  spctl -a -vvv -t install "$dmg_name" 2>&1 || true
  xcrun stapler validate "$dmg_name" 2>&1 || true

  ok "DMG notarized and stapled"
}

# --- Main ---
main() {
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  研思录 macOS Release Build${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""

  check_prereqs
  prepare_runtime
  build_app
  sign_app
  create_dmg

  if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_PASSWORD" ]; then
    notarize_dmg
  else
    warn ""
    warn "To notarize the DMG, run:"
    warn "  export APPLE_ID=\"your@email.com\""
    warn "  export APPLE_APP_PASSWORD=\"xxxx-xxxx-xxxx-xxxx\""
    warn "  bash scripts/build-mac-release.sh"
  fi

  local bundle_dir=$(find "$TAURI_DIR/target" -path "*/release/bundle/macos" -type d 2>/dev/null | head -1)

  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  Build Complete!${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo -e "  DMG: ${CYAN}$bundle_dir/${APP_NAME}.dmg${NC}"
  echo ""
}

main "$@"
