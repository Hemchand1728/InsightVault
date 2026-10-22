@echo off
echo =========================================
echo    Starting InsightVault AI System
echo =========================================
echo.

echo Starting the Backend Server (FastAPI)...
:: Run uvicorn from the root directory so the "backend." imports work correctly
start "InsightVault Backend" cmd /k "python -m uvicorn backend.main:app --reload"

echo Starting the Frontend Server...
start "InsightVault Frontend" cmd /k "cd frontend && python -m http.server 5500"

echo.
echo Both servers are starting up in new windows.
echo.
echo Please open your web browser and go to:
echo http://localhost:5500
echo.
echo To stop the servers later, simply close the new command prompt windows.
