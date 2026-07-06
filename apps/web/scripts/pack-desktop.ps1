# Manual desktop packager (Windows).
#
# Assembles a self-contained Electron app folder + zip WITHOUT electron-builder, which
# in this environment cannot reach its GitHub-hosted binary downloads (winCodeSign) and
# trips antivirus on its extract-then-rename step. This uses the already-cached Electron
# distribution (or downloads it from the npmmirror mirror), lays our built app into
# resources/app, and zips the result. Data lives next to the exe (see electron/main.ts).
#
# Run via: pnpm --filter web package:desktop  (which builds dist + main.cjs first)

$ErrorActionPreference = 'Stop'

$web = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$appName = 'ResumeLite'
$release = Join-Path $web 'release-desktop'
$appFolder = Join-Path $release $appName

$electronVersion = (Get-Content (Join-Path $web 'node_modules\electron\package.json') -Raw | ConvertFrom-Json).version
$appVersion = (Get-Content (Join-Path $web '..\..\package.json') -Raw | ConvertFrom-Json).version
$zipName = "electron-v$electronVersion-win32-x64.zip"
Write-Host "Packaging Electron v$electronVersion / app v$appVersion"

if (-not (Test-Path (Join-Path $web 'dist\index.html'))) { throw 'dist not built; run `pnpm build` first' }
if (-not (Test-Path (Join-Path $web 'electron-dist\main.cjs'))) { throw 'electron-dist/main.cjs missing; run `pnpm electron:build` first' }

# 1) Locate the cached Electron zip, or download it from the npmmirror mirror.
$cacheRoot = Join-Path $env:LOCALAPPDATA 'electron\Cache'
$electronZip = $null
if (Test-Path $cacheRoot) {
	$electronZip = (Get-ChildItem $cacheRoot -Recurse -Filter $zipName -ErrorAction SilentlyContinue |
		Sort-Object Length -Descending | Select-Object -First 1).FullName
}
if (-not $electronZip) {
	$electronZip = Join-Path $env:TEMP $zipName
	$url = "https://registry.npmmirror.com/-/binary/electron/v$electronVersion/$zipName"
	Write-Host "Electron not cached; downloading from $url"
	Invoke-WebRequest -Uri $url -OutFile $electronZip
}
Write-Host "Electron distribution: $electronZip"

# 2) Clean and extract Electron into the app folder.
if (Test-Path $release) { Remove-Item -Recurse -Force $release }
New-Item -ItemType Directory -Force $appFolder | Out-Null
Expand-Archive -Path $electronZip -DestinationPath $appFolder -Force

# 3) Rename electron.exe -> "<appName>.exe" (retry to ride out a brief antivirus lock).
for ($i = 0; $i -lt 8; $i++) {
	try { Rename-Item (Join-Path $appFolder 'electron.exe') "$appName.exe" -Force; break }
	catch { if ($i -eq 7) { throw }; Start-Sleep -Seconds 2 }
}

# 3b) Stamp the ResumeLite icon onto the exe (rcedit ships a bundled binary via the rcedit dep).
$root = (Resolve-Path (Join-Path $web '..\..')).Path
$rcedit = Join-Path $root 'node_modules\rcedit\bin\rcedit-x64.exe'
if (-not (Test-Path $rcedit)) {
	$rcedit = (Get-ChildItem (Join-Path $root 'node_modules\.pnpm') -Recurse -Filter 'rcedit-x64.exe' -ErrorAction SilentlyContinue |
		Select-Object -First 1).FullName
}
if ($rcedit -and (Test-Path $rcedit)) {
	& $rcedit (Join-Path $appFolder "$appName.exe") --set-icon (Join-Path $web 'electron\icon.ico')
	Write-Host "Stamped exe icon via rcedit"
} else {
	Write-Warning 'rcedit not found; exe keeps the default Electron icon. Add the rcedit dev dependency.'
}

# 4) Lay our built app into resources/app so Electron loads it instead of the default app.
$app = Join-Path $appFolder 'resources\app'
New-Item -ItemType Directory -Force (Join-Path $app 'electron-dist') | Out-Null
Copy-Item (Join-Path $web 'electron-dist\main.cjs') (Join-Path $app 'electron-dist\main.cjs') -Force
Copy-Item -Recurse -Force (Join-Path $web 'dist') (Join-Path $app 'dist')
Copy-Item (Join-Path $web 'electron\icon.png') (Join-Path $app 'icon.png') -Force
$appPkg = [ordered]@{ name = 'resumelite'; version = $appVersion; main = 'electron-dist/main.cjs' } | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path $app 'package.json'), $appPkg)

# 5) Zip the self-contained folder.
$zipOut = Join-Path $release "ResumeLite-$appVersion-win-x64.zip"
Compress-Archive -Path $appFolder -DestinationPath $zipOut -Force
$size = [math]::Round((Get-Item $zipOut).Length / 1MB, 1)

# 6) Emit a SHA-256 sidecar (sha256sum format) that the in-app updater verifies against.
#    Upload both the zip and this .sha256 to the GitHub release.
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipOut).Hash.ToLower()
$shaOut = "$zipOut.sha256"
[System.IO.File]::WriteAllText($shaOut, "$hash  $(Split-Path $zipOut -Leaf)`n")
Write-Host "DONE -> $zipOut ($size MB)"
Write-Host "SHA256 -> $shaOut"
