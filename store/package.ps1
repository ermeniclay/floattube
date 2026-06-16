# Packages FloatTube into dist/floattube-vX.Y.Z.zip for the Chrome Web Store.
# Run from anywhere:  pwsh ./store/package.ps1
# The ZIP keeps manifest.json at its ROOT and excludes dev/store files.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # project root (parent of /store)

# Read version from manifest.json
$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
$version = $manifest.version
Write-Host "FloatTube version $version" -ForegroundColor Cyan

# Files/folders that ship in the extension package
$include = @("manifest.json", "src", "popup", "icons")

# Stage into a temp folder so the zip root is clean
$stage = Join-Path $root ".pkg-stage"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

foreach ($item in $include) {
  $srcPath = Join-Path $root $item
  if (-not (Test-Path $srcPath)) { throw "Missing required item: $item" }
  Copy-Item $srcPath -Destination $stage -Recurse
}

# Output
$dist = Join-Path $root "dist"
if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }
$zip = Join-Path $dist "floattube-v$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host "Created: $zip" -ForegroundColor Green
Write-Host "Upload this ZIP in the Chrome Web Store dashboard." -ForegroundColor Green
