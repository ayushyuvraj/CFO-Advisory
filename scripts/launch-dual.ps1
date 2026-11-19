param(
    [string]$Mode = "start"
)

$ErrorActionPreference = "Stop"

# ============================================================
#  PORT CONFIGURATION
# ============================================================
#  Port 3000: KPMG CFO Advisory Showcase & Workflows Hub
# ============================================================
$Port = if ($env:PORT) { [int]$env:PORT } elseif ($env:PORT_ORIGINAL) { [int]$env:PORT_ORIGINAL } else { 3000 }

$root = (Get-Item -LiteralPath (Split-Path -Parent $PSScriptRoot)).FullName
Set-Location $root

Write-Host ""
Write-Host " ========================================================================" -ForegroundColor Cyan
Write-Host "  KPMG CFO ADVISORY - SHOWCASE LAUNCHER" -ForegroundColor Cyan
Write-Host " ========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [PORT CONFIGURATION]" -ForegroundColor Yellow
Write-Host "   * Port $Port : KPMG CFO Advisory Cinema Showcase & Workflows Hub" -ForegroundColor White
Write-Host ""
Write-Host "  [BROWSER DESTINATION]" -ForegroundColor Yellow
Write-Host "   * http://localhost:$Port" -ForegroundColor Green
Write-Host " ========================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js was not found on PATH. Please install Node.js LTS first." -ForegroundColor Red
    pause
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git was not found on PATH. Please install Git first." -ForegroundColor Red
    pause
    exit 1
}

# 2. Dependencies
$nodeModules = Join-Path $root "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[1/4] Installing dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        pause
        exit 1
    }
}

# 3. Production build checks
if ($Mode -eq "start") {
    $origBuild = Join-Path $root ".next\BUILD_ID"
    if (-not (Test-Path $origBuild)) {
        Write-Host "[2/4] Building production bundle (Port $Port)..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Production build failed." -ForegroundColor Red
            pause
            exit 1
        }
    } else {
        Write-Host "[2/4] Production bundle verified (Port $Port)." -ForegroundColor Gray
    }
}

# 4. Free port if lingering
Write-Host "[3/4] Checking port $Port..." -ForegroundColor Gray
try {
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -eq $Port } |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {}

# 5. Start server
Write-Host "[4/4] Starting server on port $Port ($Mode mode)..." -ForegroundColor Cyan

$serverProcess = Start-Process -FilePath "node" `
    -ArgumentList "node_modules\next\dist\bin\next", $Mode, "-p", $Port `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

# 6. Browser Opener
Write-Host "      Waiting for server and opening browser tab..." -ForegroundColor Gray
$deadline = (Get-Date).AddSeconds(45)
$opened = $false

while ((Get-Date) -lt $deadline -and -not $opened) {
    if (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet) {
        Start-Process "http://localhost:$Port"
        $opened = $true
        Write-Host "      [Browser] Opened http://localhost:$Port (KPMG CFO Advisory)" -ForegroundColor Green
    } else {
        Start-Sleep -Milliseconds 400
    }
}

Write-Host ""
Write-Host "  ========================================================================" -ForegroundColor Cyan
Write-Host "   Server is active:" -ForegroundColor Green
Write-Host "    - Showcase & Hub : http://localhost:$Port" -ForegroundColor White
Write-Host ""
Write-Host "   Press Ctrl+C or Enter in this window to stop the server." -ForegroundColor Yellow
Write-Host "  ========================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    while (-not $serverProcess.HasExited) {
        try {
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if ($key.Key -eq [ConsoleKey]::Enter -or $key.Key -eq [ConsoleKey]::Escape) {
                    break
                }
            }
        } catch {
            # Standard input is redirected; continue running
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host "`nShutting down server on port $Port..." -ForegroundColor Yellow
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    try {
        Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $_.LocalPort -eq $Port } |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    } catch {}
    Write-Host "Server stopped cleanly." -ForegroundColor Green
}
