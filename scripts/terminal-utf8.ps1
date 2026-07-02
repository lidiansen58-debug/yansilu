param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

try {
  chcp 65001 | Out-Null
} catch {
  # Ignore if the host does not expose chcp.
}

if (-not $Quiet) {
  Write-Output "Terminal encoding set to UTF-8."
  Write-Output "Console InputEncoding: $([Console]::InputEncoding.WebName)"
  Write-Output "Console OutputEncoding: $([Console]::OutputEncoding.WebName)"
}
