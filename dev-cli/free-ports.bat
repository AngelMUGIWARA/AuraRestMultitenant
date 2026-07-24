@echo off
setlocal enabledelayedexpansion

set PORTS=4000 3030 5001 5002 5003 5004 5005 5006 5007 5008 5014

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
