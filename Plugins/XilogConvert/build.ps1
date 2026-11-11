[CmdletBinding()]
param(
    [ValidateSet("win-x64", "win-x86")]
    [string]$Runtime = "win-x64",
    [ValidateSet("Release", "Debug")]
    [string]$Configuration = "Release",
    [switch]$NoArchive
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$pluginRoot = $PSScriptRoot
$environmentPath = Join-Path $pluginRoot ".env"
$projectFile = Join-Path $pluginRoot "XilogConvert.csproj"
$publishDirectory = Join-Path $pluginRoot "publish\$Runtime"
$artifactDirectory = Join-Path $pluginRoot "artifacts"
$artifactPath = Join-Path $artifactDirectory "XilogConvert-$Runtime.zip"

if (-not (Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
    throw "Die portable Konfiguration wurde nicht gefunden: $environmentPath"
}

$environmentValues = @{}
foreach ($originalLine in Get-Content -LiteralPath $environmentPath) {
    $line = $originalLine.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) {
        continue
    }
    if ($line.StartsWith("export ", [System.StringComparison]::OrdinalIgnoreCase)) {
        $line = $line.Substring(7).TrimStart()
    }
    $separator = $line.IndexOf("=")
    if ($separator -le 0) {
        throw "Ungültige Zeile in ${environmentPath}: $originalLine"
    }
    $key = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()
    if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[$value.Length - 1] -eq '"') -or ($value[0] -eq "'" -and $value[$value.Length - 1] -eq "'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    $environmentValues[$key] = $value
}

function Get-PortableValue {
    param([Parameter(Mandatory = $true)][string]$Name)
    $processValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
        return $processValue
    }
    if (-not $environmentValues.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace($environmentValues[$Name])) {
        throw "Die Variable $Name fehlt in $environmentPath."
    }
    return [string]$environmentValues[$Name]
}

function Resolve-PortablePath {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$BasePath
    )
    $expanded = [Environment]::ExpandEnvironmentVariables($Value).Replace('${APP_DIR}', $pluginRoot)
    if ([System.IO.Path]::IsPathRooted($expanded)) {
        return [System.IO.Path]::GetFullPath($expanded)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $expanded))
}

$xisoSource = Resolve-PortablePath -Value (Get-PortableValue "XILOGCONVERT_BUILD_XISO_SOURCE") -BasePath $pluginRoot
$runtimeXisoPath = Get-PortableValue "XILOGCONVERT_XISO_PATH"
$expectedXisoChecksum = (Get-PortableValue "XILOGCONVERT_XISO_SHA256").ToLowerInvariant()

if (-not (Test-Path -LiteralPath $xisoSource -PathType Leaf)) {
    $portableXisoSource = Resolve-PortablePath -Value $runtimeXisoPath -BasePath $pluginRoot
    if (Test-Path -LiteralPath $portableXisoSource -PathType Leaf) {
        $xisoSource = $portableXisoSource
    }
    else {
        throw "xISO.exe wurde weder unter XILOGCONVERT_BUILD_XISO_SOURCE ($xisoSource) noch unter XILOGCONVERT_XISO_PATH ($portableXisoSource) gefunden. Passe die .env an oder lege xISO.exe neben build.cmd."
    }
}

$sourceChecksum = (Get-FileHash -LiteralPath $xisoSource -Algorithm SHA256).Hash.ToLowerInvariant()
if ($sourceChecksum -ne $expectedXisoChecksum) {
    throw "Die xISO.exe entspricht nicht der für XilogConvert freigegebenen Version. SHA-256: $sourceChecksum"
}

$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($null -eq $dotnet) {
    throw "Das .NET 8 SDK wurde nicht gefunden. Installation: https://dotnet.microsoft.com/download/dotnet/8.0"
}

New-Item -ItemType Directory -Force -Path $publishDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null

& $dotnet.Path publish $projectFile `
    --configuration $Configuration `
    --runtime $Runtime `
    --self-contained true `
    --output $publishDirectory `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true

if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish ist mit Exit-Code $LASTEXITCODE fehlgeschlagen."
}

$publishedXiso = Resolve-PortablePath -Value $runtimeXisoPath -BasePath $publishDirectory
$publishPrefix = [System.IO.Path]::GetFullPath($publishDirectory).TrimEnd('\') + '\'
if (-not $publishedXiso.StartsWith($publishPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "XILOGCONVERT_XISO_PATH muss für den portablen Build innerhalb des Publish-Ordners liegen: $runtimeXisoPath"
}
New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($publishedXiso)) | Out-Null
Copy-Item -LiteralPath $xisoSource -Destination $publishedXiso -Force
$publishedChecksum = (Get-FileHash -LiteralPath $publishedXiso -Algorithm SHA256).Hash.ToLowerInvariant()
if ($publishedChecksum -ne $expectedXisoChecksum) {
    throw "Die veröffentlichte xISO.exe besitzt eine unerwartete Prüfsumme: $publishedChecksum"
}
Copy-Item -LiteralPath $environmentPath -Destination (Join-Path $publishDirectory ".env") -Force
Copy-Item -LiteralPath (Join-Path $pluginRoot "README.md") -Destination (Join-Path $publishDirectory "README.md") -Force
$legacyChecksumPath = Join-Path $publishDirectory "xISO.sha256"
if (Test-Path -LiteralPath $legacyChecksumPath -PathType Leaf) {
    Remove-Item -LiteralPath $legacyChecksumPath -Force
}

if (-not $NoArchive) {
    $packageFiles = @(Get-ChildItem -LiteralPath $publishDirectory -Force)
    Compress-Archive -LiteralPath $packageFiles.FullName -DestinationPath $artifactPath -CompressionLevel Optimal -Force
    Write-Host "Distributionsarchiv: $artifactPath"
}

Write-Host "Anwendung: $(Join-Path $publishDirectory 'XilogConvert.exe')"

