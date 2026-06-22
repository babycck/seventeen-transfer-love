# Split the single-file SEVENTEEN.html into a multi-file local deployment.
# Run: powershell -ExecutionPolicy Bypass -File .\tools\split_seventeen_html.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root "SEVENTEEN.html"

if (-not (Test-Path $srcPath)) {
    Write-Host "Source file not found: $srcPath" -ForegroundColor Red
    exit 1
}

# Dirs
New-Item -ItemType Directory -Force -Path (Join-Path $root "assets\js") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $root "assets\css") | Out-Null

# Read original UTF-8 HTML with .NET (works with or without BOM)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$lines = [System.IO.File]::ReadAllLines($srcPath, $utf8)

# Locate tags
$styleStartLine  = -1
$styleEndLine    = -1
$scriptStartLine = -1
$scriptEndLine   = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*<style>\s*$' -and $styleStartLine -eq -1) { $styleStartLine = $i }
    if ($lines[$i] -match '^\s*</style>\s*$' -and $styleEndLine -eq -1)     { $styleEndLine = $i }
    if ($lines[$i] -match '^\s*<script>\s*$' -and $scriptStartLine -eq -1) { $scriptStartLine = $i }
    if ($lines[$i] -match '^\s*</script>\s*$' -and $scriptEndLine -eq -1)   { $scriptEndLine = $i }
}
if (($styleStartLine -eq -1) -or ($styleEndLine -eq -1) -or ($scriptStartLine -eq -1) -or ($scriptEndLine -eq -1)) {
    Write-Host "Could not locate <style> / <script> tags." -ForegroundColor Red
    exit 1
}

# Extract CSS (between style tags, exclusive)
$cssLines = $lines[($styleStartLine + 1)..($styleEndLine - 1)]
$cssPath = Join-Path $root "assets\css\style.css"
[System.IO.File]::WriteAllLines($cssPath, $cssLines, $utf8)
Write-Host "Created $cssPath"

# Extract JS
$jsLines = $lines[($scriptStartLine + 1)..($scriptEndLine - 1)]

# Source section marker order -> destination file
$sectionFiles = @(
    "assets/js/00-config.js",
    "assets/js/10-state.js",
    "assets/js/20-utils.js",
    "assets/js/30-ai.js",
    "assets/js/40-parser.js",
    "assets/js/50-memory.js",
    "assets/js/60-prompts.js",
    "assets/js/60-prompts.js",
    "assets/js/60-prompts.js",
    "assets/js/60-prompts.js",
    "assets/js/60-prompts.js",
    "assets/js/60-prompts.js",
    "assets/js/60-prompts.js",
    "assets/js/70-story.js",
    "assets/js/70-story.js",
    "assets/js/50-memory.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/90-game.js",
    "assets/js/90-game.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/80-ui.js",
    "assets/js/99-init.js"
)

$sections = [ordered]@{}
$scriptOrder = [System.Collections.Generic.List[string]]::new()
$currentFile = $null
$markerIndex = -1
$markerRegex = '^\s*// ={10,}\s*(.+?)\s*={10,}\s*$'

foreach ($line in $jsLines) {
    if ($line -match $markerRegex) {
        $markerIndex++
        if ($markerIndex -ge $sectionFiles.Count) {
            Write-Warning "Extra section marker found; writing to uncategorized.js"
            $currentFile = "assets/js/zz-uncategorized.js"
        } else {
            $currentFile = $sectionFiles[$markerIndex]
        }
        if (-not $sections.Contains($currentFile)) {
            $sections[$currentFile] = New-Object System.Text.StringBuilder
            $scriptOrder.Add($currentFile)
        }
        [void]$sections[$currentFile].AppendLine($line)
    } else {
        if (-not $currentFile) {
            $currentFile = "assets/js/05-preamble.js"
            if (-not $sections.Contains($currentFile)) {
                $sections[$currentFile] = New-Object System.Text.StringBuilder
                $scriptOrder.Insert(0, $currentFile)
            }
        }
        [void]$sections[$currentFile].AppendLine($line)
    }
}

if ($markerIndex -ne ($sectionFiles.Count - 1)) {
    Write-Warning "Expected $($sectionFiles.Count) section markers, found $($markerIndex + 1)"
}

# Write JS files
foreach ($file in $scriptOrder) {
    $outPath = Join-Path $root $file
    $dir = Split-Path -Parent $outPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $content = $sections[$file].ToString().TrimEnd()
    [System.IO.File]::WriteAllText($outPath, $content + [Environment]::NewLine, $utf8)
    Write-Host "Created $file"
}

# Extract title / loading text from original HTML so Chinese is preserved
$title = "Transfer Love x SEVENTEEN"
$loading = "Loading..."
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '<title>(.+?)</title>') { $title = $Matches[1].Trim() }
    if ($lines[$i] -match '<div class="loading-text" id="loadingText">(.+?)</div>') { $loading = $Matches[1].Trim() }
}

$scriptTags = ($scriptOrder | ForEach-Object { "  <script src=`"$_`"></script>" }) -join "`n"

$htmlShell = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div id="app"></div>
<div id="loadingOverlay" class="loading-overlay hidden">
  <div class="spinner"></div>
  <div class="loading-text" id="loadingText">$loading</div>
</div>
$scriptTags
</body>
</html>
"@

$htmlPath = Join-Path $root "index.html"
[System.IO.File]::WriteAllText($htmlPath, $htmlShell, $utf8)
Write-Host "Created $htmlPath" -ForegroundColor Green

# Optional local server launcher (ASCII only for .bat compatibility)
$batContent = @'
@echo off
echo Starting local server at http://localhost:8080
echo Press Ctrl+C to stop
python -m http.server 8080
if errorlevel 1 (
    echo Python not available. Open index.html directly in your browser.
    pause
)
'@
$batContent | Set-Content -Path (Join-Path $root "start.bat") -Encoding ASCII
Write-Host "Created start.bat"

Write-Host "Done. Original SEVENTEEN.html was not modified. Use index.html as the new entry point." -ForegroundColor Green
