#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 研思录 (Yansilu) macOS Release Build Script
# Native architecture build + Code Sign + DMG + Notarize
# ============================================================
# Prerequisites:
#   1. Apple Developer ID Application certificate in keychain
#   2. App-specific password for notarization (https://appleid.apple.com)
#   3. Rust target for the current Mac architecture
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
CERT_NAME="${APPLE_SIGNING_IDENTITY:-Developer ID Application: Beijing Chuangcache Technology Co.,Ltd. (T7G29AJ3L5)}"
APP_NAME="研思录"
BUNDLE_ID="com.notesprout.yansilu"
TAURI_DIR="$PROJECT_DIR/apps/desktop/src-tauri"
ENTITLEMENTS="$TAURI_DIR/entitlements.plist"
APP_VERSION=$(node -p "require('$PROJECT_DIR/apps/desktop/src-tauri/tauri.conf.json').version")
MACOS_BUILD_TARGET="universal-apple-darwin"
BUNDLE_ARCH="universal"

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

  if [ "$(uname -m)" != "arm64" ]; then
    err "Universal macOS builds must run on an Apple Silicon Mac or ARM macOS CI runner."
    exit 1
  fi

  if ! command -v cargo &>/dev/null; then
    err "Rust/Cargo not found. Install from https://rustup.rs"
    exit 1
  fi

  if ! command -v node &>/dev/null; then
    err "Node.js not found"
    exit 1
  fi

  for rust_target in aarch64-apple-darwin x86_64-apple-darwin; do
    if ! rustup target list --installed 2>/dev/null | grep -qx "$rust_target"; then
      warn "Rust target $rust_target not installed. Installing..."
      rustup target add "$rust_target"
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
  log "Step 1/5: Preparing universal desktop API runtime during build..."
  ok "Runtime preparation queued"
}

# --- Step 2: Build Tauri app ---
build_app() {
  log "Step 2/5: Building universal Tauri desktop app..."
  cd "$TAURI_DIR"
  cargo clean 2>/dev/null || true
  cd "$PROJECT_DIR"
  APPLE_SIGNING_IDENTITY="$CERT_NAME" YANSILU_DESKTOP_TARGET="$MACOS_BUILD_TARGET" npm run build:desktop:mac
  ok "App built"
}

# --- Step 3: Sign the .app bundle ---
sign_app() {
  log "Step 3/5: Signing .app bundle..."

  local bundle_dir="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/macos"
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

  local node_entitlements
  node_entitlements=$(mktemp)
  if ! codesign -d --entitlements "$node_entitlements" "$node_bin" >/dev/null 2>&1; then
    rm -f "$node_entitlements"
    err "Could not read embedded Node.js entitlements"
    exit 1
  fi
  if ! /usr/libexec/PlistBuddy -c "Print :com.apple.security.cs.allow-jit" "$node_entitlements" 2>/dev/null | grep -qx "true"; then
    rm -f "$node_entitlements"
    err "Embedded Node.js is missing com.apple.security.cs.allow-jit"
    exit 1
  fi
  rm -f "$node_entitlements"
  ok "Embedded Node.js JIT entitlement verified"
}

# --- Step 4: Create DMG (with Applications shortcut) ---
create_dmg() {
  log "Step 4/5: Creating DMG..."

  local bundle_dir="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/macos"
  local app_path="$bundle_dir/${APP_NAME}.app"
  local dmg_dir="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/dmg"
  local dmg_name="${APP_NAME}_${APP_VERSION}_${BUNDLE_ARCH}.dmg"
  local dmg_path="$dmg_dir/$dmg_name"

  node "$PROJECT_DIR/scripts/package-macos-dmg.mjs" \
    --app "$app_path" \
    --out "$dmg_path" \
    --volume-name "$APP_NAME"

  # Sign DMG
  log "  Signing DMG..."
  codesign --force --sign "$CERT_NAME" --timestamp "$dmg_path"

  ok "DMG created: $dmg_path"
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

  local dmg_path="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/dmg/${APP_NAME}_${APP_VERSION}_${BUNDLE_ARCH}.dmg"

  log "  Submitting to Apple notary service..."
  xcrun notarytool submit "$dmg_path" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_PASSWORD" \
    --wait

  log "  Stapling notarization ticket..."
  xcrun stapler staple "$dmg_path"

  # Verify
  log "  Verifying notarization..."
  spctl -a -vvv -t install "$dmg_path" 2>&1 || true
  xcrun stapler validate "$dmg_path" 2>&1 || true

  ok "DMG notarized and stapled"
}

sign_tauri_dmg() {
  local dmg_path="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/dmg/${APP_NAME}_${APP_VERSION}_${BUNDLE_ARCH}.dmg"
  log "Generating Tauri signature..."
  node "$PROJECT_DIR/scripts/sign-tauri-artifact.mjs" --required "$dmg_path"
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

  sign_tauri_dmg

  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  Build Complete!${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo -e "  DMG: ${CYAN}$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/dmg/${APP_NAME}_${APP_VERSION}_${BUNDLE_ARCH}.dmg${NC}"
  echo ""
}

main "$@"
