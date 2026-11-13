@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*
if errorlevel 1 (
    echo.
    echo Der Build ist fehlgeschlagen.
    pause
    exit /b 1
)
echo.
echo XilogConvert wurde erfolgreich gebaut.
pause

