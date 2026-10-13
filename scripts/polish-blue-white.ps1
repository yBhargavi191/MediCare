# Polish: convert MediCare to a consistent blue + white professional theme.
# Literal replacements for brand tokens/gradients, then a hue-shift of leftover teal.
$ErrorActionPreference = 'Stop'

$root = 'C:\Users\ybhar_9sumasa\OneDrive\Desktop\project'
$www  = Join-Path $root 'www'
$dirs = @($root, $www)

$backup = Join-Path $env:TEMP ('medicare-polish-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null

function Read-Text($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function Save-Text($p, $t, $crlf) {
  $t = $t -replace "`r`n", "`n"
  if ($crlf) { $t = $t -replace "`n", "`r`n" }
  [System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
}
function Backup-File($file) {
  $rel = $file.Replace($root, '')
  $bak = Join-Path $backup ($rel -replace '[\\/]', '_')
  Copy-Item -LiteralPath $file -Destination $bak -Force
}

$report = New-Object System.Collections.ArrayList
function Note($s) { [void]$report.Add($s) }

# ---------- colour helpers ----------
function Get-Hsl($hex) {
  $h = $hex.TrimStart('#')
  if ($h.Length -ne 6) { return $null }
  $r=[Convert]::ToInt32($h.Substring(0,2),16)/255.0
  $g=[Convert]::ToInt32($h.Substring(2,2),16)/255.0
  $b=[Convert]::ToInt32($h.Substring(4,2),16)/255.0
  $max=[Math]::Max($r,[Math]::Max($g,$b)); $min=[Math]::Min($r,[Math]::Min($g,$b)); $d=$max-$min
  if ($d -eq 0) { $hue=0 } elseif ($max -eq $r) { $hue=60*((($g-$b)/$d) % 6) } elseif ($max -eq $g) { $hue=60*((($b-$r)/$d)+2) } else { $hue=60*((($r-$g)/$d)+4) }
  if ($hue -lt 0) { $hue += 360 }
  $l=($max+$min)/2
  if ($d -eq 0) { $s=0 } else { $s = $d/(1-[Math]::Abs(2*$l-1)) }
  return @($hue,$s,$l)
}
function Hsl-ToHex($h,$s,$l) {
  $c = (1 - [Math]::Abs(2*$l - 1)) * $s
  $hp = $h / 60.0
  $x = $c * (1 - [Math]::Abs(($hp % 2) - 1))
  $r=0;$g=0;$b=0
  if ($hp -lt 1) { $r=$c; $g=$x } elseif ($hp -lt 2) { $r=$x; $g=$c } elseif ($hp -lt 3) { $g=$c; $b=$x } elseif ($hp -lt 4) { $g=$x; $b=$c } elseif ($hp -lt 5) { $r=$x; $b=$c } else { $r=$c; $b=$x }
  $m = $l - $c/2
  $rr = [int][Math]::Round(($r+$m)*255)
  $gg = [int][Math]::Round(($g+$m)*255)
  $bb = [int][Math]::Round(($b+$m)*255)
  return ('#{0:x2}{1:x2}{2:x2}' -f $rr, $gg, $bb)
}

# Semantically green values (success / online) - never shift these.
$excludeHex = @('#16856b', '#4cbd9d', '#22c55e', '#16a34a', '#15803d', '#0f7a4f', '#45dc6e')
$targetHue = 221; $minHue = 158; $maxHue = 205

function Shift-TealToBlue($text) {
  $map = @{}
  foreach ($m in [regex]::Matches($text, '#[0-9a-fA-F]{6}\b')) {
    $v = $m.Value.ToLower()
    if ($map.ContainsKey($m.Value) -or $excludeHex -contains $v) { continue }
    $hsl = Get-Hsl $v
    if ($hsl -and $hsl[0] -ge $minHue -and $hsl[0] -le $maxHue -and $hsl[1] -gt 0.04) {
      $map[$m.Value] = (Hsl-ToHex $targetHue $hsl[1] $hsl[2])
    }
  }
  foreach ($k in @($map.Keys)) { $text = $text.Replace($k, $map[$k]) }

  $rmap = @{}
  foreach ($m in [regex]::Matches($text, 'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)((?:\s*,\s*[\d.]+)?\s*)\)')) {
    $full = $m.Value
    if ($rmap.ContainsKey($full)) { continue }
    $r=[int]$m.Groups[1].Value; $g=[int]$m.Groups[2].Value; $b=[int]$m.Groups[3].Value
    if (($r -eq 255 -and $g -eq 255 -and $b -eq 255) -or ($r -eq 0 -and $g -eq 0 -and $b -eq 0)) { continue }
    $hexv = '#{0:x2}{1:x2}{2:x2}' -f $r, $g, $b
    if ($excludeHex -contains $hexv) { continue }
    $hsl = Get-Hsl $hexv
    if ($hsl -and $hsl[0] -ge $minHue -and $hsl[0] -le $maxHue -and $hsl[1] -gt 0.04) {
      $nh = Hsl-ToHex $targetHue $hsl[1] $hsl[2]
      $nr=[Convert]::ToInt32($nh.Substring(1,2),16); $ng=[Convert]::ToInt32($nh.Substring(3,2),16); $nb=[Convert]::ToInt32($nh.Substring(5,2),16)
      $alpha = $m.Groups[4].Value
      $fn = if ($full -match '^rgba') { 'rgba' } else { 'rgb' }
      $rmap[$full] = "$fn($nr, $ng, $nb$alpha)"
    }
  }
  foreach ($k in @($rmap.Keys)) { $text = $text.Replace($k, $rmap[$k]) }
  return $text
}

function Apply-Literals($file, $pairs, $label) {
  if (-not (Test-Path -LiteralPath $file)) { Note ("MISSING  " + $file.Replace($root,'')); return }
  Backup-File $file
  $t = Read-Text $file
  $crlf = $t.Contains("`r`n")
  $n = 0
  foreach ($pair in $pairs) {
    $old = $pair[0]; $new = $pair[1]
    if ($t.Contains($old)) {
      $n += ([regex]::Matches($t, [regex]::Escape($old))).Count
      $t = $t.Replace($old, $new)
    } else {
      Note ("  MISS " + $label + " :: " + $old.Substring(0, [Math]::Min(64, $old.Length)))
    }
  }
  $t = Shift-TealToBlue $t
  Save-Text $file $t $crlf
  Note ("  " + $label + " " + $file.Replace($root,'') + " -> $n literal + teal-shift")
}

# ---------- 1. style.css tokens ----------
$newLightRoot = @"
:root {
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --accent: #3b82f6;
  --primary-soft: #eff4ff;
  --danger: #dc2626;
  --success: #16a34a;
  --warning: #d97706;
  --bg: #f5f7fb;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e4e8f0;
  --radius: 14px;
  --shadow: 0 1px 2px rgba(15,23,42,.04), 0 10px 30px rgba(15,23,42,.06);
}
"@
$newDarkRoot = @"
:root[data-theme="dark"] {
  color-scheme: dark;
  --primary: #60a5fa;
  --primary-dark: #93c5fd;
  --accent: #3b82f6;
  --primary-soft: #1b2740;
  --danger: #f87171;
  --success: #4ade80;
  --warning: #fbbf24;
  --bg: #0f1420;
  --card: #171e2d;
  --text: #e6ebf5;
  --muted: #94a3b8;
  --border: #263047;
  --shadow: 0 1px 2px rgba(0,0,0,.3), 0 12px 32px rgba(0,0,0,.32);
}
"@
function Apply-TokenBlocks($file) {
  if (-not (Test-Path -LiteralPath $file)) { return }
  Backup-File $file
  $t = Read-Text $file
  $crlf = $t.Contains("`r`n")
  $reDark = New-Object System.Text.RegularExpressions.Regex('(?s):root\[data-theme="dark"\] \{.*?\r?\n\}')
  $reLight = New-Object System.Text.RegularExpressions.Regex('(?s):root \{.*?\r?\n\}')
  $d = $reDark.Match($t); $l = $reLight.Match($t)
  if ($l.Success) { $t = $t.Remove($l.Index, $l.Length).Insert($l.Index, $newLightRoot.TrimEnd()) } else { Note "  MISS light tokens $file" }
  if ($d.Success) { $t = $t.Remove($d.Index, $d.Length).Insert($d.Index, $newDarkRoot.TrimEnd()) } else { Note "  MISS dark tokens $file" }
  $t = Shift-TealToBlue $t
  Save-Text $file $t $crlf
  Note ("  tokens " + $file.Replace($root,''))
}
foreach ($d in $dirs) { Apply-TokenBlocks (Join-Path $d 'css\style.css') }

$stylePairs = @(
  @('linear-gradient(180deg, #202c2d, #1a2727)', 'var(--card)'),
  @('linear-gradient(135deg, #1a2928, #151f20 55%, #1d2a29)', 'var(--bg)'),
  @('linear-gradient(180deg, #f8fdfd 0%, #edf7f6 100%)', 'var(--card)'),
  @('linear-gradient(135deg, var(--primary), var(--accent))', 'var(--primary)'),
  @('linear-gradient(135deg, #e8faf6, #f0faf8)', 'var(--primary-soft)'),
  @('linear-gradient(135deg, #e8f4f3, #f7faf9 55%, #e9f3f1)', 'var(--bg)'),
  @('linear-gradient(120deg, var(--primary), #198f9c)', 'var(--primary)'),
  @('linear-gradient(90deg, var(--accent), #64c3ad)', 'var(--primary)'),
  @('linear-gradient(135deg, #104c5b, #176b73)', 'var(--primary-dark)'),
  @('linear-gradient(135deg,var(--primary),var(--accent))', 'var(--primary)'),
  @('linear-gradient(90deg,#176b87,#22c55e)', 'var(--primary)'),
  @('rgba(23,107,135,.18)', 'rgba(37,99,235,.24)'),
  @('rgba(16,76,91,.16)', 'rgba(29,78,216,.18)'),
  @('rgba(15, 76, 92, 0.15)', 'rgba(29,78,216,.16)')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'css\style.css') $stylePairs 'style.css' }

# ---------- 2. app-shell.css ----------
$shellPairs = @(
  @('linear-gradient(135deg,#effbf8 0%,#f5f7fb 58%,#f8f5fc 100%)', 'var(--bg)'),
  @('linear-gradient(135deg,#142322 0%,#1b202d 58%,#241d2d 100%)', 'var(--bg)'),
  @('background: rgba(249,253,251,.97)', 'background: #ffffff'),
  @('border-right: 1px solid #dfeae8', 'border-right: 1px solid var(--border)'),
  @('linear-gradient(145deg,#09a879,#45dc6e)', 'var(--primary)'),
  @('rgba(9,168,121,.19)', 'rgba(37,99,235,.22)'),
  @('border: 1px solid #d0eee5', 'border: 1px solid var(--border)'),
  @('linear-gradient(135deg,#f0fcf8,#f5fbfa)', 'var(--primary-soft)'),
  @('linear-gradient(120deg, #087f78, #7046a8)', 'var(--primary)'),
  @('rgba(30,60,90,.35)', 'rgba(37,99,235,.32)')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'css\app-shell.css') $shellPairs 'app-shell.css' }

# ---------- 3. dashboard.css ----------
$dashPairs = @(
  @('linear-gradient(135deg, #effbf8 0%, #f4f5fc 56%, #f8f5fc 100%)', 'var(--bg)'),
  @('linear-gradient(135deg, #142322 0%, #1b202d 56%, #241d2d 100%)', 'var(--bg)'),
  @('linear-gradient(135deg, #087f78, #7046a8)', 'var(--primary)'),
  @('linear-gradient(118deg, #087f78 0%, #386fa6 52%, #7046a8 100%)', 'linear-gradient(135deg,#2563eb,#1d4ed8)'),
  @('rgba(55,83,145,.2)', 'rgba(37,99,235,.22)'),
  @('linear-gradient(120deg,#d8314a,#b81f3b)', 'var(--danger)'),
  @('linear-gradient(115deg,#174f58,#286b70)', 'var(--primary)'),
  @('linear-gradient(120deg,#c22f45,#991d34)', 'var(--danger)')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'css\dashboard.css') $dashPairs 'dashboard.css' }

