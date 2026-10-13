# Apply the teal->blue shift to the app JS files that build inline styles.
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\ybhar_9sumasa\OneDrive\Desktop\project'
$dirs = @($root, (Join-Path $root 'www'))

function Read-Text($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function Save-Text($p, $t, $crlf) {
  $t = $t -replace "`r`n", "`n"
  if ($crlf) { $t = $t -replace "`n", "`r`n" }
  [System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
}
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
function Hsl-ToHex($h,$s,$l) {
  $c = (1 - [Math]::Abs(2*$l - 1)) * $s
  $hp = $h / 60.0
  $x = $c * (1 - [Math]::Abs(($hp % 2) - 1))
  $r=0;$g=0;$b=0
  if ($hp -lt 1) { $r=$c; $g=$x } elseif ($hp -lt 2) { $r=$x; $g=$c } elseif ($hp -lt 3) { $g=$c; $b=$x } elseif ($hp -lt 4) { $g=$x; $b=$c } elseif ($hp -lt 5) { $r=$x; $b=$c } else { $r=$c; $b=$x }
  $m = $l - $c/2
  return ('#{0:x2}{1:x2}{2:x2}' -f [int][Math]::Round(($r+$m)*255), [int][Math]::Round(($g+$m)*255), [int][Math]::Round(($b+$m)*255))
}
$excludeHex = @('#16856b','#4cbd9d','#22c55e','#16a34a','#15803d','#0f7a4f','#45dc6e')

function Shift-TealToBlue($text) {
  $map = @{}
  foreach ($m in [regex]::Matches($text, '#[0-9a-fA-F]{6}\b')) {
    $v = $m.Value.ToLower()
    if ($map.ContainsKey($m.Value) -or $excludeHex -contains $v) { continue }
    $hsl = Get-Hsl $v
    if ($hsl -and $hsl[0] -ge 158 -and $hsl[0] -le 205 -and $hsl[1] -gt 0.10 -and $hsl[2] -lt 0.95) { $map[$m.Value] = (Hsl-ToHex 221 $hsl[1] $hsl[2]) }
  }
  foreach ($k in @($map.Keys)) { $text = $text.Replace($k, $map[$k]) }
  $rmap = @{}
  foreach ($m in [regex]::Matches($text, 'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)((?:\s*,\s*[\d.]+)?\s*)\)')) {
    $full = $m.Value
    if ($rmap.ContainsKey($full)) { continue }
    $r=[int]$m.Groups[1].Value; $g=[int]$m.Groups[2].Value; $b=[int]$m.Groups[3].Value
    if (($r -eq 255 -and $g -eq 255 -and $b -eq 255) -or ($r -eq 0 -and $g -eq 0 -and $b -eq 0)) { continue }
    $hexv = '#{0:x2}{1:x2}{2:x2}' -f $r,$g,$b
    if ($excludeHex -contains $hexv) { continue }
    $hsl = Get-Hsl $hexv
    if ($hsl -and $hsl[0] -ge 158 -and $hsl[0] -le 205 -and $hsl[1] -gt 0.10 -and $hsl[2] -lt 0.95) {
      $nh = Hsl-ToHex 221 $hsl[1] $hsl[2]
      $nr=[Convert]::ToInt32($nh.Substring(1,2),16); $ng=[Convert]::ToInt32($nh.Substring(3,2),16); $nb=[Convert]::ToInt32($nh.Substring(5,2),16)
      $rmap[$full] = "rgba($nr, $ng, $nb" + $m.Groups[4].Value + ")"
    }
  }
  foreach ($k in @($rmap.Keys)) { $text = $text.Replace($k, $rmap[$k]) }
  return $text
}

foreach ($d in $dirs) {
  Get-ChildItem -LiteralPath (Join-Path $d 'js') -Filter *.js -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\vendor\\' } | ForEach-Object {
      $t = Read-Text $_.FullName; $crlf = $t.Contains("`r`n")
      $n = Shift-TealToBlue $t
      if ($n -ne $t) { Save-Text $_.FullName $n $crlf; "  shifted " + $_.FullName.Replace($root,'') }
    }
}
"done"
