$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'www'

New-Item -ItemType Directory -Path $output -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'css') -Destination $output -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'js') -Destination $output -Recurse -Force
Get-ChildItem -Path $root -Filter '*.html' -File | Copy-Item -Destination $output -Force
Copy-Item -LiteralPath (Join-Path $root 'firebase-messaging-sw.js') -Destination $output -Force
Copy-Item -LiteralPath (Join-Path $root 'manifest.json') -Destination $output -Force
Copy-Item -LiteralPath (Join-Path $root 'icons') -Destination $output -Recurse -Force
if (Test-Path -LiteralPath (Join-Path $root 'screenshots')) {
  Copy-Item -LiteralPath (Join-Path $root 'screenshots') -Destination $output -Recurse -Force
}
if (Test-Path -LiteralPath (Join-Path $root '.well-known')) {
  Copy-Item -LiteralPath (Join-Path $root '.well-known') -Destination $output -Recurse -Force
}
