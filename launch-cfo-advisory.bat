@echo off
setlocal
cd /d "%~dp0"

rem ============================================================================
rem  PORT CONFIGURATION
rem ============================================================================
rem  Port 3000 : KPMG CFO Advisory Cinema Showcase & Workflows Hub
rem ============================================================================
if "%PORT%"=="" if not "%PORT_ORIGINAL%"=="" set "PORT=%PORT_ORIGINAL%"
if "%PORT%"=="" set "PORT=3000"

title KPMG CFO Advisory Showcase (Port %PORT%)

echo.
echo  ========================================================================
echo   KPMG CFO ADVISORY - SHOWCASE LAUNCHER
echo  ========================================================================
echo.
echo   [PORT CONFIGURATION]
echo    * Port %PORT% : KPMG CFO Advisory Cinema Showcase & Workflows Hub
echo.
echo   [BROWSER DESTINATION]
echo    * Destination : http://localhost:%PORT%
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

rem Prefer running through the PowerShell orchestrator if available
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
if not exist "node_modules" (
  echo  [1/4] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

set "MODE=start"
if /I "%~1"=="dev" set "MODE=dev"

if /I "%MODE%"=="start" (
  if not exist ".next\BUILD_ID" (
    echo  [2/4] Building production bundle (Port %PORT%)...
    call npm run build
    if errorlevel 1 (
      echo  [ERROR] Build failed.
      pause
      exit /b 1
    )
  )
)

echo  [3/4] Freeing port %PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq %PORT% } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo  [4/4] Launching browser opener for http://localhost:%PORT%...
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(45); while ((Get-Date) -lt $deadline) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port %PORT% -InformationLevel Quiet) { Start-Process 'http://localhost:%PORT%'; break }; Start-Sleep -Milliseconds 400 }"

echo  Starting server on Port %PORT%...
echo  Press Ctrl+C in this window at any time to stop the server.
node "node_modules\next\dist\bin\next" %MODE% -p %PORT%

echo.
echo  Stopping background server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq %PORT% } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo  Server stopped cleanly.
endlocal
