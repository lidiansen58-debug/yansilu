param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$hooksDir = Join-Path $repoRoot ".git\hooks"
$hookPath = Join-Path $hooksDir "pre-commit"

if (-not (Test-Path -LiteralPath $hooksDir)) {
  throw "Git hooks directory not found: $hooksDir"
}

if ((Test-Path -LiteralPath $hookPath) -and (-not $Force)) {
  throw "Hook already exists: $hookPath. Re-run with -Force to replace it."
}

$hookContent = @'
#!/bin/sh
repo_root="$(git rev-parse --show-toplevel)" || exit 1
cd "$repo_root" || exit 1
echo "[pre-commit] encoding check"
if command -v npm.cmd >/dev/null 2>&1; then
  npm.cmd run encoding:check:strict
else
  npm run encoding:check:strict
fi
exit $?
'@

$hookContent = $hookContent -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($hookPath, $hookContent, [System.Text.UTF8Encoding]::new($false))

Write-Output "Installed pre-commit hook: $hookPath"
Write-Output "Current hook behavior: npm run encoding:check:strict"
