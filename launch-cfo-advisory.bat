@echo off
setlocal
cd /d "%~dp0"

rem ============================================================================
rem  REFERENCE PORTS CONFIGURATION
rem ============================================================================
rem  Port 3000 : Original Version (KPMG CFO Advisory Cinema Showcase + Workflows Hub)
rem  Port 3001 : V2 Version       (Daylight Currency Odyssey + 3D Equilibrium Vault)
rem ============================================================================
if "%PORT_ORIGINAL%"=="" set "PORT_ORIGINAL=3000"
if "%PORT_V2%"=="" set "PORT_V2=3001"

title KPMG CFO Advisory - Dual Version Showcase (Original: %PORT_ORIGINAL% / V2: %PORT_V2%)

echo.
echo  ========================================================================
echo   KPMG CFO ADVISORY - DUAL VERSION SHOWCASE LAUNCHER
echo  ========================================================================
echo.
echo   [REFERENCE PORTS]
echo    * Port %PORT_ORIGINAL% : Original Version (KPMG CFO Advisory Cinema + Hub)
echo    * Port %PORT_V2% : V2 Version       (Daylight Currency Odyssey + 3D Vault)
echo.
echo   [BROWSER DESTINATIONS]
echo    * Tab 1 (Original) : http://localhost:%PORT_ORIGINAL%
echo    * Tab 2 (V2)       : http://localhost:%PORT_V2%
echo  ========================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] Node.js was not found on PATH. Please install Node.js LTS first.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] Git was not found on PATH. Please install Git first.
  pause
  exit /b 1
)

rem Prefer running through the PowerShell dual orchestrator if available
if exist "%~dp0scripts\launch-dual.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-dual.ps1" %*
  if errorlevel 1 (
    echo.
    echo  [Notice] Server script ended with an error code.
    pause
  )
  exit /b 0
)

rem --- Fallback standalone batch execution ---
if not exist "v2\.git" (
  echo  [1/5] Setting up V2 git worktree from branch 'V2'...
  git worktree add v2 V2
  if errorlevel 1 (
    echo  [ERROR] Failed to add git worktree for branch V2.
    pause
    exit /b 1
  )
)

if not exist "node_modules" (
  echo  [2/5] Installing root dependencies...
  call npm install
  if errorlevel 1 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

if not exist "v2\node_modules" (
  echo  [2/5] Linking node_modules into V2 worktree...
  cmd /c mklink /J "v2\node_modules" "node_modules" >nul 2>nul
)

set "MODE=start"
if /I "%~1"=="dev" set "MODE=dev"

if /I "%MODE%"=="start" (
  if not exist ".next\BUILD_ID" (
    echo  [3/5] Building Original production bundle (Port %PORT_ORIGINAL%)...
    call npm run build
    if errorlevel 1 (
      echo  [ERROR] Original build failed.
      pause
      exit /b 1
    )
  )

  if not exist "v2\.next\BUILD_ID" (
    echo  [3/5] Building V2 production bundle (Port %PORT_V2%)...
    pushd v2
    call npx next build --webpack
    popd
    if errorlevel 1 (
      echo  [ERROR] V2 build failed.
      pause
      exit /b 1
    )
  )
)

echo  [4/5] Freeing ports %PORT_ORIGINAL% and %PORT_V2%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in %PORT_ORIGINAL%, %PORT_V2% } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo  [5/5] Launching dual browser opener for tabs on ports %PORT_ORIGINAL% and %PORT_V2%...
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(%PORT_ORIGINAL%, %PORT_V2%); $opened = @{}; $deadline = (Get-Date).AddSeconds(45); while ((Get-Date) -lt $deadline -and $opened.Count -lt $ports.Count) { foreach ($p in $ports) { if (-not $opened.ContainsKey($p)) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port $p -InformationLevel Quiet) { Start-Process \"http://localhost:$p\"; $opened[$p] = $true; Start-Sleep -Milliseconds 700 } } }; Start-Sleep -Milliseconds 400 }"

start "KPMG CFO Advisory - V2 Server [Port %PORT_V2%]" /min cmd /c "cd /d "%~dp0v2" && node ..\node_modules\next\dist\bin\next %MODE% -p %PORT_V2%"

echo  Starting Original server on Port %PORT_ORIGINAL%...
echo  Press Ctrl+C in this window at any time to stop servers.
node "node_modules\next\dist\bin\next" %MODE% -p %PORT_ORIGINAL%

echo.
echo  Stopping background servers...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in %PORT_ORIGINAL%, %PORT_V2% } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo  Servers stopped cleanly.
endlocal
