$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Path $out -Force | Out-Null

function New-RoundedPath([int]$w, [int]$h, [int]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc(0, 0, $d, $d, 180, 90)
  $p.AddArc($w - $d, 0, $d, $d, 270, 90)
  $p.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
  $p.AddArc(0, $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-Icon([int]$size, [string]$file, [double]$scale, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $c1 = [System.Drawing.Color]::FromArgb(23, 107, 135)
  $c2 = [System.Drawing.Color]::FromArgb(31, 168, 154)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45.0

  if ($rounded) {
    $r = [int]($size * 0.22)
    $g.FillPath($brush, (New-RoundedPath $size $size $r))
  } else {
    $g.FillRectangle($brush, $rect)
  }

  $box = $size * $scale
  $cx = $size / 2.0
  $top = ($size - $box) / 2.0
  $lobeR = $box * 0.27
  $lcx = $cx - $box * 0.23
  $rcx = $cx + $box * 0.23
  $lcy = $top + $box * 0.32
  $white = [System.Drawing.Brushes]::White

  $g.FillEllipse($white, [float]($lcx - $lobeR), [float]($lcy - $lobeR), [float]($lobeR * 2), [float]($lobeR * 2))
  $g.FillEllipse($white, [float]($rcx - $lobeR), [float]($lcy - $lobeR), [float]($lobeR * 2), [float]($lobeR * 2))

  $tri = @(
    (New-Object System.Drawing.PointF ([float]($lcx - $lobeR), [float]$lcy)),
    (New-Object System.Drawing.PointF ([float]($rcx + $lobeR), [float]$lcy)),
    (New-Object System.Drawing.PointF ([float]$cx, [float]($top + $box)))
  )
  $g.FillPolygon($white, $tri)

  $penColor = [System.Drawing.Color]::FromArgb(15, 95, 120)
  $pen = New-Object System.Drawing.Pen $penColor, ([float]($box * 0.075))
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $py = $top + $box * 0.58
  $pts = @(
    (New-Object System.Drawing.PointF ([float]($cx - $box * 0.30), [float]$py)),
    (New-Object System.Drawing.PointF ([float]($cx - $box * 0.14), [float]$py)),
    (New-Object System.Drawing.PointF ([float]($cx - $box * 0.05), [float]($py - $box * 0.16))),
    (New-Object System.Drawing.PointF ([float]($cx + $box * 0.08), [float]($py + $box * 0.18))),
    (New-Object System.Drawing.PointF ([float]($cx + $box * 0.17), [float]$py)),
    (New-Object System.Drawing.PointF ([float]($cx + $box * 0.31), [float]$py))
  )
  $g.DrawLines($pen, $pts)

  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose()
  $brush.Dispose()
  $g.Dispose()
  $bmp.Dispose()
}

New-Icon 192 (Join-Path $out 'icon-192.png') 0.72 $true
New-Icon 512 (Join-Path $out 'icon-512.png') 0.72 $true
New-Icon 192 (Join-Path $out 'icon-maskable-192.png') 0.60 $false
New-Icon 512 (Join-Path $out 'icon-maskable-512.png') 0.60 $false
New-Icon 180 (Join-Path $out 'apple-touch-icon.png') 0.72 $true

Write-Output "Icons written to $out"
Get-ChildItem -LiteralPath $out | Select-Object Name, Length
