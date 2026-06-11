param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [ValidateSet("feat", "fix", "docs", "chore", "spike")]
  [string]$Kind = "feat",

  [string]$Base = "main",
  [string]$Theme = "",
  [ValidateSet("long-lived", "temporary", "review")]
  [string]$Lifecycle = "temporary",
  [string]$Root = "",
  [int]$ApiPort = 0,
  [int]$WebPort = 0
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null).Trim()
  if (-not $root) {
    throw "Not inside a git repository."
  }
  return $root
}

function Normalize-Slug([string]$Text) {
  $slug = $Text.ToLower() -replace "[^a-z0-9\-]", "-"
  $slug = $slug -replace "-{2,}", "-"
  return $slug.Trim("-")
}

function Read-EnvMap([string]$FilePath) {
  $map = @{}
  if (-not (Test-Path -LiteralPath $FilePath)) { return $map }

  foreach ($rawLine in (Get-Content -Encoding UTF8 -LiteralPath $FilePath)) {
    $line = $rawLine.Trim()
    if (-not $line) { continue }
    if ($line.StartsWith("#")) { continue }
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
      $map[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $map
}

function Get-ListeningPorts {
  $used = [System.Collections.Generic.HashSet[int]]::new()
  try {
    Get-NetTCPConnection -State Listen -ErrorAction Stop | ForEach-Object {
      $port = 0
      if ([int]::TryParse([string]$_.LocalPort, [ref]$port) -and $port -gt 0) {
        [void]$used.Add($port)
      }
    }
    $used
    return
  } catch {
    foreach ($line in (& netstat -ano -p tcp 2>$null)) {
      if ($line -match "^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+\d+\s*$") {
        [void]$used.Add([int]$Matches[1])
      }
    }
    $used
    return
  }
}

function Get-UsedPorts([string]$RootDir) {
  $used = [System.Collections.Generic.HashSet[int]]::new()
  if (Test-Path -LiteralPath $RootDir) {
    Get-ChildItem -Recurse -File -LiteralPath $RootDir -Filter ".env.worktree" -ErrorAction SilentlyContinue | ForEach-Object {
      $envMap = Read-EnvMap $_.FullName
      foreach ($k in @("API_PORT", "WEB_PORT")) {
        if ($envMap.ContainsKey($k)) {
          $n = 0
          if ([int]::TryParse($envMap[$k], [ref]$n)) {
            [void]$used.Add($n)
          }
        }
      }
    }
  }

  foreach ($port in (Get-ListeningPorts)) {
    if ($port -is [int]) {
      [void]$used.Add($port)
    }
  }
  return (, $used)
}

function Next-FreePort([int]$Start, [int]$Step, [System.Collections.Generic.HashSet[int]]$Used) {
  $p = $Start
  while ($Used.Contains($p)) {
    $p += $Step
  }
  return $p
}

function Ensure-Vault([string]$RepoRoot, [string]$VaultPath) {
  $template = Join-Path $RepoRoot "vault-example\yansilu-vault"
  if ((Test-Path -LiteralPath $template) -and -not (Test-Path -LiteralPath $VaultPath)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $VaultPath) | Out-Null
    Copy-Item -LiteralPath $template -Destination $VaultPath -Recurse -Force
    return
  }

  New-Item -ItemType Directory -Force -Path $VaultPath | Out-Null
  foreach ($d in @(
    "notes\fleeting", "notes\literature", "notes\permanent", "notes\index", "notes\projects",
    "assets\pdf", "assets\images", "assets\audio",
    "imports\zotero", "imports\readwise", "imports\notebooklm", "imports\obsidian",
    "exports", ".yansilu"
  )) {
    New-Item -ItemType Directory -Force -Path (Join-Path $VaultPath $d) | Out-Null
  }
  if (-not (Test-Path -LiteralPath (Join-Path $VaultPath ".yansilu\settings.json"))) {
    "{}" | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $VaultPath ".yansilu\settings.json")
  }
  if (-not (Test-Path -LiteralPath (Join-Path $VaultPath ".yansilu\import-map.json"))) {
    "{}" | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $VaultPath ".yansilu\import-map.json")
  }
}

function Resolve-BaseRef([string]$RepoRoot, [string]$BaseBranch) {
  & git -C $RepoRoot fetch origin 2>$null | Out-Null
  $remoteRef = "refs/remotes/origin/$BaseBranch"
  & git -C $RepoRoot show-ref --verify --quiet $remoteRef
  if ($LASTEXITCODE -eq 0) {
    return "origin/$BaseBranch"
  }
  return $BaseBranch
}

