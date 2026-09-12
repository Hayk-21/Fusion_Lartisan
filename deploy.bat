@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo  Deploiement vers Railway (git push)...
git add -A
git commit -m "update %date% %time%"
git push origin master
if errorlevel 1 (echo. & echo  Le push a echoue : verifiez votre connexion ou vos identifiants GitHub. & pause & exit /b 1)
echo.
echo  Envoye. Railway redeploie dans 1 a 2 minutes : verifiez https://fusionlartisan-production.up.railway.app/api/health
timeout /t 8 >nul
