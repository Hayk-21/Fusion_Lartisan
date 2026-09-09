@echo off
chcp 65001 >nul
title L'Artisan - Installation de l'agent d'impression
cd /d "%~dp0"
echo.
echo  ==========================================================
echo   Fusion L'Artisan - installation de l'agent d'impression
echo  ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 (echo. & echo  L'installation a echoue. Relisez le message ci-dessus. & pause & exit /b 1)
echo.
echo  Installation terminee. L'agent demarre maintenant (et a chaque demarrage de Windows).
timeout /t 3 >nul
start "" "%~dp0start-print-agent.bat"
exit /b 0
