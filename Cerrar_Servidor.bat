@echo off
title Detener Servidor - Días de Compensación (ADPmodul)
cd /d "%~dp0"
echo Deteniendo servidor en puerto 5175...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = 5175; " ^
  "$pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique; " ^
  "if ($pids) { foreach ($pidToKill in $pids) { Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue; Write-Host ('Servidor detenido (PID ' + $pidToKill + ')') } } else { Write-Host 'El servidor no estaba en ejecucion.' }"
echo.
timeout /t 2 >nul
exit
