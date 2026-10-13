# Lighten the palette: blue-600 -> blue-500, brighter surfaces.
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\ybhar_9sumasa\OneDrive\Desktop\project'
$www  = Join-Path $root 'www'
$dirs = @($root, $www)

function Read-Text($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function Save-Text($p, $t, $crlf) {
  $t = $t -replace "`r`n", "`n"
  if ($crlf) { $t = $t -replace "`n", "`r`n" }
  [System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
}

# pairs assigned to a VARIABLE first (never inline @(@(...)) - PS flattens it!)
$pairs = @(
  @('#2563eb', '#3b82f6'),
  @('#1d4ed8', '#2563eb'),
  @('--accent: #3b82f6;', '--accent: #60a5fa;'),
  @('--bg: #f5f7fb;', '--bg: #f6f9fe;'),
  @('#f5f7fb', '#f6f9fe'),
  @('--primary-soft: #eff4ff;', '--primary-soft: #eff6ff;'),
  @('--bg: #0f1420;', '--bg: #141b2b;'),
  @('--card: #171e2d;', '--card: #1c2438;'),
  @('--border: #263047;', '--border: #2e3a54;'),
  # assistant gradients -> brand blue
  @('linear-gradient(135deg, #8fa5d3, #6d8fd9)', 'var(--teal)'),
  @('linear-gradient(135deg, #4f6fb3, #5a7dc7)', 'var(--teal)'),
  @('linear-gradient(135deg, #3f62ae, #5a7dc7)', 'var(--teal)')
)

$files = @()
foreach ($d in $dirs) {
  $files += Get-ChildItem -LiteralPath (Join-Path $d 'css') -Filter *.css -File -ErrorAction SilentlyContinue
  $files += Get-ChildItem -LiteralPath $d -Filter *.html -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike 'SYNOPSIS*' -and $_.Name -notlike 'temp_*' }
  $files += Get-ChildItem -LiteralPath (Join-Path $d 'js') -Filter *.js -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\vendor\\' }
  $m = Join-Path $d 'manifest.json'; if (Test-Path -LiteralPath $m) { $files += Get-Item -LiteralPath $m }
}

foreach ($f in $files) {
  $t = Read-Text $f.FullName; $crlf = $t.Contains("`r`n"); $n = 0
  foreach ($p in $pairs) {
    if ($t.Contains($p[0])) { $n += ([regex]::Matches($t, [regex]::Escape($p[0]))).Count; $t = $t.Replace($p[0], $p[1]) }
  }
  if ($n -gt 0) { Save-Text $f.FullName $t $crlf; "  {0,-42} {1}" -f $f.FullName.Replace($root,''), $n }
}
"done"