# ---------- 4. fitness-pages.css + admin-pages.css ----------
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'css\fitness-pages.css') @(@('linear-gradient(135deg, #e8faf6, #eef6ff)', 'var(--primary-soft)')) 'fitness-pages.css' }
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'css\admin-pages.css') @() 'admin-pages.css' }

# ---------- 5. profile.html ----------
$profilePairs = @(
  @('background:linear-gradient(135deg,#edf8f6,#f2f7ff)', 'background:var(--primary-soft)'),
  @('background:linear-gradient(135deg,var(--primary),var(--accent))', 'background:var(--primary)')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'profile.html') $profilePairs 'profile.html' }

# ---------- 6. caremate.html ----------
$caremateTokenOld = @"
    :root {
      color-scheme: light;
      --ink: #23404f;
      --muted: #6b8795;
      --teal: #2f9e8f;
      --teal-dark: #24796d;
      --teal-soft: #e0f3ee;
      --blue: #5a9cc7;
      --blue-soft: #e6f1f9;
      --line: #dbeae7;
      --card: #ffffff;
      --danger: #c2544d;
      --danger-soft: #fdecec;
      --sys: "Nunito", "Segoe UI", system-ui, -apple-system, sans-serif;
      font-family: var(--sys);
      color: var(--ink);
      background: #e8f5fa;
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
"@
$caremateTokenNew = @"
    :root {
      color-scheme: light;
      --ink: #0f172a;
      --muted: #64748b;
      --teal: #2563eb;
      --teal-dark: #1d4ed8;
      --teal-soft: #eff4ff;
      --blue: #3b82f6;
      --blue-soft: #eaf0ff;
      --line: #e4e8f0;
      --card: #ffffff;
      --danger: #dc2626;
      --danger-soft: #fef2f2;
      --sys: "DM Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
      font-family: var(--sys);
      color: var(--ink);
      background: #f5f7fb;
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, strong { font-family: "Plus Jakarta Sans", "DM Sans", sans-serif; }
"@
$carematePairs = @(
  @($caremateTokenOld, $caremateTokenNew),
  @('family=Nunito:wght@400;600;700;800&display=swap', 'family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap'),
  @('content="#e8f5fa"', 'content="#2563eb"')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'caremate.html') $carematePairs 'caremate.html' }
foreach ($d in $dirs) {
  $f = Join-Path $d 'caremate.html'
  if (Test-Path -LiteralPath $f) {
    $t = Read-Text $f; $crlf = $t.Contains("`r`n")
    $t2 = [regex]::Replace($t, 'background:\s*\r?\n\s*radial-gradient\([^;]*;', 'background: var(--bg);')
    if ($t2 -ne $t) { Save-Text $f $t2 $crlf; Note ("  caremate stage bg -> var(--bg)  " + $f.Replace($root,'')) }
  }
}

# ---------- 7. loading.js + manifest.json ----------
$loadPairs = @(
  @('<stop offset="0" stop-color="#14b8a6"/>', '<stop offset="0" stop-color="#3b82f6"/>'),
  @('<stop offset="1" stop-color="#0f766e"/>', '<stop offset="1" stop-color="#1d4ed8"/>'),
  @('fill="#5eead4"', 'fill="#93c5fd"')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'js\loading.js') $loadPairs 'loading.js' }
$manPairs = @(
  @('"background_color": "#f4f8f8"', '"background_color": "#f5f7fb"'),
  @('"theme_color": "#176b87"', '"theme_color": "#2563eb"')
)
foreach ($d in $dirs) { Apply-Literals (Join-Path $d 'manifest.json') $manPairs 'manifest.json' }

# ---------- 8. theme-color + teal shift on every html ----------
foreach ($d in $dirs) {
  Get-ChildItem -LiteralPath $d -Filter *.html -File | ForEach-Object {
    if ($_.Name -like 'SYNOPSIS*' -or $_.Name -like 'temp_*') { return }
    Backup-File $_.FullName
    $t = Read-Text $_.FullName; $crlf = $t.Contains("`r`n")
    $o = $t
    $t = $t.Replace('content="#176b87"', 'content="#2563eb"')
    $t = $t.Replace('content="#f4f8f8"', 'content="#f5f7fb"')
    $t = Shift-TealToBlue $t
    if ($t -ne $o) { Save-Text $_.FullName $t $crlf }
  }
}

Note ""
Note ("Backup folder: " + $backup)
$report | ForEach-Object { $_ }
