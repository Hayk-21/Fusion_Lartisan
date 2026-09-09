@echo off
chcp 65001 >nul
title L'Artisan - Serveur de commandes
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installe. Telechargez la version LTS ^(22 ou plus^) sur https://nodejs.org puis relancez ce fichier.
  start https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJ=%%a
set NODEMAJ=%NODEMAJ:v=%
if %NODEMAJ% LSS 22 (
  echo  Node.js %NODEMAJ% est trop ancien. Installez Node.js 22 LTS ou plus recent : https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo  Premiere installation des dependances...
  call npm install --omit=dev --no-audit --no-fund
)

rem Ouvre le port du serveur dans le pare-feu Windows (necessite les droits administrateur - ignore silencieusement sinon)
netsh advfirewall firewall show rule name="LArtisan Cafe Server" >nul 2>nul || (
  netsh advfirewall firewall add rule name="LArtisan Cafe Server" dir=in action=allow protocol=TCP localport=3000 >nul 2>nul
  netsh advfirewall firewall add rule name="LArtisan Cafe Discovery" dir=in action=allow protocol=UDP localport=47474 >nul 2>nul
)

echo.
echo  Demarrage du serveur... Le panneau d'administration va s'ouvrir dans votre navigateur.
echo  Laissez cette fenetre ouverte pendant le service. Fermez-la pour arreter le serveur.
echo.
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:3000/admin"
node src\index.js
pause
