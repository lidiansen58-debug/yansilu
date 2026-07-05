# Encoding Playbook

This is the short operational version of the encoding rules for this repository.

## When to Run It

Run the strict encoding check:

- after editing Chinese UI copy or docs
- after regenerating fixture data
- before commit if the change touched text-heavy files
- before beta / release packaging

Command:

```powershell
npm run encoding:doctor
```

This command compares the current repository state against:

`docs/encoding-baseline.json`

So it blocks new encoding debt without requiring an immediate full cleanup of old files.

## What It Checks

- mojibake risk markers
- UTF-8 BOM
- CRLF line endings
- mixed line endings

## If Terminal Output Looks Garbled

Do not rewrite the file immediately.

Use this order:

1. `npm run encoding:doctor`
2. `.\scripts\terminal-utf8.ps1`
3. `Get-Content -Encoding UTF8 <path>`
4. only then decide whether the file itself is broken

## Project Rules

- All repository text files must stay UTF-8.
- All repository text files should use LF line endings.
- Do not commit UTF-8 BOM.
- PowerShell / Node / Python scripts that write files must set UTF-8 explicitly.

## Script Rules

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
open(path, "w", encoding="utf-8", newline="\n")
```

## Useful Related Files

- `docs/ENCODING_GUIDE.md`
- `docs/CODEX_ENCODING_PROMPT_SNIPPETS.md`
- `scripts/mojibake-risk-report.mjs`
- `scripts/terminal-utf8.ps1`
