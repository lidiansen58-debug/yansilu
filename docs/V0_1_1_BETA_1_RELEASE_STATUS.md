# Yansilu v0.1.1-beta.1 Release Status

Updated: 2026-07-04

## Release Target

Yansilu v0.1.1-beta.1 is a Windows desktop beta candidate for small-scope internal or friend testing.

Goal of this sign-off: final usability smoke from a non-IT user perspective, fix only P0/P1 issues, verify the minimum regression set, verify desktop installer startup, and confirm release materials are clear enough for beta sharing.

## Source

- Branch: `main`
- Remote: `origin/main`
- Version: `0.1.1-beta.1`
- Baseline commit before this closeout update: `e85cade`
- This closeout update: clearer empty-vault Demo entry, mobile access help, and release-material alignment
- Release tag to use after final commit lands on `main`: `v0.1.1-beta.1`

## Build Artifact

- Local bundle path: `apps/desktop/src-tauri/target/release/bundle`
- Installer: `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.1-beta.1_x64-setup.exe`
- Size: `4,464,004` bytes
- SHA-256: `8E3E146789E133330FF27B7577FE9221BF496D7AFFF531A526A3ABB389CD1EED`
- Build command: `npm run build:desktop:nsis`
- Build note: local NSIS beta build completed with updater artifacts disabled for this build.

## Usability Smoke Result

### P0

None found.

### P1 Fixed

1. Mobile Demo first screen could open near the lower "product feature notes" section instead of the beginning of the guide. Fixed by resetting the editor viewport to the start after the Smart Notes Demo guide opens.
2. Mobile editor toolbar could hide horizontal overflow, making some actions unreachable on small screens. Fixed by keeping the mobile toolbar horizontally scrollable while preserving the compact collapsed height.
3. Empty-vault first launch did not make the Demo learning path explicit enough and mixed in migration language too early. Fixed by making "导入示例库 / 体验 Demo" the single primary visible first action while keeping the required user confirmation before any Demo data is imported.

### P2 Fixed

1. The external-link WYSIWYG browser smoke no longer waits for the default popup timeout. It now uses a real Playwright click with a short popup wait, so the smoke reflects the trusted user-click path and returns quickly when the app stays in place.
2. Mobile Demo walkthrough action buttons are more visible on small screens. The walkthrough note is shown, steps use larger button-like targets, the active step is stronger, and very narrow screens stack the actions into one column.

## Completed Verification

- Version fields match:
  - `package.json`: `0.1.1-beta.1`
  - `apps/desktop/src-tauri/tauri.conf.json`: `0.1.1-beta.1`
  - `apps/desktop/src-tauri/Cargo.toml`: `0.1.1-beta.1`
- `npm run encoding:check:strict` passed.
- `npm run test:review-first:core` passed: `171/171`.
- `node --test tests/unit/web-empty-start-main-actions.test.mjs` passed: `7/7`.
- `node ./scripts/browser-mvp-check.mjs` passed.
- `npm run test:e2e:browser:mvp` passed: `13/13`.
- Browser usability smoke passed for empty vault entry, explicit Demo startup, Today, relations, writing center, help, mobile access, backup/restore, and mobile first screen.
- `RUN_BROWSER_E2E=1 node --test --test-isolation=none --test-name-pattern "^prototype smart notes startup demo opens the guide note without duplicating seed data$" tests/e2e/prototype-browser.test.mjs` passed.
- `RUN_BROWSER_E2E=1 node --test --test-isolation=none --test-name-pattern "^prototype editor opens external links without navigating the app$" tests/e2e/prototype-browser.test.mjs` passed.
- `node --test tests/unit/web-mobile-beginner-first-screen.test.mjs` passed.
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
- Mobile access pairing, computer-side confirmation guidance, and mobile first screen clarity.

## Known Limitations

- The Windows installer is unsigned, so Windows SmartScreen may warn during install or first launch.
- The beta still expects the local API service on `http://localhost:3000`.
- Local beta updater artifacts are disabled; do not advertise one-click updater installation until signed updater artifacts and feeds are tested.
- macOS and Linux are not part of this Windows beta sign-off.
- Full installed-WebView manual checks for native file dialogs, reveal/open-directory actions, and external OS shell behavior should still be repeated before sharing beyond close testers.

## Beta Conclusion

Go for beta with close testers.

The main user path has no known P0 blockers, the P1 issues found in the final smoke were fixed, the follow-up P2 polish has also landed, minimum regression passed, and the current Windows installer builds, installs, and launches.
