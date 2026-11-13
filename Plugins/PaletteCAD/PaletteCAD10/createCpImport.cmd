@echo off
setlocal

if "%~1"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0createCpImport.ps1"
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0createCpImport.ps1" -OutputPath "%~1"
)
exit /b %ERRORLEVEL%
