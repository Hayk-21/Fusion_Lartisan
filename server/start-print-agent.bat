@echo off
chcp 65001 >nul
title L'Artisan - Agent d'impression
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n'est pas installe : https://nodejs.org & pause & exit /b 1)
if not exist node_modules (echo Installation des dependances... & call npm install --omit=dev --no-audit --no-fund)
echo.
echo  Agent d'impression L'Artisan - laissez cette fenetre ouverte pendant le service.
echo  Configuration : print-agent\print-agent.json
echo.
:loop
node print-agent\agent.js
echo  L'agent s'est arrete. Redemarrage dans 5 secondes...
timeout /t 5 >nul
goto loop
