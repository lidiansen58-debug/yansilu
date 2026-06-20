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

Signed updater artifact generation requires:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

For v0.1.0, tagged release workflows keep updater artifacts disabled by default. Add these secrets before enabling signed updater artifacts; they sign Tauri updater metadata, not the operating system installer itself.

Future production signing should also add:

- Apple Developer ID certificate and notarization credentials for macOS
- Windows code signing certificate or trusted signing setup for NSIS/MSI

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
- macOS Apple Silicon `.app` / `.dmg`
- macOS Intel `.app` / `.dmg`

It creates or updates a draft GitHub Release for the tag.

## Release Review

Before publishing the draft release:

1. Download every uploaded artifact.
2. Compare `bundle-manifest.sha256.txt` against the release assets.
3. Generate the app update manifest for the GitHub Release assets:

```powershell
npm.cmd run release:update-manifest -- --repo lidiansen58-debug/yansilu --tag v0.1.0-beta.1 --changelog-file docs/V0_1_0_BETA_1_RELEASE_NOTES.md
```

4. Upload `release-artifacts/update-manifest.json` to the stable update endpoint used by `YANSILU_UPDATE_MANIFEST_URL`.
5. Install and launch on each target platform.
6. From an older build, confirm “Settings -> Version update -> Check update” reports the new GitHub Release.
7. Confirm updater artifacts exist only when signed updater generation was intentionally enabled for this release.
8. Confirm release notes mention known limitations and signing status.
9. Keep the previous release available for rollback.

## macOS Notes

Friend testing can use the CI `.dmg`, but public distribution should use Developer ID signing and Apple notarization. Without that, Gatekeeper can block the app or force users through manual override steps.

## Windows Notes

Friend testing can use the NSIS installer, but production distribution should use a trusted code signing path. Without it, Windows SmartScreen may warn or block first-run installs.

## Update Feed Notes

The app currently points at:

```text
https://downloads.yansilu.app/updates/latest.json
```

Do not advertise automatic updates until that endpoint is populated from the release artifacts and tested from an older build to a newer build.

GitHub Releases can host the installer files. The app should still read a small static JSON manifest from the update endpoint, because that keeps the runtime update check simple, cacheable, and independent of GitHub API rate limits.

## References

- Tauri distribution guidance: https://v2.tauri.app/distribute/
- Tauri updater artifacts and signatures: https://v2.tauri.app/plugin/updater/
- Tauri macOS signing and notarization: https://v2.tauri.app/distribute/sign/macos/
- GitHub-hosted runner labels: https://docs.github.com/actions/reference/runners/github-hosted-runners
