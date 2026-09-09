@echo off
chcp 65001 >nul
title L'Artisan - Agent d'impression
cd /d "%~dp0"
if not exist print-agent.json (echo Lancez d'abord INSTALLER.bat & pause & exit /b 1)
where node >nul 2>nul || (echo Node.js introuvable : lancez INSTALLER.bat & pause & exit /b 1)
if not exist node_modules (call npm install --omit=dev --no-audit --no-fund)
echo.
echo  Agent d'impression L'Artisan - laissez cette fenetre ouverte pendant le service.
echo  (elle se lance toute seule au demarrage de Windows)
echo.
:loop
node agent.js
echo  L'agent s'est arrete. Redemarrage dans 5 secondes...
timeout /t 5 >nul
goto loop
