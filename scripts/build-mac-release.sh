#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 研思录 (Yansilu) macOS Release Build Script
# Universal build + Code Sign + Notarize + DMG + Updater
# ============================================================
# Prerequisites:
#   1. Apple Developer ID Application certificate in keychain
#   2. App-specific password for notarization (https://appleid.apple.com)
#   3. Rust targets for both Mac architectures
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
NOTARIZATION_ZIP=""
NOTARIZATION_DIR=""
trap 'if [ -n "$NOTARIZATION_ZIP" ]; then rm -f "$NOTARIZATION_ZIP"; fi; if [ -n "$NOTARIZATION_DIR" ]; then rmdir "$NOTARIZATION_DIR"; fi' EXIT

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

  for secret_name in APPLE_ID APPLE_TEAM_ID APPLE_APP_PASSWORD TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD; do
    if [ -z "${!secret_name:-}" ]; then
      err "$secret_name is required for a signed and notarized release."
      exit 1
    fi
  done
  if ! command -v xcrun &>/dev/null; then
    err "Xcode command-line tools are required for notarization."
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
  if ! security find-identity -v -p codesigning 2>/dev/null | grep -Fq "\"$CERT_NAME\""; then
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
  cd "$PROJECT_DIR"
  APPLE_SIGNING_IDENTITY="$CERT_NAME" YANSILU_DESKTOP_TARGET="$MACOS_BUILD_TARGET" \
    YANSILU_DESKTOP_UPDATER_ARTIFACTS=false npm run build:desktop -- app
  ok "App built"
}

# --- Step 3: Sign the .app bundle ---
sign_app() {
  log "Step 3/5: Signing .app bundle..."

  local bundle_dir="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/macos"
  if [ ! -d "$bundle_dir" ]; then
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

  # Sign nested runtime code before sealing the enclosing app.
  while IFS= read -r -d '' binary; do
    if [ "$binary" != "$node_bin" ] && file -b "$binary" | grep -q "Mach-O"; then
      codesign --force --sign "$CERT_NAME" --options runtime --timestamp "$binary"
    fi
  done < <(find "$app_path/Contents/Resources/desktop-api-runtime" -type f -print0)

  log "  Signing entire .app bundle..."
  codesign --force --sign "$CERT_NAME" --options runtime --timestamp \
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
  if ! codesign -d --entitlements - --xml "$node_bin" >"$node_entitlements" 2>/dev/null; then
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
  node "$PROJECT_DIR/scripts/verify-macos-bundle-architecture.mjs" --app "$app_path" --expected universal
}

notarize_app() {
  local app_path="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/macos/${APP_NAME}.app"
  NOTARIZATION_DIR=$(mktemp -d "${TMPDIR:-/tmp}/yansilu-notarization.XXXXXX")
  NOTARIZATION_ZIP="$NOTARIZATION_DIR/app.zip"
  ditto -c -k --keepParent "$app_path" "$NOTARIZATION_ZIP"
  node "$PROJECT_DIR/scripts/macos-notarization.mjs" "$NOTARIZATION_ZIP" "$app_path"
  rm -f "$NOTARIZATION_ZIP"
  NOTARIZATION_ZIP=""
  rmdir "$NOTARIZATION_DIR"
  NOTARIZATION_DIR=""
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
  codesign --verify --strict --verbose=1 "$dmg_path"

  ok "DMG created: $dmg_path"
}

# --- Step 5: Notarize and staple ---
notarize_dmg() {
  log "Step 5/5: Notarizing DMG..."

  local dmg_path="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/dmg/${APP_NAME}_${APP_VERSION}_${BUNDLE_ARCH}.dmg"
  node "$PROJECT_DIR/scripts/macos-notarization.mjs" "$dmg_path"
  ok "DMG notarized and stapled"
}

package_tauri_updater() {
  local bundle_dir="$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/macos"
  local archive_path="$bundle_dir/${APP_NAME}_${BUNDLE_ARCH}.app.tar.gz"
  tar -czf "$archive_path" -C "$bundle_dir" "${APP_NAME}.app"
  node "$PROJECT_DIR/scripts/sign-tauri-artifact.mjs" --required "$archive_path"
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
  notarize_app
  create_dmg
  notarize_dmg
  package_tauri_updater
  sign_tauri_dmg
  cd "$PROJECT_DIR"
  YANSILU_DESKTOP_TARGET="$MACOS_BUILD_TARGET" npm run build:desktop:manifest

  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  Build Complete!${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo -e "  DMG: ${CYAN}$TAURI_DIR/target/$MACOS_BUILD_TARGET/release/bundle/dmg/${APP_NAME}_${APP_VERSION}_${BUNDLE_ARCH}.dmg${NC}"
  echo ""
}

main "$@"
