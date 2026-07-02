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
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $repoRoot = git rev-parse --show-toplevel; if (-not $repoRoot) { throw 'Unable to resolve repository root.' }; Set-Location $repoRoot; Write-Output '[pre-commit] encoding check'; & npm.cmd run encoding:check:strict; if (\$LASTEXITCODE -ne 0) { throw 'encoding:check:strict failed' }"
'@

$hookContent = $hookContent -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($hookPath, $hookContent, [System.Text.UTF8Encoding]::new($false))

Write-Output "Installed pre-commit hook: $hookPath"
Write-Output "Current hook behavior: npm run encoding:check:strict"
