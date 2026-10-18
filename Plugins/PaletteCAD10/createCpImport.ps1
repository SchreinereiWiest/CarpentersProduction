[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceFolder = Get-Item -LiteralPath $PSScriptRoot -ErrorAction Stop
if (-not $sourceFolder.PSIsContainer) {
    throw "Exportordner nicht gefunden: $PSScriptRoot"
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $downloadsFolder = $null
    $downloadsId = "{374DE290-123F-4565-9164-39C4925E467B}"

    try {
        $userShellFolders = Get-ItemProperty -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
        $downloadsFolder = $userShellFolders.$downloadsId
    }
    catch {
        # Auf den Standardpfad zurueckfallen, falls der Known Folder nicht lesbar ist.
    }

    if ([string]::IsNullOrWhiteSpace($downloadsFolder)) {
        $downloadsFolder = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads"
    }
    else {
        $downloadsFolder = [Environment]::ExpandEnvironmentVariables($downloadsFolder)
    }

    $OutputPath = Join-Path $downloadsFolder "CProduction.cpimport"
}

$outputCandidate = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
if (Test-Path -LiteralPath $outputCandidate -PathType Container) {
    $output = Join-Path $outputCandidate ($sourceFolder.Name + ".cpimport")
}
elseif ([IO.Path]::GetExtension($outputCandidate) -ieq ".cpimport") {
    $output = $outputCandidate
}
else {
    $output = $outputCandidate + ".cpimport"
}

$outputDirectory = Split-Path -Parent $output
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    throw "Ausgabeordner nicht gefunden: $outputDirectory"
}

$pdfs = @(Get-ChildItem -LiteralPath $sourceFolder.FullName -Filter "*.pdf" -File)
$jsonFiles = @(Get-ChildItem -LiteralPath $sourceFolder.FullName -Filter "*.json" -File)
$pngs = @(Get-ChildItem -LiteralPath $sourceFolder.FullName -Filter "*.png" -File)

if ($pdfs.Count -ne 1 -or $jsonFiles.Count -ne 1 -or $pngs.Count -ne 3) {
    throw "Erwartet: 1 PDF, 1 JSON und 3 PNGs in $($sourceFolder.FullName)"
}

$imageRules = @(
    @{ Keyword = "grundriss"; View = "floorplan" },
    @{ Keyword = "front"; View = "front" },
    @{ Keyword = "perspektive"; View = "perspective" }
)

$images = @()
foreach ($png in $pngs) {
    $name = $png.BaseName.ToLowerInvariant()
    $matches = @($imageRules | Where-Object { $name.Contains($_.Keyword) })

    if ($matches.Count -ne 1) {
        throw "Bildtyp nicht eindeutig: $($png.Name)"
    }

    $images += [PSCustomObject]@{
        Source = $png.FullName
        Path = "images/$($matches[0].View).png"
        View = $matches[0].View
    }
}

$manifestImages = @(
    $images | ForEach-Object {
        [ordered]@{
            path = $_.Path
            view = $_.View
            target = "measurement.attachment"
        }
    }
)

$manifest = [ordered]@{
    format = "carpentersproduction-import"
    version = "1.0"
    exportId = [guid]::NewGuid().ToString()
    createdAt = [DateTime]::UtcNow.ToString("o")
    files = [ordered]@{
        cad = [ordered]@{
            path = "cad/model.json"
            format = "cad-raw"
            schemaVersion = "1.0"
        }
        expose = [ordered]@{
            path = "documents/expose.pdf"
            target = "project.overview"
        }
        images = $manifestImages
    }
}

$stagingFolder = Join-Path ([IO.Path]::GetTempPath()) ("cproduction-" + [guid]::NewGuid().ToString("N"))
$temporaryOutput = $output + "." + [guid]::NewGuid().ToString("N") + ".tmp"

try {
    New-Item -ItemType Directory -Path $stagingFolder -Force | Out-Null
    $manifestPath = Join-Path $stagingFolder "manifest.json"
    $manifestJson = $manifest | ConvertTo-Json -Depth 10
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($manifestPath, $manifestJson, $utf8WithoutBom)

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::Open(
        $temporaryOutput,
        [IO.Compression.ZipArchiveMode]::Create
    )

    try {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $jsonFiles[0].FullName, "cad/model.json", [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $pdfs[0].FullName, "documents/expose.pdf", [IO.Compression.CompressionLevel]::Optimal) | Out-Null

        foreach ($image in $images) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $image.Source, $image.Path, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }

        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $manifestPath, "manifest.json", [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    finally {
        $archive.Dispose()
    }

    Move-Item -LiteralPath $temporaryOutput -Destination $output -Force
}
finally {
    if (Test-Path -LiteralPath $stagingFolder) {
        Remove-Item -LiteralPath $stagingFolder -Recurse -Force
    }
    if (Test-Path -LiteralPath $temporaryOutput) {
        Remove-Item -LiteralPath $temporaryOutput -Force
    }
}

Write-Host "Importpaket erstellt: $output" -ForegroundColor Green
