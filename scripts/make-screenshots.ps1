$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'screenshots'
New-Item -ItemType Directory -Path $out -Force | Out-Null

$c1 = [System.Drawing.Color]::FromArgb(23, 107, 135)
$c2 = [System.Drawing.Color]::FromArgb(31, 168, 154)
$bg = [System.Drawing.Color]::FromArgb(244, 248, 248)
$text = [System.Drawing.Color]::FromArgb(24, 52, 61)
$muted = [System.Drawing.Color]::FromArgb(103, 128, 138)
$card = [System.Drawing.Color]::White
$border = [System.Drawing.Color]::FromArgb(220, 233, 233)
$green = [System.Drawing.Color]::FromArgb(22, 133, 107)
$amber = [System.Drawing.Color]::FromArgb(182, 107, 23)

function RoundedPath([int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Heart($g, [float]$cx, [float]$cy, [float]$s, $color) {
  $b = New-Object System.Drawing.SolidBrush $color
  $r = $s * 0.27
  $g.FillEllipse($b, [float]($cx - $s * 0.23 - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))
  $g.FillEllipse($b, [float]($cx + $s * 0.23 - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))
  $tri = @(
    (New-Object System.Drawing.PointF ([float]($cx - $s * 0.23 - $r), [float]$cy)),
    (New-Object System.Drawing.PointF ([float]($cx + $s * 0.23 + $r), [float]$cy)),
    (New-Object System.Drawing.PointF ([float]$cx, [float]($cy + $s * 0.72)))
  )
  $g.FillPolygon($b, $tri)
  $b.Dispose()
}

function NewFont($fam, [float]$size, [string]$style) {
  $fs = [System.Drawing.FontStyle]::Regular
  if ($style -eq 'Bold') { $fs = [System.Drawing.FontStyle]::Bold }
  return New-Object System.Drawing.Font -ArgumentList $fam, $size, $fs, ([System.Drawing.GraphicsUnit]::Pixel)
}

function Txt($g, [string]$s, [float]$x, [float]$y, [float]$size, $color, [string]$style = 'Regular') {
  $fam = New-Object System.Drawing.FontFamily 'Segoe UI'
  $font = NewFont $fam $size $style
  $brush = New-Object System.Drawing.SolidBrush $color
  $g.DrawString($s, $font, $brush, $x, $y)
  $font.Dispose(); $brush.Dispose(); $fam.Dispose()
}

function TxtCenter($g, [string]$s, [float]$cx, [float]$y, [float]$size, $color, [string]$style = 'Regular') {
  $fam = New-Object System.Drawing.FontFamily 'Segoe UI'
  $font = NewFont $fam $size $style
  $brush = New-Object System.Drawing.SolidBrush $color
  $sz = $g.MeasureString($s, $font)
  $g.DrawString($s, $font, $brush, $cx - $sz.Width / 2, $y)
  $font.Dispose(); $brush.Dispose(); $fam.Dispose()
}

function Input($g, [int]$x, [int]$y, [int]$w, [int]$h, [string]$placeholder) {
  $g.FillPath((New-Object System.Drawing.SolidBrush $card), (RoundedPath $x $y $w $h 22))
  $pen = New-Object System.Drawing.Pen $border, 3
  $g.DrawPath($pen, (RoundedPath $x $y $w $h 22))
  $pen.Dispose()
  Txt $g $placeholder ($x + 34) ($y + $h / 2 - 24) 36 $muted
}

function Card($g, [int]$x, [int]$y, [int]$w, [int]$h) {
  $g.FillPath((New-Object System.Drawing.SolidBrush $card), (RoundedPath $x $y $w $h 36))
}

# ---------- Screenshot 1: welcome / login ----------
$bmp = New-Object System.Drawing.Bitmap 1080, 1920
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear($bg)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 0, 0, 1080, 560), $c1, $c2, 60.0
$g.FillRectangle($grad, 0, 0, 1080, 560)
Heart $g 540 210 190 ([System.Drawing.Color]::White)
TxtCenter $g 'MediCare' 540 350 90 ([System.Drawing.Color]::White) 'Bold'
TxtCenter $g 'Smart health reminders' 540 462 36 ([System.Drawing.Color]::FromArgb(225, 245, 245))
Card $g 70 640 940 760
Txt $g 'Welcome back' 110 700 48 $text 'Bold'
Txt $g 'Sign in to keep every dose on track.' 110 772 30 $muted
Input $g 110 850 860 104 'Email address'
Input $g 110 984 860 104 'Password'
$btn = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 110, 1136, 860, 112), $c1, $c2, 0.0
$g.FillPath($btn, (RoundedPath 110 1136 860 112 28))
TxtCenter $g 'Sign in' 540 1168 42 ([System.Drawing.Color]::White) 'Bold'
TxtCenter $g 'New here? Create an account' 540 1288 30 $muted
$g.Dispose()
$bmp.Save((Join-Path $out 'home.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# ---------- Screenshot 2: dashboard ----------
$bmp = New-Object System.Drawing.Bitmap 1080, 1920
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear($bg)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 0, 0, 1080, 320), $c1, $c2, 90.0
$g.FillRectangle($grad, 0, 0, 1080, 320)
Txt $g 'Hello, Bhargavi' 70 100 56 ([System.Drawing.Color]::White) 'Bold'
Txt $g 'Your medication for today' 70 182 32 ([System.Drawing.Color]::FromArgb(220, 245, 245))

Card $g 60 380 960 620
Txt $g "Today's medicines" 110 430 44 $text 'Bold'
$meds = @(
  @('Vitamin D3', '1 tablet  ·  8:00 AM', $green),
  @('Amlodipine', '1 tablet  ·   1:00 PM', $amber),
  @('Metformin 500', '1 tablet  ·   8:00 PM', $green)
)
$ry = 520
foreach ($m in $meds) {
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $m[2]), 112, ($ry + 10), 46, 46)
  Txt $g $m[0] 190 $ry 42 $text 'Bold'
  Txt $g $m[1] 190 ($ry + 50) 32 $muted
  $g.DrawLine((New-Object System.Drawing.Pen $border, 2), 110, ($ry + 118), 990, ($ry + 118))
  $ry += 132
}

Card $g 70 1010 940 520
Txt $g 'Caregiver alerts' 110 1060 46 $text 'Bold'
Txt $g 'Missed dose detected' 110 1140 34 $text
Txt $g 'Bhargavi missed her 1:00 PM dose' 110 1184 30 $muted
$chip = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 110, 1250, 300, 70), $c1, $c2, 0.0
$g.FillPath($chip, (RoundedPath 110 1250 300 70 20))
Txt $g 'Care taker notified' 138 1268 28 ([System.Drawing.Color]::White)
Txt $g 'ntfy + WhatsApp ready' 110 1370 30 $muted
$g.Dispose()
$bmp.Save((Join-Path $out 'dashboard.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Output "Screenshots written to $out"
Get-ChildItem -LiteralPath $out | Select-Object Name, Length
