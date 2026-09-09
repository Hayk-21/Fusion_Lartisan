@echo off
rem Run this file ONCE as Administrator (right-click > Run as administrator) if tablets cannot reach the server.
netsh advfirewall firewall delete rule name="LArtisan Cafe Server" >nul 2>nul
netsh advfirewall firewall delete rule name="LArtisan Cafe Discovery" >nul 2>nul
netsh advfirewall firewall add rule name="LArtisan Cafe Server" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="LArtisan Cafe Discovery" dir=in action=allow protocol=UDP localport=47474
echo.
echo Firewall rules added for TCP 3000 and UDP 47474.
pause
