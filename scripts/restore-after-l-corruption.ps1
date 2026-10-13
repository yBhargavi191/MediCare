# Rebuild every file corrupted by the blind l->i substitution, from clean sources:
#   _recover/  = byte-exact copy pulled out of the browser cache (lighter-blue state)
#   backup dir = pristine pre-polish copies of every html file
#   deploy probe = pristine copies of the 3 js files that had no other clean copy
$ErrorActionPreference = 'Stop'
$p    = 'C:\Users\ybhar_9sumasa\OneDrive\Desktop\project'
$bak  = 'C:\Users\ybhar_9sumasa\AppData\Local\Temp\medicare-polish-backup-20261013-074746'
$rec  = Join-Path $p '_recover'
$dep  = 'C:\Users\ybhar_9sumasa\AppData\Local\Temp\medicare-deploy-probe'
$www  = Join-Path $p 'www'

function Copy-Clean($src, $dstRoot, $rel) {
  $dst = Join-Path $dstRoot $rel
  $dir = Split-Path $dst -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
  "  {0,-40} <- {1}" -f $rel, (Split-Path $src -Leaf)
}

"==== css (5) from browser-cache recovery ===="
foreach ($n in @('style.css','app-shell.css','dashboard.css','fitness-pages.css','admin-pages.css')) {
  Copy-Clean (Join-Path $rec "css\$n") $p "css\$n"
  Copy-Clean (Join-Path $rec "css\$n") $www "css\$n"
}

"`n==== js (16) from browser-cache recovery ===="
foreach ($n in @('loading.js','theme.js','firebase-config.js','app-shell.js','notifications.js','push-notifications.js','patient.js','pwa.js','i18n.js','admin.js','auth.js','fitness-assistant.js','fitness-page-nav.js','medicine-match.js','ml-loader.js','verify.js')) {
  Copy-Clean (Join-Path $rec "js\$n") $p "js\$n"
  Copy-Clean (Join-Path $rec "js\$n") $www "js\$n"
}

"`n==== js (3) from the deployed site ===="
foreach ($n in @('admin-pages.js','patient-details.js','care-taker.js')) {
  Copy-Clean (Join-Path $dep $n) $p "js\$n"
  Copy-Clean (Join-Path $dep $n) $www "js\$n"
}

"`n==== manifest.json (recovered) ===="
Copy-Clean (Join-Path $rec 'manifest.json') $p 'manifest.json'
Copy-Clean (Join-Path $rec 'manifest.json') $www 'manifest.json'

"`n==== html: recovered where available, otherwise pristine backup ===="
$htmlRoot = Get-ChildItem -File $bak -Filter '_*.html' | Where-Object { $_.Name -notlike '_www_*' } | ForEach-Object { $_.Name.Substring(1) }
$htmlWww  = Get-ChildItem -File $bak -Filter '_www_*.html' | ForEach-Object { $_.Name.Substring(5) }
$all = @($htmlRoot + $htmlWww) | Sort-Object -Unique
foreach ($n in $all) {
  $recovered = Join-Path $rec $n
  foreach ($dstRoot in @($p, $www)) {
    if (Test-Path -LiteralPath $recovered) { Copy-Clean $recovered $dstRoot $n }
    else {
      $bname = if ($dstRoot -eq $www) { "_www_$n" } else { "_$n" }
      $bf = Join-Path $bak $bname
      if (Test-Path -LiteralPath $bf) { Copy-Clean $bf $dstRoot $n } else { "  !! no source for $bname" }
    }
  }
}
"`ndone"
