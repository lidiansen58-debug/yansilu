# Desktop Download And Auto Update V1

## Goal

This document defines the first usable plan for:

- a public download / install page
- desktop bundle distribution
- automatic update support for the Tauri desktop app

## Current State

Current desktop stack:

- runtime: `Tauri 2`
- bundle scripts:
  - `npm run build:desktop`
  - `npm run build:desktop:nsis`
  - `npm run build:desktop:msi`
- bundle manifest script:
  - `npm run build:desktop:manifest`

Current gap:

- no public download page
- no release metadata page for installers
- updater plugin needs a real production endpoint and signing-key workflow
- no release feed for desktop update checks

## What The Website Needs

The marketing site should include a dedicated `/download` page that does four things:

1. Explain that the desktop app is the main long-term experience
2. Offer the recommended installer format
3. Explain the install flow briefly
4. Set the expectation that future versions support automatic updates

## Recommended First Download Strategy

Primary public download target:

- `Windows NSIS installer`

Reasons:

- better for standard consumer install flow
- easiest default choice on Windows
- more natural fit for future in-app auto update flow

Secondary optional target later:

- `MSI`

Use MSI mainly when enterprise or managed deployment becomes necessary.

## Recommended Release Artifacts

For each desktop release, publish:

1. `研思录_x.y.z_x64-setup.exe` or equivalent NSIS output
2. release notes
3. checksums / manifest
4. updater metadata feed

## Friend Testing Builds

Use the `desktop-bundles` GitHub Actions workflow for early cross-platform test builds.

For manual `workflow_dispatch` runs, leave `updater_artifacts` unchecked. This produces installable test bundles such as the macOS `.app` / `.dmg` artifacts without requiring a Tauri updater signing key.

Tagged desktop release builds now generate signed updater artifacts by default. Keep `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and the updater public key in `apps/desktop/src-tauri/tauri.conf.json` in sync before publishing a release.

For manual `workflow_dispatch` builds, enable `updater_artifacts` only when you intentionally want signed updater artifacts for that test run.

## Auto Update Recommendation

For the current Tauri 2 desktop app, the recommended path is:

1. add Tauri updater plugin
2. configure an update endpoint / static manifest feed
3. check for updates on app launch and from a manual menu entry
4. allow the user to download and install the update from inside the app

## Implementation Steps

### Step 1: Enable updater in desktop app

Update:

- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/tauri.conf.json`

Expected additions:

- updater plugin dependency
- updater endpoint configuration
- permission/capability updates if required by the Tauri plugin

### Step 2: Add frontend update entry

Add an app-level entry such as:

- `检查更新`
- `发现新版本`
- `下载并安装更新`

Minimum UI states:

- up to date
- checking
- update available
- downloading
- ready to restart
- failed

### Step 3: Define release feed format

Need a stable release source, for example:

- GitHub Releases
- self-hosted static update manifest
- object storage + CDN

Minimum feed responsibilities:

- latest version
- installer URL
- checksum / signature
- release notes

### Step 4: Connect build outputs to release publishing

Current build pipeline already produces desktop bundles and a bundle manifest.

Next addition should be:

- a release packaging step
- upload of installer + manifest
- generation of updater feed data

### Step 5: Add website download source

The `/download` page should eventually read from either:

- a checked-in release manifest
- an API endpoint
- or a generated static release JSON file

So the page can show:

- latest version
- release date
- recommended installer
- release note summary

## Recommended V1 Scope

V1 should do:

1. create `/download` page
2. standardize NSIS as the recommended download
3. define updater implementation plan
4. prepare Tauri app for updater integration

V1 does not yet need to do:

- cross-platform release management
- differential patch updates
- staged rollout
- enterprise update policies

## Next Technical Step

After the website page is in place, the next engineering step should be:

1. add Tauri updater dependency
2. configure update endpoint
3. add manual `检查更新` entry in the desktop app
4. test one end-to-end update from an older local build to a newer one
