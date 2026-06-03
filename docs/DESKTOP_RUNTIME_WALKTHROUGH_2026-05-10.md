# Desktop Runtime Walkthrough 2026-05-10

> Legacy note (2026-06-03): this walkthrough captures the older desktop release validation path. The current import/export scope has since been simplified to Obsidian-only preview/confirm import plus Markdown export, with no import-history or rollback requirement.

## Purpose

This checklist is the active `feat/desktop-runtime` validation plan for the v0.1.0 RC1 Windows desktop runtime.

It covers the remaining proof before sharing the RC installer with internal or friend testers: the installed desktop app must complete the main product path against a real local API and Vault, with Windows paths that include spaces and Chinese characters.

## Current Branch

- Branch: `feat/desktop-runtime`
- Base: `origin/main`
- Worktree: `E:\Projects\Thinking in Notes\yansilu-wt\feat-desktop-runtime`
- Local env file: `.env.worktree`
- API port for worktree dev/preflight: `3100`
- Web port for worktree dev/preflight: `5273`
- Packaged app API base for this RC: `http://localhost:3000`
- Vault: `E:\Projects\Thinking in Notes\yansilu-wt\_vaults\feat-desktop-runtime\yansilu-vault`
- Manual walkthrough Vault: `E:\Projects\Thinking in Notes\yansilu-wt\_manual-walkthrough\研思录 Vault 手动走查`

## Automated Preconditions

Run these from the `feat-desktop-runtime` worktree:

```powershell
Get-Content -Encoding UTF8 -LiteralPath .env.worktree | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $parts = $line.Split("=", 2)
  if ($parts.Count -eq 2) { Set-Item -Path ("Env:" + $parts[0].Trim()) -Value $parts[1].Trim() }
}

npm.cmd test
npm.cmd run build:desktop:check
npm.cmd run dev:desktop:check
```

Expected:

- `npm.cmd test` passes.
- Desktop bundle preflight passes, including `cargo check`.
- Desktop dev preflight checks the worktree ports from `API_PORT` and `WEB_PORT`, not hardcoded `3000/5173`.

## Installer Smoke

Build from the integration checkout or this worktree:

```powershell
npm.cmd run build:desktop:nsis
```

Install smoke:

```powershell
$installer = Resolve-Path -LiteralPath "apps\desktop\src-tauri\target\release\bundle\nsis\研思录_0.1.0_x64-setup.exe"
$proc = Start-Process -FilePath $installer -ArgumentList "/S" -Wait -PassThru -WindowStyle Hidden
if ($proc.ExitCode -ne 0) { throw "Silent install failed with exit code $($proc.ExitCode)" }
```

Launch smoke:

```powershell
$exe = Join-Path (Join-Path $env:LOCALAPPDATA "研思录") "yansilu-desktop.exe"
$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 6
$running = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if (-not $running) { throw "Installed app process exited before smoke check completed." }
$running | Select-Object Id,ProcessName,MainWindowTitle,Responding
Stop-Process -Id $running.Id -Force
```

Expected:

- Silent installer exits with `0`.
- Installed executable exists under `%LOCALAPPDATA%\研思录\yansilu-desktop.exe`.
- Process name is `yansilu-desktop`.
- Window title is `研思录`.
- Process is responding.

## Manual Packaged-App Walkthrough

Run from the installed desktop app, not only from the browser dev server.

1. Start the local API used by the installed app. For this RC package, the packaged frontend falls back to `http://localhost:3000`; the `3100/5273` ports above are for worktree dev/preflight checks.
2. Launch the installed desktop app.
3. Confirm the app connects to the intended local API.
4. Switch to a Vault path containing Chinese characters and spaces.
5. Create a directory.
6. Create a note in that directory.
7. Edit and save the note.
8. Restart the desktop app and confirm the note persists.
9. Insert an image attachment whose file name includes Chinese characters or spaces.
10. Insert a non-image file attachment whose file name includes Chinese characters or spaces.
11. Add a `[[wikilink]]`.
12. Click a `#tag` and confirm search/filter behavior.
13. Import a Markdown fixture, preview, confirm, inspect history, and rollback.
14. Import an Obsidian fixture, preview, confirm, inspect history, and rollback.
15. Export Markdown and confirm notes and assets appear in the target directory.
16. Open the graph and jump from a graph node back to a note.
17. Create a writing project from permanent notes and generate a scaffold.
18. Use desktop opener actions to reveal a Markdown file.
19. Use desktop opener actions to open a directory.

