$ErrorActionPreference = 'Stop'

# Mirrors the web build (www/) into the Android app's bundled assets.
#
#   /E  copy everything, but never delete extras. Capacitor injects
#       cordova.js and cordova_plugins.js into the assets, which www/ does
#       not contain, so a mirror-and-purge (/MIR) would break the app.
#   /XF never copy the web-only download archive into the app. It is about
#       6.5 MB and only exists so app-download.html can offer "Download as
#       ZIP" on the hosted site, so it must stay out of the APK.
#
# Keep this file ASCII-only: Windows PowerShell 5.1 reads .ps1 files as ANSI,
# and non-ASCII punctuation gets mangled into a parse error.
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'www'
$dest = Join-Path $root 'android\app\src\main\assets\public'

if (-not (Test-Path -LiteralPath $src)) {
  throw "Web build not found at $src. Run scripts\build-web.ps1 first."
}

New-Item -ItemType Directory -Path $dest -Force | Out-Null
robocopy $src $dest /E /XF MediCare.zip /NFL /NDL /NJH /NJS /NP | Out-Null
$code = $LASTEXITCODE
if ($code -ge 8) { throw "robocopy failed with exit code $code" }

# Belt and braces: drop any archive left over from an earlier sync.
$stale = Join-Path $dest 'MediCare.zip'
if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale -Force }

Write-Host "Synced www -> android assets (robocopy exit $code)."
