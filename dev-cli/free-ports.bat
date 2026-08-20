@echo off
setlocal enabledelayedexpansion

set PORTS=4000 3030 5003 5005 5006 5011 5012 5013

echo Liberando puertos de los servicios (backend, web-shell, MFEs)...
echo.

for %%p in (%PORTS%) do (
    set FOUND=0
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        echo   puerto %%p -^> matando PID %%a
        taskkill /F /T /PID %%a >nul 2>&1
        set FOUND=1
    )
)

echo.
echo Listo. Puertos verificados: %PORTS%
endlocal
