param(
  [string]$EnvFile = ".env.worktree",
  [ValidateSet("all", "api", "web", "worker")]
  [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

Get-Content -Encoding UTF8 -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line) { return }
  if ($line.StartsWith("#")) { return }
  $parts = $line.Split("=", 2)
  if ($parts.Count -ne 2) { return }
  $key = $parts[0].Trim()
  $val = $parts[1].Trim()
  Set-Item -Path ("Env:\" + $key) -Value $val
}

$scriptName = switch ($Target) {
  "all" { "dev" }
  "api" { "dev:api" }
  "web" { "dev:web" }
  "worker" { "dev:worker" }
}

Write-Output "Using $EnvFile"
Write-Output "API_PORT=$env:API_PORT WEB_PORT=$env:WEB_PORT"
Write-Output "VAULT_PATH=$env:VAULT_PATH"
Write-Output "Running npm.cmd run $scriptName"

& npm.cmd run $scriptName
