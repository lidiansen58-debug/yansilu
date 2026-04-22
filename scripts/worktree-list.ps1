param(
  [string]$Root = ""
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null).Trim()
  if (-not $root) { throw "Not inside a git repository." }
  return $root
}

function Read-EnvMap([string]$FilePath) {
  $map = @{}
  if (-not (Test-Path -LiteralPath $FilePath)) { return $map }
  Get-Content -Encoding UTF8 -LiteralPath $FilePath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) { $map[$parts[0].Trim()] = $parts[1].Trim() }
  }
  return $map
}

$repoRoot = Get-RepoRoot
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = Join-Path ([System.IO.Path]::GetDirectoryName($repoRoot)) "yansilu-wt"
}

$lines = & git -C $repoRoot worktree list --porcelain
if ($LASTEXITCODE -ne 0) { throw "git worktree list failed." }

$records = @()
$curr = $null
foreach ($line in $lines) {
  if ($line.StartsWith("worktree ")) {
    if ($curr) { $records += $curr }
    $curr = [ordered]@{
      Path = $line.Substring(9).Trim()
      Branch = ""
      Head = ""
      ApiPort = ""
      WebPort = ""
      VaultPath = ""
    }
    continue
  }
  if ($line.StartsWith("branch ") -and $curr) {
    $curr.Branch = $line.Substring(7).Trim() -replace "^refs/heads/", ""
    continue
  }
  if ($line.StartsWith("HEAD ") -and $curr) {
    $curr.Head = $line.Substring(5).Trim()
    continue
  }
}
if ($curr) { $records += $curr }

foreach ($r in $records) {
  $envFile = Join-Path $r.Path ".env.worktree"
  $env = Read-EnvMap $envFile
  if ($env.ContainsKey("API_PORT")) { $r.ApiPort = $env["API_PORT"] }
  if ($env.ContainsKey("WEB_PORT")) { $r.WebPort = $env["WEB_PORT"] }
  if ($env.ContainsKey("VAULT_PATH")) { $r.VaultPath = $env["VAULT_PATH"] }
}

$records | Format-Table Path, Branch, ApiPort, WebPort, VaultPath -AutoSize
