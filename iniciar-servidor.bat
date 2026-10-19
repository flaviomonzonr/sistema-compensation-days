@echo off
title Servidor - Sistema Compensation Days (Puerto 5175)
cd /d "%~dp0"
echo ===================================================
echo   Iniciando Servidor - Sistema Compensation Days
echo   URL: http://localhost:5175
echo ===================================================
echo.
npm run dev
pause
