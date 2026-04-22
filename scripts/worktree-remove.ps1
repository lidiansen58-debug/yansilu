param(
  [Parameter(Mandatory = $true)]
  [string]$Target,
  [string]$Root = "",
  [switch]$Force,
  [switch]$Prune
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null).Trim()
  if (-not $root) { throw "Not inside a git repository." }
  return $root
}

$repoRoot = Get-RepoRoot
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = Join-Path ([System.IO.Path]::GetDirectoryName($repoRoot)) "yansilu-wt"
}

function Resolve-TargetPath([string]$InputTarget) {
  if (Test-Path -LiteralPath $InputTarget) {
    return (Resolve-Path -LiteralPath $InputTarget).Path
  }
  $candidate = Join-Path $Root $InputTarget
  if (Test-Path -LiteralPath $candidate) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }
  throw "Worktree target not found: $InputTarget"
}

$targetPath = Resolve-TargetPath $Target
$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$resolvedRepo = (Resolve-Path -LiteralPath $repoRoot).Path

if ($targetPath -eq $resolvedRepo) {
  throw "Refusing to remove repository root."
}

if (-not $targetPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove worktree outside root: $resolvedRoot"
}

$args = @("-C", $repoRoot, "worktree", "remove")
if ($Force) { $args += "--force" }
$args += $targetPath

& git @args
if ($LASTEXITCODE -ne 0) { throw "git worktree remove failed." }

if ($Prune) {
  & git -C $repoRoot worktree prune
  if ($LASTEXITCODE -ne 0) { throw "git worktree prune failed." }
}

Write-Output "Removed worktree: $targetPath"