## Severity Rules

- P0: app cannot launch, cannot connect to API, cannot switch Vault, cannot persist notes, corrupts files, import/export fails, or installer fails.
- P1: desktop dialog/opener behavior is broken, attachments fail for Chinese/spaced paths, graph/writing path is blocked, or rollback leaves unsafe state.
- P2: copy, layout, discoverability, or non-blocking polish issues that do not block the walkthrough.

## Current Status

Automated installer and launch smoke passed from the integration checkout after the `origin/main` publish.

Clean reinstall validation from `main` also passed on 2026-05-11 using rebuilt source commit `b3da8ce`:

- `npm.cmd run build:desktop:nsis` produced `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe`.
- Installer SHA-256: `B4A6B11A0BAC93F209A25E8191C3D1D8B9C5A98EDCB058F6F2114C6DE380A030`.
- Installer size: `3,818,980` bytes.
- Silent uninstall of the previous smoke install exited with `0`.
- A stale local installer-state key from an earlier smoke install, `HKCU\Software\notesprout\研思录`, restored a temporary install path until cleared. This key records the previous install directory only; it is not Vault/user content.
- After clearing that stale installer state, silent reinstall exited with `0` and installed to `%LOCALAPPDATA%\研思录`.
- Launch smoke started `%LOCALAPPDATA%\研思录\yansilu-desktop.exe` as `yansilu-desktop`, window title `研思录`, responding `true`.

Automated validation from `feat/desktop-runtime` also passed on 2026-05-10:

- `npm.cmd test`: `146 pass / 0 fail / 55 skipped`.
- `npm.cmd run build:desktop:check`: passed, including `cargo check`.
- `npm.cmd run dev:desktop:check`: passed against `API_PORT=3100` and `WEB_PORT=5273`.
- `npm.cmd run build:desktop:nsis`: produced `apps/desktop/src-tauri/target/release/bundle/nsis/研思录_0.1.0_x64-setup.exe`.
- Installer SHA-256: `8A6312412DFB3E677737F3FF0C714051216E70C7C0A4246BBFA276D3B7D59B84`.
- Installer size: `3,790,458` bytes.
- Silent install smoke: exit code `0`.
- Launch smoke: `%LOCALAPPDATA%\研思录\yansilu-desktop.exe` started as `yansilu-desktop`, window title `研思录`, responding `true`.

Packaged-app API-backed walkthrough also passed on 2026-05-10 after restarting `localhost:3000` from the `feat-desktop-runtime` worktree:

- Installed app launched from `%LOCALAPPDATA%\研思录\yansilu-desktop.exe` with title `研思录` and `Responding=true`.
- Active API Vault was `E:\Projects\Thinking in Notes\yansilu-wt\_manual-walkthrough\研思录 Vault 手动走查`.
- Created custom directories and notes under Chinese/space-containing paths.
- Edited and fetched saved Markdown content, including `[[wikilink]]` and `#tag` metadata.
- Uploaded image and non-image attachments with Chinese/space-containing filenames, then read them back from `assets/`.
- Verified tag search, note relations, and graph path lookup.
- Markdown import preview/confirm/history/rollback passed.
- Obsidian import preview/confirm/history/rollback passed, including embedded asset copy and rollback.
- Markdown export passed for custom `fsPath` notes and default Vault notes.
- Writing project creation and draft scaffold generation passed.

No automated P0 was found in this branch validation. The remaining gate is the human UI portion of the manual packaged-app walkthrough: click through the installed WebView, confirm native dialogs are not hidden, and verify desktop opener actions for revealing a Markdown file and opening a directory.