function SuggestedChecks([string]$ThemeText, [string]$KindName) {
  $theme = ($ThemeText | Out-String).Trim().ToLower()
  if ($theme -match "ai|inbox|suggestion|artifact|canonical") {
    return @(
      "node --test ./tests/unit/web-ai-inbox-model.test.mjs ./tests/unit/web-ai-inbox-panel.test.mjs",
      "node --test ./tests/integration/api-ai-suggestions-canonical.test.mjs ./tests/integration/api-ai-canonical-response.test.mjs"
    )
  }
  if ($theme -match "paper|translation|workspace") {
    return @(
      "node --test ./tests/unit/web-paper-workspace-model.test.mjs ./tests/unit/web-paper-workspace-panel.test.mjs",
      "node --test ./tests/e2e/prototype-browser.test.mjs"
    )
  }
  if ($theme -match "graph|writing|main-path|product") {
    return @(
      "node --test ./tests/unit/web-note-browser-actions.test.mjs ./tests/unit/web-prototype-api.test.mjs",
      "node --test ./tests/e2e/prototype-browser.test.mjs"
    )
  }
  if ($KindName -eq "docs") {
    return @("No mandatory code checks. Keep the diff docs-only.")
  }
  return @(
    "git status --short --branch",
    "node --test"
  )
}

function Write-WorktreeManifest([string]$WorktreePath, [string]$WorktreeName, [string]$BranchName, [string]$BaseRef, [string]$ThemeText, [string]$LifecycleName, [string[]]$Checks) {
  $manifestPath = Join-Path $WorktreePath "WORKTREE.md"
  $scope = if ([string]::IsNullOrWhiteSpace($ThemeText)) { $WorktreeName } else { $ThemeText.Trim() }
  $lines = @(
    "# Worktree",
    "",
    "Name: $WorktreeName",
    "Branch: $BranchName",
    "Created from: $BaseRef",
    "Lifecycle: $LifecycleName",
    "",
    "## Theme",
    $scope,
    "",
    "## Sync Rule",
    "Before starting work:",
    "- git fetch origin",
    "- git merge main",
    "",
    "Before pushing:",
    "- git fetch origin",
    "",
    "## Suggested Checks"
  )
  foreach ($check in $Checks) {
    $lines += "- $check"
  }
  $lines | Set-Content -Encoding UTF8 -LiteralPath $manifestPath
}

$repoRoot = Get-RepoRoot
$slug = Normalize-Slug $Name
if (-not $slug) { throw "Name must contain at least one letter or number." }

if ([string]::IsNullOrWhiteSpace($Root)) {
  $repoParent = Split-Path -Parent $repoRoot
  if ([string]::IsNullOrWhiteSpace($repoParent)) {
    throw "Unable to determine the parent directory for repo root: $repoRoot"
  }
  $Root = Join-Path $repoParent "yansilu-wt"
}

New-Item -ItemType Directory -Force -Path $Root | Out-Null

$branch = "$Kind/$slug"
$worktreeDirName = "$Kind-$slug"
$worktreePath = Join-Path $Root $worktreeDirName
$baseRef = Resolve-BaseRef $repoRoot $Base

if (Test-Path -LiteralPath $worktreePath) {
  throw "Worktree path already exists: $worktreePath"
}

$null = & git -C $repoRoot show-ref --verify --quiet "refs/heads/$branch"
$branchExists = ($LASTEXITCODE -eq 0)

if ($branchExists) {
  & git -C $repoRoot worktree add "$worktreePath" "$branch"
} else {
  & git -C $repoRoot worktree add -b "$branch" "$worktreePath" "$baseRef"
}
if ($LASTEXITCODE -ne 0) {
  throw "git worktree add failed."
}

$usedPorts = Get-UsedPorts $Root
if ($ApiPort -le 0) {
  $ApiPort = Next-FreePort 3000 100 $usedPorts
}
[void]$usedPorts.Add($ApiPort)

if ($WebPort -le 0) {
  $offset = [math]::Floor(($ApiPort - 3000) / 100)
  $candidate = 5173 + (100 * $offset)
  while ($usedPorts.Contains($candidate)) {
    $candidate += 100
  }
  $WebPort = $candidate
}
if ($usedPorts.Contains($WebPort)) {
  throw "WebPort already in use by another worktree: $WebPort"
}

$vaultRoot = Join-Path $Root "_vaults"
$vaultPath = Join-Path (Join-Path $vaultRoot $worktreeDirName) "yansilu-vault"
Ensure-Vault $repoRoot $vaultPath

$envFile = Join-Path $worktreePath ".env.worktree"
$envLines = @(
  "# Auto generated by scripts/worktree-create.ps1",
  "WORKTREE_NAME=$worktreeDirName",
  "WORKTREE_BRANCH=$branch",
  "API_PORT=$ApiPort",
  "WEB_PORT=$WebPort",
  "API_BASE=http://localhost:$ApiPort",
  ("VAULT_PATH=" + ($vaultPath -replace "\\", "/"))
)
$envLines | Set-Content -Encoding UTF8 -LiteralPath $envFile

$checks = SuggestedChecks $Theme $Kind
Write-WorktreeManifest $worktreePath $worktreeDirName $branch $baseRef $Theme $Lifecycle $checks

Write-Output "Created worktree: $worktreePath"
Write-Output "Branch: $branch"
Write-Output "Base ref: $baseRef"
Write-Output "Env file: $envFile"
Write-Output "Manifest: $(Join-Path $worktreePath 'WORKTREE.md')"
Write-Output "API_PORT=$ApiPort WEB_PORT=$WebPort"
Write-Output "VAULT_PATH=$vaultPath"
Write-Output "Next: cd `"$worktreePath`" ; ./scripts/worktree-run-dev.ps1"
