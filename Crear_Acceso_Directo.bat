@echo off
title Crear Acceso Directo - Días de Compensación (ADPmodul)
cd /d "%~dp0"

echo ===================================================
echo   Configurando Acceso Directo Silencioso (Segundo Plano)
echo ===================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0crear_acceso_directo.ps1"

echo.
echo ===================================================
echo   LISTO! Acceso directo creado en segundo plano.
echo   Nombre: Días de Compensación (ADPmodul)
echo ===================================================
echo.
pause
