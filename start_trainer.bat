@echo off
title ABI SOUND MASTER - Entrenador Auditivo y Radar Multimodal
echo ========================================================
echo    ABI SOUND MASTER - ARENA BREAKOUT: INFINITE (S7)
echo     Entrenador de Oido y Radar Multimodal (v2.0)
echo ========================================================
echo.
echo Iniciando servidor en http://localhost:8080 ...
echo Abriendo navegador predeterminado...
echo.
start http://localhost:8080
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node server.js
) else (
    python -m http.server 8080
)
pause
