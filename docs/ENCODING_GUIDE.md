# Encoding Guide

## Goal

Keep file encoding, terminal display, and script I/O on the same UTF-8 path.

Project standard:

- repository text files: UTF-8
- line endings: LF
- no UTF-8 BOM in repository text files
- script file reads and writes: explicit UTF-8

## Fast Rule

When terminal output looks garbled, do not assume the file is broken.

Check in this order:

1. run `npm run encoding:check`
   or `npm run encoding:doctor` when you want one strict pass
2. reset the terminal to UTF-8
3. read the file again with explicit UTF-8
4. only then treat it as a file corruption issue

## Commands

### 1. Check repository text risk

```powershell
npm run encoding:check
```

Use strict mode when you want the command to fail on risk markers:

```powershell
npm run encoding:check:strict
```

Recommended daily command:

```powershell
npm run encoding:doctor
```

This strict pass checks:

- mojibake markers
- UTF-8 BOM
- CRLF line endings
- mixed line endings

`encoding:doctor` uses `docs/encoding-baseline.json`.
That means:

- existing repository debt is recorded
- new regressions will fail
- intentional cleanup should lower the baseline over time, not raise it casually

### 2. Reset the current PowerShell terminal to UTF-8

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\terminal-utf8.ps1
```

Or inside the current shell:

```powershell
.\scripts\terminal-utf8.ps1
```

### 3. Install a lightweight pre-commit hook

This installs a minimal local hook that runs the baseline-aware encoding doctor.

```powershell
npm run hooks:install
```

If you need to replace an existing hook:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-git-hooks.ps1 -Force
```

### 4. Read a file with explicit UTF-8

```powershell
Get-Content -LiteralPath .\docs\PROTOTYPE_PROMPT_GUARDRAILS.md -Encoding UTF8
```

## Writing Rules

When scripts write files, always set UTF-8 explicitly.

PowerShell:

```powershell
Set-Content -LiteralPath <path> -Value <text> -Encoding utf8
```

Node.js:

```js
fs.writeFileSync(path, text, "utf8");
```

Python:

```python
open(path, "w", encoding="utf-8")
```

## Practical Standard

- repository text files: UTF-8
- line endings: LF
- no UTF-8 BOM in tracked text files
- terminal troubleshooting: run `.\scripts\terminal-utf8.ps1`
- local hook install: run `npm run hooks:install`
- suspicious output: verify with `Get-Content -Encoding UTF8`
- prompt snippets for Codex threads: see `docs/CODEX_ENCODING_PROMPT_SNIPPETS.md`

## Interpretation

- `encoding:check` clean + editor display clean + terminal garbled:
  terminal display problem
- `encoding:check` reports markers:
  inspect the file content before further edits
- repeated garbling after terminal reset:
  some tool in the write path is not using UTF-8 explicitly

## Recommended Team Routine

For this repository, use this sequence whenever you touch Chinese copy, docs, fixture data, or large prompt text:

1. edit the file normally
2. run `npm run encoding:doctor`
3. if terminal output still looks wrong, run `.\scripts\terminal-utf8.ps1`
4. read the file again with `Get-Content -Encoding UTF8`
5. only then decide whether the file itself is corrupted

Before release, before large copy updates, and after fixture regeneration, always run:

```powershell
npm run encoding:doctor
```
