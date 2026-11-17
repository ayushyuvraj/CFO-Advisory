@echo off
setlocal
cd /d "%~dp0InvoiceProcessing-feature-ap-enhancements-nov13\InvoiceProcessing-feature-ap-enhancements-nov13"

title Finance Command Center - Invoice Processing P2P

echo ========================================================================
echo  FINANCE COMMAND CENTER - INVOICE PROCESSING LAUNCHER
echo ========================================================================
echo.
echo  * Backend:  http://localhost:8000
echo  * Frontend: http://localhost:5173
echo.
echo ========================================================================

start "Invoice Processing Backend (FastAPI :8000)" cmd /k "cd /d ""%~dp0InvoiceProcessing-feature-ap-enhancements-nov13\InvoiceProcessing-feature-ap-enhancements-nov13\backend"" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

start "Invoice Processing Frontend (Vite :5173)" cmd /k "cd /d ""%~dp0InvoiceProcessing-feature-ap-enhancements-nov13\InvoiceProcessing-feature-ap-enhancements-nov13\app"" && npm run dev"

timeout /t 3 /nobreak >nul

start http://localhost:5173
