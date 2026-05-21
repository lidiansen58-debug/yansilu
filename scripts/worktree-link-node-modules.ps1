param()

$ErrorActionPreference = "Stop"

function Get-CanonicalPath([string]$InputPath) {
  return [System.IO.Path]::GetFullPath($InputPath)
}

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null).Trim()
  if (-not $root) {
    throw "Not inside a git repository."
  }
  return (Get-CanonicalPath $root)
}

function Get-PrimaryCheckout([string]$CurrentRoot) {
  $lines = & git -C $CurrentRoot worktree list --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw "git worktree list failed."
  }

  $paths = @()
  foreach ($line in $lines) {
    if ($line.StartsWith("worktree ")) {
      $paths += (Get-CanonicalPath $line.Substring(9).Trim())
    }
  }

  foreach ($path in $paths) {
    $gitPath = Join-Path $path ".git"
    if ($path -ne $CurrentRoot -and (Test-Path -LiteralPath $gitPath -PathType Container)) {
      return $path
    }
  }

  throw "Could not find the primary checkout from git worktree list."
}

$repoRoot = Get-RepoRoot
$primaryCheckout = Get-PrimaryCheckout $repoRoot
$sourceNodeModules = Join-Path $primaryCheckout "node_modules"
$targetNodeModules = Join-Path $repoRoot "node_modules"

if (-not (Test-Path -LiteralPath $sourceNodeModules -PathType Container)) {
  throw "Primary checkout node_modules not found: $sourceNodeModules"
}

if (Test-Path -LiteralPath $targetNodeModules) {
  $item = Get-Item -LiteralPath $targetNodeModules -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -and $item.LinkType -eq "Junction") {
    Write-Output "node_modules junction already exists: $targetNodeModules"
    exit 0
  }
  throw "Refusing to replace existing node_modules at $targetNodeModules. Remove it manually if you want to link the primary checkout dependency tree."
}

New-Item -ItemType Junction -Path $targetNodeModules -Target $sourceNodeModules | Out-Null
Write-Output "Linked worktree node_modules:"
Write-Output "  from: $sourceNodeModules"
Write-Output "  to:   $targetNodeModules"

