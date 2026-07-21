$ErrorActionPreference = "Stop"

Write-Host "Codex Desktop Sidebar Fix" -ForegroundColor Cyan
Write-Host "Locating Node.js and the ChatGPT main process..."

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $null }

if (-not $nodePath) {
    $runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes"
    if (Test-Path -LiteralPath $runtimeRoot) {
        $nodePath = Get-ChildItem -LiteralPath $runtimeRoot -Filter node.exe -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "dependencies\\node\\bin\\node\.exe$" } |
            Select-Object -First 1 -ExpandProperty FullName
    }
}

if (-not $nodePath) {
    throw "Node.js was not found. Install Node.js 22 or later and try again."
}

$chatGpt = Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" |
    Where-Object { $_.CommandLine -notmatch "--type=" } |
    Sort-Object CreationDate |
    Select-Object -First 1

if (-not $chatGpt) {
    throw "The ChatGPT/Codex Desktop main process was not found. Open the app and finish signing in first."
}

Write-Host "Found main process PID $($chatGpt.ProcessId). Checking UI state..."
& $nodePath (Join-Path $PSScriptRoot "src\runner.mjs") $chatGpt.ProcessId
if ($LASTEXITCODE -ne 0) {
    throw "The fix did not complete. Exit code: $LASTEXITCODE"
}
