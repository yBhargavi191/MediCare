# Follow-up: flatten leftover gradients after the teal->blue shift, then verify.
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
function Fix-File($file, $pairs) {
  if (-not (Test-Path -LiteralPath $file)) { return }
  $t = Read-Text $file; $crlf = $t.Contains("`r`n"); $n = 0
  foreach ($p in $pairs) {
    if ($t.Contains($p[0])) { $n += ([regex]::Matches($t, [regex]::Escape($p[0]))).Count; $t = $t.Replace($p[0], $p[1]) }
    else { "  MISS $($file.Replace($root,'')) :: " + $p[0].Substring(0,[Math]::Min(60,$p[0].Length)) }
  }
  Save-Text $file $t $crlf
  "  fixed $($file.Replace($root,'')) -> $n"
}

$style = @(
  @('linear-gradient(180deg, #20242d, #1a1e27)', 'var(--card)'),
  @('linear-gradient(135deg, #1a1f29, #151820 55%, #1d212a)', 'var(--bg)'),
  @('linear-gradient(180deg, #f8fafd 0%, #edf0f7 100%)', 'var(--card)'),
  @('linear-gradient(135deg, #e8ecf4, #f7f8fa 55%, #e9ecf3)', 'var(--bg)'),
  @('linear-gradient(90deg, var(--accent), #6482c3)', 'var(--primary)'),
  @('linear-gradient(135deg, #10285b, #173473)', 'var(--primary-dark)'),
  @('linear-gradient(90deg,#173a87,#22c55e)', 'var(--primary)')
)
foreach ($d in $dirs) { Fix-File (Join-Path $d 'css\style.css') $style }

# ---- verification: any colour still in the teal/cyan band? ----
function Get-Hsl($hex) {
  $h = $hex.TrimStart('#')
  if ($h.Length -ne 6) { return $null }
  $r=[Convert]::ToInt32($h.Substring(0,2),16)/255.0; $g=[Convert]::ToInt32($h.Substring(2,2),16)/255.0; $b=[Convert]::ToInt32($h.Substring(4,2),16)/255.0
  $max=[Math]::Max($r,[Math]::Max($g,$b)); $min=[Math]::Min($r,[Math]::Min($g,$b)); $d=$max-$min
  if ($d -eq 0) { $hue=0 } elseif ($max -eq $r) { $hue=60*((($g-$b)/$d) % 6) } elseif ($max -eq $g) { $hue=60*((($b-$r)/$d)+2) } else { $hue=60*((($r-$g)/$d)+4) }
  if ($hue -lt 0) { $hue += 360 }
  $l=($max+$min)/2
  if ($d -eq 0) { $s=0 } else { $s = $d/(1-[Math]::Abs(2*$l-1)) }
  return @($hue,$s,$l)
}
$exclude = @('#16856b','#4cbd9d','#22c55e','#16a34a','#15803d','#0f7a4f','#45dc6e','#f43f5e','#dc2626','#16a34a')
"`n---- remaining teal-band colours (hue 158-205, sat > 8%) ----"
$targets = @()
foreach ($d in $dirs) {
  $targets += Get-ChildItem -LiteralPath $d -Include *.css,*.html,*.js -File -Recurse -Depth 1 |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\android\\|\\vercel-api\\' -and $_.Name -notlike 'SYNOPSIS*' -and $_.Name -ne 'confetti.browser.min.js' }
}
foreach ($f in $targets) {
  $t = Read-Text $f.FullName
  $hits = @{}
  foreach ($m in [regex]::Matches($t, '#[0-9a-fA-F]{6}\b')) {
    $v=$m.Value.ToLower(); if ($exclude -contains $v) { continue }
    $hsl = Get-Hsl $v
    if ($hsl -and $hsl[0] -ge 158 -and $hsl[0] -le 205 -and $hsl[1] -gt 0.08 -and $hsl[2] -lt 0.9) { $hits[$v]=$true }
  }
  foreach ($m in [regex]::Matches($t, 'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)')) {
    $r=[int]$m.Groups[1].Value; $g=[int]$m.Groups[2].Value; $b=[int]$m.Groups[3].Value
    $hexv='#{0:x2}{1:x2}{2:x2}' -f $r,$g,$b
    if ($exclude -contains $hexv) { continue }
    $hsl = Get-Hsl $hexv
    if ($hsl -and $hsl[0] -ge 158 -and $hsl[0] -le 205 -and $hsl[1] -gt 0.08 -and $hsl[2] -lt 0.9) { $hits["rgb($r,$g,$b)"]=$true }
  }
  if ($hits.Count) { "  $($f.FullName.Replace($root,''))`n      " + (($hits.Keys | Sort-Object) -join ' ') }
}

"`n---- fitness-pages.css sanity ----"
$fp = "$root\css\fitness-pages.css"
$c = Read-Text $fp
"  size=$($c.Length)  var(--primary-soft) count=" + ([regex]::Matches($c, [regex]::Escape('var(--primary-soft)')).Count)
