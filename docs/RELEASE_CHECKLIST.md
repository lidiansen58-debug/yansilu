# Release Checklist

This checklist keeps desktop releases repeatable and separates three different channels:

- Pull request CI proves the branch builds.
- Beta releases give testers installable bundles.
- Production releases publish signed, updateable artifacts.

## Release Types

### Pull Request CI

Use this for every desktop change.

- Workflow: `desktop-ci`
- Trigger: pull request into `main`
- Updater artifacts: off by default
- Output: short-lived GitHub Actions artifacts
- Audience: maintainers only

### Beta Test Release

Use this when sending builds to friends or early testers.

- Tag format: `v0.1.0-beta.1`
- GitHub release type: draft or pre-release
- Required before sharing: install smoke test on the target OS
- Expected warning: unsigned or unnotarized apps may be blocked by macOS Gatekeeper or Windows SmartScreen

### Production Release

Use this only after signing, notarization, and update feed checks are ready.

- Tag format: `v0.1.0`
- GitHub release type: regular release
- Required before publishing: checksums, updater signatures, release notes, rollback plan
- Public download source: GitHub Releases first, then `downloads.yansilu.app` when the download site is ready

## Before Tagging

1. Merge the release PR into `main`.
2. Confirm the working tree is clean.
3. Update all version fields to the same value:
   - `package.json`
   - `apps/desktop/src-tauri/tauri.conf.json`
   - `apps/desktop/src-tauri/Cargo.toml`
4. Run local checks:
   - `npm.cmd run mvp:check`
   - `$env:YANSILU_DESKTOP_UPDATER_ARTIFACTS='false'; npm.cmd run build:desktop`
5. Confirm generated directories are not staged:
   - `apps/desktop/src-tauri/target/`
   - `.tmp/`
   - `apps/desktop/src-tauri/tauri.conf.no-updater-artifacts.json`

## Required Repository Secrets

Tagged `desktop-release` builds now generate signed updater artifacts by default. The workflow fails early unless these repository secrets are present:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Tagged desktop release workflows generate signed updater artifacts by default. These secrets sign Tauri updater metadata, not the operating system installer itself. If the signing key is rotated, update the public key in `apps/desktop/src-tauri/tauri.conf.json` in the same release-prep change.

Future production signing should also add:

- Apple Developer ID certificate and notarization credentials for macOS
- Windows code signing certificate or trusted signing setup for NSIS/MSI

## Signed Rehearsal

After configuring `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, run a non-publishing rehearsal before the first real tag:

```powershell
gh workflow run desktop-bundles.yml --ref feature/auto-update -f updater_artifacts=true
```

This builds signed desktop updater artifacts on GitHub runners, collects them, generates `update-manifest.json` and `latest.json`, and uploads `yansilu-release-rehearsal-assets` as a workflow artifact. It does not create or modify a GitHub Release.

Check the downloaded rehearsal artifact for:

- installer files for each platform
- matching `.sig` files
- `bundle-manifest.json`
- `bundle-manifest.sha256.txt`
- `update-manifest.json`
- `latest.json`

## Tag And Build

Create a beta tag:

```powershell
git switch main
git pull --ff-only
# First update version fields to 0.1.0-beta.1 and merge that change.
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1
```

Create a production tag:

```powershell
git switch main
git pull --ff-only
# First update version fields to 0.1.0 and merge that change.
git tag v0.1.0
git push origin v0.1.0
```

The `desktop-release` workflow builds:

- Windows NSIS installer
- Linux `.deb` and AppImage
- macOS Universal `.app` / `.dmg`（同时支持 Apple Silicon 与 Intel）

Universal macOS 包必须在 Apple Silicon 构建机生成，并完成 Developer ID 签名与 Apple 公证；不要发布未签名的 CI 产物。

It creates or updates a draft GitHub Release for the tag.
The draft release includes flattened installer assets, `.sig` files, `bundle-manifest.json`, `bundle-manifest.sha256.txt`, `update-manifest.json`, and `latest.json`.

## Release Review

Before publishing the draft release:

1. Download every uploaded installer artifact.
2. Compare `bundle-manifest.sha256.txt` against the installer assets listed in `bundle-manifest.json`.
3. Confirm the workflow generated the app update manifests for the GitHub Release assets. For local reproduction:

```powershell
npm.cmd run release:update-manifest -- --repo lidiansen58-debug/yansilu --tag v0.1.0-beta.1 --changelog-file docs/V0_1_0_BETA_1_RELEASE_NOTES.md
```

4. Confirm `https://github.com/lidiansen58-debug/yansilu/releases/latest/download/update-manifest.json` returns the release `update-manifest.json` after publication.
5. Confirm `https://github.com/lidiansen58-debug/yansilu/releases/latest/download/latest.json` returns the Tauri updater feed after publication.
6. Install and launch on each target platform.
7. From an older build, confirm “Settings -> Version update -> Check update” reports the new GitHub Release.
8. From an older signed desktop build, confirm “one-click download and install” completes and “restart to finish update” relaunches the app on the new version.
9. Confirm updater artifacts exist only when signed updater generation was intentionally enabled for this release.
10. Confirm release notes mention known limitations and signing status.
11. Keep the previous release available for rollback.

## macOS Notes

Friend testing can use the CI `.dmg`, but public distribution should use Developer ID signing and Apple notarization. Without that, Gatekeeper can block the app or force users through manual override steps.

## Windows Notes

Friend testing can use the NSIS installer, but production distribution should use a trusted code signing path. Without it, Windows SmartScreen may warn or block first-run installs.

## Update Feed Notes

The app currently points at:

```text
https://github.com/lidiansen58-debug/yansilu/releases/latest/download/latest.json
```

Do not advertise one-click automatic updates until that endpoint is populated from signed release artifacts and tested from an older build to a newer build.

GitHub Releases host the installer files and the two small static JSON feeds: `update-manifest.json` for the in-app changelog/download prompt, and `latest.json` for Tauri updater installation. The `releases/latest/download` endpoint is suitable for the stable public channel; beta/prerelease channels should use a dedicated endpoint or override `YANSILU_UPDATE_MANIFEST_URL`.

## References

- Tauri distribution guidance: https://v2.tauri.app/distribute/
- Tauri updater artifacts and signatures: https://v2.tauri.app/plugin/updater/
- Tauri macOS signing and notarization: https://v2.tauri.app/distribute/sign/macos/
- GitHub-hosted runner labels: https://docs.github.com/actions/reference/runners/github-hosted-runners
