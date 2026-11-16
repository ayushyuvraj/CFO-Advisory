param(
    [string]$Mode = "start"
)

$ErrorActionPreference = "Stop"

# ============================================================
#  REFERENCE PORTS CONFIGURATION
# ============================================================
#  Port 3000: Original Version (Dark Executive Cinema & Workflows Hub)
#  Port 3001: V2 Version       (Daylight Currency Odyssey & 3D Vault)
# ============================================================
$PortOriginal = if ($env:PORT_ORIGINAL) { [int]$env:PORT_ORIGINAL } else { 3000 }
$PortV2       = if ($env:PORT_V2) { [int]$env:PORT_V2 } else { 3001 }

$root = (Get-Item -LiteralPath (Split-Path -Parent $PSScriptRoot)).FullName
Set-Location $root

Write-Host ""
Write-Host " ========================================================================" -ForegroundColor Cyan
Write-Host "  KPMG CFO ADVISORY - DUAL VERSION SHOWCASE LAUNCHER" -ForegroundColor Cyan
Write-Host " ========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [REFERENCE PORTS]" -ForegroundColor Yellow
Write-Host "   * Port $PortOriginal : Original Version (Dark Executive Cinema & Workflows Hub)" -ForegroundColor White
Write-Host "   * Port $PortV2 : V2 Version       (Daylight Currency Odyssey & 3D Vault)" -ForegroundColor White
Write-Host ""
Write-Host "  [BROWSER DESTINATIONS]" -ForegroundColor Yellow
Write-Host "   * Tab 1: http://localhost:$PortOriginal" -ForegroundColor Green
Write-Host "   * Tab 2: http://localhost:$PortV2" -ForegroundColor Green
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

# 2. Check worktree
$v2Dir = Join-Path $root "v2"
if (-not (Test-Path (Join-Path $v2Dir ".git"))) {
    Write-Host "[1/5] Setting up V2 git worktree from branch 'V2'..." -ForegroundColor Gray
    git worktree add v2 V2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to add git worktree for branch V2." -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "[1/5] V2 worktree verified." -ForegroundColor Gray
}

# 3. Dependencies
$nodeModules = Join-Path $root "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[2/5] Installing root dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        pause
        exit 1
    }
}

$v2NodeModules = Join-Path $v2Dir "node_modules"
if (-not (Test-Path $v2NodeModules)) {
    Write-Host "[2/5] Linking node_modules into V2 worktree..." -ForegroundColor Gray
    cmd /c mklink /J "$v2NodeModules" "$nodeModules" | Out-Null
}

# 4. Production build checks
if ($Mode -eq "start") {
    $origBuild = Join-Path $root ".next\BUILD_ID"
    if (-not (Test-Path $origBuild)) {
        Write-Host "[3/5] Building Original production bundle (Port $PortOriginal)..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Original build failed." -ForegroundColor Red
            pause
            exit 1
        }
    } else {
        Write-Host "[3/5] Original production bundle verified (Port $PortOriginal)." -ForegroundColor Gray
    }

    $v2Build = Join-Path $v2Dir ".next\BUILD_ID"
    if (-not (Test-Path $v2Build)) {
        Write-Host "[3/5] Building V2 production bundle (Port $PortV2)..." -ForegroundColor Yellow
        Push-Location $v2Dir
        npx next build --webpack
        $buildCode = $LASTEXITCODE
        Pop-Location
        if ($buildCode -ne 0) {
            Write-Host "[ERROR] V2 build failed." -ForegroundColor Red
            pause
            exit 1
        }
    } else {
        Write-Host "[3/5] V2 production bundle verified (Port $PortV2)." -ForegroundColor Gray
    }
}

# 5. Free ports if lingering
Write-Host "[4/5] Checking ports $PortOriginal and $PortV2..." -ForegroundColor Gray
try {
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -in $PortOriginal, $PortV2 } |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {}

# 6. Start servers
Write-Host "[5/5] Starting servers on ports $PortOriginal and $PortV2 ($Mode mode)..." -ForegroundColor Cyan

$origProcess = Start-Process -FilePath "node" `
    -ArgumentList "node_modules\next\dist\bin\next", $Mode, "-p", $PortOriginal `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

$v2Process = Start-Process -FilePath "node" `
    -ArgumentList "node_modules\next\dist\bin\next", $Mode, "-p", $PortV2 `
    -WorkingDirectory $v2Dir `
    -WindowStyle Hidden `
    -PassThru

# 7. Dual Tab Browser Opener
Write-Host "      Waiting for servers and opening browser tabs..." -ForegroundColor Gray
$ports = @($PortOriginal, $PortV2)
$opened = @{}
$deadline = (Get-Date).AddSeconds(45)

while ((Get-Date) -lt $deadline -and $opened.Count -lt $ports.Count) {
    foreach ($p in $ports) {
        if (-not $opened.ContainsKey($p)) {
            if (Test-NetConnection -ComputerName 127.0.0.1 -Port $p -InformationLevel Quiet) {
                Start-Process "http://localhost:$p"
                $opened[$p] = $true
                $label = if ($p -eq $PortOriginal) { "Original Version" } else { "V2 Version" }
                Write-Host "      [Browser] Opened http://localhost:$p ($label)" -ForegroundColor Green
                Start-Sleep -Milliseconds 700
            }
        }
    }
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "  ========================================================================" -ForegroundColor Cyan
Write-Host "   Both versions are active:" -ForegroundColor Green
Write-Host "    - Original (Port $PortOriginal) : http://localhost:$PortOriginal" -ForegroundColor White
Write-Host "    - V2       (Port $PortV2) : http://localhost:$PortV2" -ForegroundColor White
Write-Host ""
Write-Host "   Press Ctrl+C or Enter in this window to stop both servers." -ForegroundColor Yellow
Write-Host "  ========================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    while (-not $origProcess.HasExited -and -not $v2Process.HasExited) {
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
    Write-Host "`nShutting down servers on ports $PortOriginal and $PortV2..." -ForegroundColor Yellow
    if ($origProcess -and -not $origProcess.HasExited) {
        Stop-Process -Id $origProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($v2Process -and -not $v2Process.HasExited) {
        Stop-Process -Id $v2Process.Id -Force -ErrorAction SilentlyContinue
    }
    try {
        Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $_.LocalPort -in $PortOriginal, $PortV2 } |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    } catch {}
    Write-Host "Both servers stopped cleanly." -ForegroundColor Green
}
