@echo off
chcp 65001 >nul
title L'Artisan - diagnostic imprimante
cd /d "%~dp0"
echo Collecte des informations sur l'imprimante (10 s)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$o = @(); " ^
  "$o += '=== PRINTERS ==='; $o += (Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Shared | Format-Table -AutoSize | Out-String -Width 200); " ^
  "$o += '=== PRINTER PORTS ==='; $o += (Get-PrinterPort | Select-Object Name, Description, PortMonitor | Format-Table -AutoSize | Out-String -Width 200); " ^
  "$o += '=== SERIAL / COM PORTS (registry) ==='; $o += (Get-ItemProperty 'HKLM:\HARDWARE\DEVICEMAP\SERIALCOMM' -ErrorAction SilentlyContinue | Out-String -Width 200); " ^
  "$o += '=== COM PORTS (PnP) ==='; $o += (Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'COM\d+|Serial over Bluetooth' } | Select-Object Status, Class, FriendlyName, InstanceId | Format-Table -AutoSize | Out-String -Width 250); " ^
  "$o += '=== BLUETOOTH DEVICES ==='; $o += (Get-PnpDevice -Class Bluetooth -PresentOnly -ErrorAction SilentlyContinue | Select-Object Status, FriendlyName, InstanceId | Format-Table -AutoSize | Out-String -Width 250); " ^
  "$o += '=== STAR / TSP anywhere ==='; $o += (Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Star|TSP' } | Select-Object Status, Class, FriendlyName, InstanceId | Format-Table -AutoSize | Out-String -Width 250); " ^
  "$o += '=== STAR SOFTWARE ==='; $o += (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match 'Star' } | Select-Object DisplayName, DisplayVersion | Format-Table -AutoSize | Out-String -Width 200); " ^
  "$o | Out-File -FilePath 'printer-diag.txt' -Encoding UTF8; "
echo.
echo Rapport enregistre dans : %~dp0printer-diag.txt
echo Vous pouvez fermer cette fenetre.
pause
