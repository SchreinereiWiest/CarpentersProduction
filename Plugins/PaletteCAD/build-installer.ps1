[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pluginsRoot = $PSScriptRoot
$sourceRoot = Join-Path $pluginsRoot "PaletteCAD10"
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $pluginsRoot "PaletteCAD10_Plugin.cmd"
}

$payloadFiles = @(
    "install.ps1",
    "Installieren.cmd",
    "createCpImport.ps1",
    "createCpImport.cmd",
    "README.md",
    "Forms\CProduction.xml",
    "Forms\README.md",
    "Macros\Export CProduction.eval",
    "Macros\README.md",
    "Schemas\CarpentersProduction.xml",
    "Schemas\README.md"
)

foreach ($relativePath in $payloadFiles) {
    $sourcePath = Join-Path $sourceRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Plugin-Datei fehlt: $sourcePath"
    }
}

$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$buildFolder = Join-Path ([IO.Path]::GetTempPath()) ("cproduction-build-" + [guid]::NewGuid().ToString("N"))
$archivePath = Join-Path $buildFolder "payload.zip"

try {
    New-Item -ItemType Directory -Path $buildFolder -Force | Out-Null
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [IO.Compression.ZipFile]::Open(
        $archivePath,
        [IO.Compression.ZipArchiveMode]::Create
    )

    try {
        foreach ($relativePath in $payloadFiles) {
            $sourcePath = Join-Path $sourceRoot $relativePath
            $entryPath = $relativePath.Replace("\", "/")
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $sourcePath,
                $entryPath,
                [IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    }
    finally {
        $archive.Dispose()
    }

    $payload = [Convert]::ToBase64String([IO.File]::ReadAllBytes($archivePath))
    $payloadLines = ([regex]::Matches($payload, ".{1,120}") | ForEach-Object { $_.Value }) -join "`r`n"

    $header = @'
@echo off
setlocal

set "CP_SETUP_FILE=%~f0"
set "CP_PAYLOAD_MARKER=:__CPRODUCTION_PAYLOAD_BELOW__"
set "CP_SETUP_TEMP=%TEMP%\CProductionSetup-%RANDOM%-%RANDOM%"
set "CP_SETUP_ZIP=%CP_SETUP_TEMP%\payload.zip"

mkdir "%CP_SETUP_TEMP%" >nul 2>&1
if errorlevel 1 (
    echo Der temporaere Installationsordner konnte nicht erstellt werden.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$content = [IO.File]::ReadAllText($env:CP_SETUP_FILE); $marker = $env:CP_PAYLOAD_MARKER; $index = $content.LastIndexOf($marker); if ($index -lt 0) { throw 'Installationsdaten fehlen.' }; $encoded = $content.Substring($index + $marker.Length); [IO.File]::WriteAllBytes($env:CP_SETUP_ZIP, [Convert]::FromBase64String($encoded)); Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:CP_SETUP_ZIP, $env:CP_SETUP_TEMP)"
if errorlevel 1 goto :failed

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CP_SETUP_TEMP%\install.ps1" %*
set "CP_SETUP_EXIT=%ERRORLEVEL%"
if not "%CP_SETUP_EXIT%"=="0" goto :failed_with_code

rmdir /s /q "%CP_SETUP_TEMP%" >nul 2>&1
echo.
echo Installation erfolgreich abgeschlossen.
pause
exit /b 0

:failed
set "CP_SETUP_EXIT=1"

:failed_with_code
rmdir /s /q "%CP_SETUP_TEMP%" >nul 2>&1
echo.
echo Die Installation ist fehlgeschlagen.
pause
exit /b %CP_SETUP_EXIT%

:__CPRODUCTION_PAYLOAD_BELOW__
'@

    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    $normalizedHeader = $header.Replace("`r`n", "`n").Replace("`r", "`n").Replace("`n", "`r`n")
    [IO.File]::WriteAllText(
        $resolvedOutput,
        $normalizedHeader + $payloadLines + "`r`n",
        $utf8WithoutBom
    )
}
finally {
    if (Test-Path -LiteralPath $buildFolder) {
        Remove-Item -LiteralPath $buildFolder -Recurse -Force
    }
}

Write-Host "Einzeldatei-Installer erstellt: $resolvedOutput" -ForegroundColor Green
