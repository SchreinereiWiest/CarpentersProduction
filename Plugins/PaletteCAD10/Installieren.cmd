@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "INSTALL_EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%INSTALL_EXIT_CODE%"=="0" (
    echo Die Installation ist fehlgeschlagen. Eventuell muss diese Datei als Administrator gestartet werden.
)
pause
exit /b %INSTALL_EXIT_CODE%

