# Even lighter/softer blue (blue-400) + keep white-on-blue elements readable.
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\ybhar_9sumasa\OneDrive\Desktop\project'
$dirs = @($root, (Join-Path $root 'www'))

function Read-Text($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function Save-Text($p, $t, $crlf) {
  $t = $t -replace "`r`n", "`n"
  if ($crlf) { $t = $t -replace "`n", "`r`n" }
  [System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
}

# ---- A. hex chain (order matters) ----
$hexChain = @(
  @('#60a5fa', '#93c5fd'),   # old accent  -> new accent
  @('#3b82f6', '#60a5fa'),   # old primary -> new primary (softer sky)
  @('#2563eb', '#3b82f6'),   # old dark    -> new dark
  @('#f6f9fe', '#f7faff'),   # page bg, brighter
  @('#e4e8f0', '#e8eef9'),   # border, softer
  @('#141b2b', '#171f30'),   # dark bg, slightly lifted
  @('#1c2438', '#1e273c'),   # dark card
  @('#2e3a54', '#313d58')    # dark border
)

# ---- B. gradient / contrast fixes ----
$lit = @(
  @('linear-gradient(120deg, var(--primary), #19429c)', 'linear-gradient(120deg, var(--primary), var(--primary-dark))')
)

# ---- C. regex swaps: light blue text/bg -> deeper blue where needed ----
$rx = @(
  @('(\.drawer-logo \{[^}]*?)background:\s*var\(--primary\)', '${1}background:var(--primary-dark)'),
  @('(\.profile-avatar \{[^}]*?)background:\s*var\(--primary\)', '${1}background:var(--primary-dark)'),
  @('(\.app-sidebar-mark \{[^}]*?)background:\s*var\(--primary\)', '${1}background:var(--primary-dark)'),
  @('(\.app-assist-fab \{[^}]*?)background:\s*var\(--primary\)', '${1}background:var(--primary-dark)'),
  @('(\.balance-strip \{[^}]*?)background:\s*var\(--primary\)', '${1}background:var(--primary-dark)'),
  @('(\.bubble\.user \{[^}]*?)background:\s*var\(--teal\)', '${1}background:var(--teal-dark)'),
  @('(\.send \{[^}]*?)background:\s*var\(--teal\)', '${1}background:var(--teal-dark)'),
  @('(\.name-form button \{[^}]*?)background:\s*var\(--teal\)', '${1}background:var(--teal-dark)'),
  @('(\.link-btn \{[^}]*?)color:\s*var\(--teal\)', '${1}color:var(--teal-dark)'),
  @('color:\s*var\(--primary\)', 'color:var(--primary-dark)')
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
  foreach ($p in $hexChain) { if ($t.Contains($p[0])) { $n += ([regex]::Matches($t, [regex]::Escape($p[0]))).Count; $t = $t.Replace($p[0], $p[1]) } }
  foreach ($p in $lit)      { if ($t.Contains($p[0])) { $n += ([regex]::Matches($t, [regex]::Escape($p[0]))).Count; $t = $t.Replace($p[0], $p[1]) } }
  foreach ($p in $rx)       { $c = ([regex]::Matches($t, $p[0])).Count; if ($c -gt 0) { $n += $c; $t = [regex]::Replace($t, $p[0], $p[1]) } }
  if ($n -gt 0) { Save-Text $f.FullName $t $crlf; "  {0,-42} {1}" -f $f.FullName.Replace($root,''), $n }
}
"done"
