# Final colour pass: teal/legacy-navy -> light-blue palette, applied uniformly to root + www.
# Uses [ordered] hashtables ONLY (a hashtable is a single object, so PowerShell cannot
# flatten the pairs the way it flattened @(@('l','i')) and caused the l->i disaster).
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\ybhar_9sumasa\OneDrive\Desktop\project'
$www  = Join-Path $root 'www'

function Read-Text($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function Save-Text($p, $t, $crlf) {
  $t = $t -replace "`r`n", "`n"
  if ($crlf) { $t = $t -replace "`n", "`r`n" }
  [System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
}

# ---- Pass A: teal + legacy navies -> the "lighter-blue" intermediates ----
$passA = [ordered]@{
  '#176b87' = '#3b82f6'; 'rgba(23,107,135' = 'rgba(59,130,246'
  'rgba(31,168,154' = 'rgba(96,165,250'; 'rgba(25,70,79' = 'rgba(15,23,42'
  '#075985' = '#2563eb'; '#0f766e' = '#2563eb'; '#14b8a6' = '#3b82f6'; '#5eead4' = '#93c5fd'
  '#0b7d7d' = '#3b82f6'; '#0b5c5c' = '#2563eb'; 'rgba(11,91,91' = 'rgba(37,99,235'
  '#0f3076' = '#2563eb'; '#1448b8' = '#3b82f6'; '#2c4780' = '#2563eb'; '#173a87' = '#2563eb'
  '#082d7d' = '#2563eb'; '#0b2e78' = '#2563eb'; '#0638a5' = '#2563eb'; '#0b307f' = '#2563eb'
  '#103b99' = '#2563eb'; '#1046b9' = '#3b82f6'; '#19429c' = '#2563eb'
  '#fbfdfd' = '#fbfdff'; '#eef5f5' = '#eff5ff'; '#eef6f6' = '#eff5ff'
  '#f4f8f8' = '#f7faff'; '#f3f8f8' = '#f5f9ff'; '#f7fbfb' = '#f7fbff'; '#e9f3f1' = '#eef5ff'
  '#f4f9f8' = '#f5f9ff'; '#edf6f4' = '#eef5ff'; '#eaf5f3' = '#eef5ff'
  '#f5faf9' = '#f5f9ff'; '#f0f7f6' = '#eff5ff'; '#f4fafb' = '#f7faff'
  '#2c3b3b' = '#1e293b'; '#5b6b6b' = '#64748b'
}

# ---- Pass B: lighter-blue -> final softer-blue palette ----
$passB = [ordered]@{
  '#60a5fa' = '#93c5fd'
  '#3b82f6' = '#60a5fa'
  '#2563eb' = '#3b82f6'
  '#f6f9fe' = '#f7faff'
  '#e4e8f0' = '#e8eef9'
  '#141b2b' = '#171f30'
  '#1c2438' = '#1e273c'
  '#2e3a54' = '#313d58'
}

# ---- Pass C: literal + contrast fixes ----
$litFrom = 'linear-gradient(120deg, var(--primary), #19429c)'
$litTo   = 'linear-gradient(120deg, var(--primary), var(--primary-dark))'
$rxPairs = [ordered]@{
  '(\.drawer-logo \{[^}]*?)background:\s*var\(--primary\)'     = '${1}background:var(--primary-dark)'
  '(\.profile-avatar \{[^}]*?)background:\s*var\(--primary\)'  = '${1}background:var(--primary-dark)'
  '(\.app-sidebar-mark \{[^}]*?)background:\s*var\(--primary\)'= '${1}background:var(--primary-dark)'
  '(\.app-assist-fab \{[^}]*?)background:\s*var\(--primary\)'  = '${1}background:var(--primary-dark)'
  '(\.balance-strip \{[^}]*?)background:\s*var\(--primary\)'   = '${1}background:var(--primary-dark)'
  '(\.bubble\.user \{[^}]*?)background:\s*var\(--teal\)'       = '${1}background:var(--teal-dark)'
  '(\.send \{[^}]*?)background:\s*var\(--teal\)'               = '${1}background:var(--teal-dark)'
  '(\.name-form button \{[^}]*?)background:\s*var\(--teal\)'   = '${1}background:var(--teal-dark)'
  '(\.link-btn \{[^}]*?)color:\s*var\(--teal\)'                = '${1}color:var(--teal-dark)'
  'color:\s*var\(--primary\)'                                  = 'color:var(--primary-dark)'
  '(<meta name="theme-color" content=")#[0-9a-fA-F]{6}(")'     = '${1}#60a5fa${2}'
}

$files = @()
foreach ($d in @($root, $www)) {
  $files += Get-ChildItem -LiteralPath (Join-Path $d 'css') -Filter *.css -File -ErrorAction SilentlyContinue
  $files += Get-ChildItem -LiteralPath $d -Filter *.html -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike 'SYNOPSIS*' -and $_.Name -notlike 'temp_*' }
  $files += Get-ChildItem -LiteralPath (Join-Path $d 'js') -Filter *.js -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\vendor\\' }
  $m = Join-Path $d 'manifest.json'; if (Test-Path -LiteralPath $m) { $files += Get-Item -LiteralPath $m }
}

foreach ($f in $files) {
  $t = Read-Text $f.FullName; $crlf = $t.Contains("`r`n"); $n = 0
  foreach ($k in $passA.Keys) { if ($t.Contains($k)) { $n += ([regex]::Matches($t, [regex]::Escape($k))).Count; $t = $t.Replace($k, $passA[$k]) } }
  foreach ($k in $passB.Keys) { if ($t.Contains($k)) { $n += ([regex]::Matches($t, [regex]::Escape($k))).Count; $t = $t.Replace($k, $passB[$k]) } }
  if ($t.Contains($litFrom)) { $n += ([regex]::Matches($t, [regex]::Escape($litFrom))).Count; $t = $t.Replace($litFrom, $litTo) }
  foreach ($pat in $rxPairs.Keys) { $c = ([regex]::Matches($t, $pat)).Count; if ($c -gt 0) { $n += $c; $t = [regex]::Replace($t, $pat, $rxPairs[$pat]) } }
  if ($n -gt 0) { Save-Text $f.FullName $t $crlf; "  {0,-42} {1,4} changes" -f $f.FullName.Replace($root,''), $n }
}
"done"
