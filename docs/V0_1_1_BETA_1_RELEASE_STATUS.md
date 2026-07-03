# Yansilu v0.1.1-beta.1 Release Status

Updated: 2026-07-04

## Release Target

Yansilu v0.1.1-beta.1 is a Windows desktop beta candidate for small-scope internal or friend testing.

Goal of this sign-off: final usability smoke from a non-IT user perspective, fix only P0/P1 issues, verify the minimum regression set, verify desktop installer startup, and confirm release materials are clear enough for beta sharing.

## Source

- Branch: `main`
- Remote: `origin/main`
- Version: `0.1.1-beta.1`
- Pre-document-update commit checked: `5ab0fcb`
- Release tag to use after final commit lands on `main`: `v0.1.1-beta.1`

## Build Artifact

- Local bundle path: `apps/desktop/src-tauri/target/release/bundle`
- Installer: `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.1-beta.1_x64-setup.exe`
- Size: `4,448,862` bytes
- SHA-256: `4701A5AF59EE1D45D50FBC3DDAF4263CBCFAECC6FBF71F55E737D25FDBADD700`
- Build command: `npm run build:desktop:nsis`
- Build note: local NSIS beta build completed with updater artifacts disabled for this build.

## Usability Smoke Result

### P0

None found.

### P1 Fixed

1. Mobile Demo first screen could open near the lower "product feature notes" section instead of the beginning of the guide. Fixed by resetting the editor viewport to the start after the Smart Notes Demo guide opens.
2. Mobile editor toolbar could hide horizontal overflow, making some actions unreachable on small screens. Fixed by keeping the mobile toolbar horizontally scrollable while preserving the compact collapsed height.

### P2 Recorded

1. The external-link browser smoke still takes about 32 seconds. It passes, but the WYSIWYG link rendering/opening path is slow and should be optimized after beta.
2. Mobile Demo still gives more emphasis to the editor than to the walkthrough action buttons. The guide text now starts at the correct position, but a future mobile-specific walkthrough action strip would make the first-run path clearer.

## Completed Verification

- Version fields match:
  - `package.json`: `0.1.1-beta.1`
  - `apps/desktop/src-tauri/tauri.conf.json`: `0.1.1-beta.1`
  - `apps/desktop/src-tauri/Cargo.toml`: `0.1.1-beta.1`
- `npm run encoding:check:strict` passed.
- `npm run test:review-first:core` passed: `171/171`.
- `node ./scripts/browser-mvp-check.mjs` passed.
- `RUN_BROWSER_E2E=1 node --test --test-isolation=none --test-name-pattern "^prototype smart notes startup demo opens the guide note without duplicating seed data$" tests/e2e/prototype-browser.test.mjs` passed.
- `npm run test:e2e:browser -- mobile-responsive` passed.
- `npm run dev:desktop:check` passed.
- `npm run build:desktop:check` passed.
- `npm run build:desktop:nsis` passed.
- Silent NSIS install to a temporary directory passed with exit code `0`.
- Installed executable launched and stayed alive after 6 seconds; the test process was then stopped and the temporary install was removed.

## Desktop Acceptance Coverage

Confirmed in this pass:

- Current NSIS installer builds.
- Silent install succeeds.
- Installed app executable exists.
- Installed app starts and remains running.
- Desktop preflight confirms Rust, Tauri CLI, web server, and API server availability.
- Desktop bundle preflight confirms product name, window title, icons, updater permission, frontend entry, and `cargo check`.

Covered by browser/API smoke rather than installed WebView automation:

- Empty vault start, Demo import, note creation and persistence.
- Import/export preview and confirmation.
- Graph navigation, editor links, attachments, explorer file operations.
- Demo guide, Today organizing, theme/writing handoff, and writing scaffold readiness.

## Known Limitations

- The Windows installer is unsigned, so Windows SmartScreen may warn during install or first launch.
- The beta still expects the local API service on `http://localhost:3000`.
- Local beta updater artifacts are disabled; do not advertise one-click updater installation until signed updater artifacts and feeds are tested.
- macOS and Linux are not part of this Windows beta sign-off.
- Full installed-WebView manual checks for native file dialogs, reveal/open-directory actions, and external OS shell behavior should still be repeated before sharing beyond close testers.

## Beta Conclusion

Go for beta with close testers.

The main user path has no known P0 blockers, the P1 issues found in the final smoke were fixed, minimum regression passed, and the current Windows installer builds, installs, and launches. Keep the P2 items in the next polish queue instead of blocking this beta.
