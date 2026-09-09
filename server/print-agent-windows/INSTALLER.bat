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
set "RC=%errorlevel%"
if "%LARTISAN_LOG%"=="" set "LARTISAN_LOG=%~dp0install.log"
if not "%RC%"=="0" (echo. & echo  L'installation a echoue. Journal : %LARTISAN_LOG% & pause & exit /b 1)
echo.
echo  Installation terminee. L'agent demarre maintenant (et a chaque demarrage de Windows).
start "" /min "%~dp0start-print-agent.bat"
if "%LARTISAN_TOKEN%"=="" (pause) else (timeout /t 8 >nul)
exit /b 0
