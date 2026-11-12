@echo off
setlocal
cd /d "%~dp0"
title KPMG CFO Advisory - Local Server (Press Ctrl+C to stop)

echo.
echo  ============================================================
echo   KPMG CFO Advisory - Local Launcher
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] Node.js was not found on PATH. Please install Node.js LTS first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  [1/3] Installing dependencies...
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
    echo  [2/3] Building production bundle...
    call npm run build
    if errorlevel 1 (
      echo  [ERROR] Production build failed.
      pause
      exit /b 1
    )
  )
)

echo  [Ready] Starting server on http://localhost:3000 (%MODE% mode)...
echo  [Info]  Your default browser will open automatically once ready.
echo  [Info]  Press Ctrl+C in this window at any time to stop everything.
echo.

rem Background helper waits for port 3000 to accept connections, opens browser once, then exits
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3000); $c.Close(); Start-Process 'http://localhost:3000'; break } catch { Start-Sleep -Milliseconds 300 } }"

rem Run Next.js directly in the foreground so Ctrl+C terminates the server process tree cleanly
if /I "%MODE%"=="dev" (
  node "node_modules\next\dist\bin\next" dev -p 3000
) else (
  node "node_modules\next\dist\bin\next" start -p 3000
)

echo.
echo  Server stopped.
endlocal
