[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$PaletteCadRoot = "C:\PaletteCAD"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceRoot = $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$backupRoot = Join-Path $PaletteCadRoot "CProduction-Installer-Backups\$timestamp"

if (-not (Test-Path -LiteralPath $PaletteCadRoot -PathType Container)) {
    throw "Palette-CAD-Stammordner nicht gefunden: $PaletteCadRoot"
}

$files = @(
    @{
        Source = Join-Path $sourceRoot "createCpImport.ps1"
        Target = Join-Path $PaletteCadRoot "Projects\CProduction\createCpImport.ps1"
        BackupPath = "Projects\CProduction\createCpImport.ps1"
    },
    @{
        Source = Join-Path $sourceRoot "createCpImport.cmd"
        Target = Join-Path $PaletteCadRoot "Projects\CProduction\createCpImport.cmd"
        BackupPath = "Projects\CProduction\createCpImport.cmd"
    },
    @{
        Source = Join-Path $sourceRoot "Forms\CProduction.xml"
        Target = Join-Path $PaletteCadRoot "Dat\Forms\Projects\CProduction.xml"
        BackupPath = "Dat\Forms\Projects\CProduction.xml"
    },
    @{
        Source = Join-Path $sourceRoot "Macros\Export CProduction.eval"
        Target = Join-Path $PaletteCadRoot "Dat\Macros\Wood\Export CProduction.eval"
        BackupPath = "Dat\Macros\Wood\Export CProduction.eval"
    },
    @{
        Source = Join-Path $sourceRoot "Schemas\CarpentersProduction.xml"
        Target = Join-Path $PaletteCadRoot "Dat\Bom\Schemas\Holz\CarpentersProduction.xml"
        BackupPath = "Dat\Bom\Schemas\Holz\CarpentersProduction.xml"
    }
)

foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file.Source -PathType Leaf)) {
        throw "Quelldatei fehlt: $($file.Source)"
    }
}

$changedFiles = New-Object System.Collections.Generic.List[object]
$backupCreated = $false

try {
    foreach ($file in $files) {
        $targetDirectory = Split-Path -Parent $file.Target

        if (-not (Test-Path -LiteralPath $targetDirectory -PathType Container)) {
            if ($PSCmdlet.ShouldProcess($targetDirectory, "Zielordner erstellen")) {
                New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
            }
        }

        $targetExisted = Test-Path -LiteralPath $file.Target -PathType Leaf
        $backupFile = Join-Path $backupRoot $file.BackupPath

        if ($targetExisted -and $PSCmdlet.ShouldProcess($file.Target, "Bestehende Datei sichern")) {
            $backupDirectory = Split-Path -Parent $backupFile
            New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
            Copy-Item -LiteralPath $file.Target -Destination $backupFile -Force
            $backupCreated = $true
        }

        if ($PSCmdlet.ShouldProcess($file.Target, "Plugin-Datei installieren")) {
            $changedFiles.Add(@{
                Target = $file.Target
                Existed = $targetExisted
                Backup = $backupFile
            })
            Copy-Item -LiteralPath $file.Source -Destination $file.Target -Force
        }
    }
}
catch {
    Write-Warning "Installation fehlgeschlagen. Bereits ausgefuehrte Aenderungen werden zurueckgesetzt."

    for ($index = $changedFiles.Count - 1; $index -ge 0; $index--) {
        $changed = $changedFiles[$index]
        if ($changed.Existed -and (Test-Path -LiteralPath $changed.Backup -PathType Leaf)) {
            Copy-Item -LiteralPath $changed.Backup -Destination $changed.Target -Force
        }
        elseif (Test-Path -LiteralPath $changed.Target -PathType Leaf) {
            Remove-Item -LiteralPath $changed.Target -Force
        }
    }

    throw
}

Write-Host ""
Write-Host "CProduction fuer Palette CAD 10 wurde erfolgreich installiert." -ForegroundColor Green
foreach ($file in $files) {
    Write-Host "  $($file.Target)"
}

if ($backupCreated) {
    Write-Host ""
    Write-Host "Vorhandene Dateien wurden hier gesichert:"
    Write-Host "  $backupRoot"
}
