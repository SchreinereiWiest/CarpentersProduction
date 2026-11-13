using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CarpentersProduction.XilogConvert.Infrastructure;

namespace CarpentersProduction.XilogConvert.Conversion;

public sealed class XisoConverter
{
    private static readonly Regex ErrorCountPattern = new(
        @"\[ERRORS\]\s*=\s*(\d+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private readonly string _xisoPath;
    private readonly string _expectedChecksum;
    private readonly string _temporaryDirectory;
    private readonly TimeSpan _compilerTimeout;
    private readonly int _maximumProgramCount;
    private readonly long _maximumArchiveContentSize;

    public XisoConverter(PortableConfiguration configuration)
    {
        _xisoPath = configuration.XisoPath;
        _expectedChecksum = configuration.XisoChecksum;
        _temporaryDirectory = configuration.TemporaryDirectory;
        _compilerTimeout = configuration.CompilerTimeout;
        _maximumProgramCount = configuration.MaximumProgramCount;
        _maximumArchiveContentSize = configuration.MaximumArchiveContentSize;
    }

    public string ValidateInstallation()
    {
        if (!File.Exists(_xisoPath))
        {
            throw new XisoConversionException(
                $"xISO.exe wurde am konfigurierten Pfad nicht gefunden: {_xisoPath}");
        }

        using var stream = File.OpenRead(_xisoPath);
        var actualChecksum = Convert.ToHexString(SHA256.HashData(stream));
        if (!string.Equals(_expectedChecksum, actualChecksum, StringComparison.OrdinalIgnoreCase))
        {
            throw new XisoConversionException(
                "Die Prüfsumme von xISO.exe stimmt nicht mit XILOGCONVERT_XISO_SHA256 aus .env überein.");
        }

        return actualChecksum;
    }

    public async Task<ConversionResult> ConvertAsync(
        ConversionRequest request,
        IProgress<ConversionProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);
        ValidateInstallation();

        var jobDirectory = Path.Combine(
            _temporaryDirectory,
            Guid.NewGuid().ToString("N"));
        var sourceDirectory = Path.Combine(jobDirectory, "SRC");
        var stagedDirectory = Path.Combine(jobDirectory, "OUT");
        Directory.CreateDirectory(sourceDirectory);
        Directory.CreateDirectory(stagedDirectory);

        try
        {
            var sources = await ExtractProgramsAsync(
                request.InputArchive,
                sourceDirectory,
                cancellationToken);
            var outputNames = CreateOutputNames(sources.Select(source => source.OriginalName));
            var converted = new List<ConvertedProgram>(sources.Count);

            for (var index = 0; index < sources.Count; index += 1)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var source = sources[index];
                progress?.Report(new ConversionProgress(
                    index,
                    sources.Count,
                    source.OriginalName,
                    $"Konvertiere {source.OriginalName} …"));

                var internalStem = $"P{index + 1:000000}";
                var internalSource = Path.Combine(jobDirectory, $"{internalStem}.XXL");
                File.Copy(source.ExtractedPath, internalSource, true);

                var internalProgram = await RunCompilerAsync(
                    jobDirectory,
                    internalStem,
                    source.OriginalName,
                    cancellationToken);
                var stagedPath = Path.Combine(stagedDirectory, outputNames[index]);
                File.Copy(internalProgram, stagedPath, true);
                converted.Add(new ConvertedProgram(source.OriginalName, outputNames[index], stagedPath));

                progress?.Report(new ConversionProgress(
                    index + 1,
                    sources.Count,
                    source.OriginalName,
                    $"{source.OriginalName} wurde zu {outputNames[index]} konvertiert."));
            }

            return await PublishResultAsync(request, converted, jobDirectory, cancellationToken);
        }
        finally
        {
            TryDeleteDirectory(jobDirectory);
        }
    }

    private static void ValidateRequest(ConversionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.InputArchive)
            || !File.Exists(request.InputArchive)
            || !string.Equals(Path.GetExtension(request.InputArchive), ".zip", StringComparison.OrdinalIgnoreCase))
        {
            throw new XisoConversionException("Bitte eine vorhandene ZIP-Datei mit XXL-Programmen auswählen.");
        }

        if (string.IsNullOrWhiteSpace(request.OutputDirectory))
        {
            throw new XisoConversionException("Bitte einen Zielordner auswählen.");
        }
    }

    private async Task<List<ExtractedProgram>> ExtractProgramsAsync(
        string archivePath,
        string destination,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var archiveStream = new FileStream(
                archivePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                65_536,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            using var archive = new ZipArchive(archiveStream, ZipArchiveMode.Read, false);
            var entries = archive.Entries
                .Where(entry => !string.IsNullOrEmpty(entry.Name)
                    && string.Equals(Path.GetExtension(entry.Name), ".xxl", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (entries.Count == 0)
            {
                throw new XisoConversionException("Das ZIP enthält keine XXL-Dateien.");
            }

            if (entries.Count > _maximumProgramCount)
            {
                throw new XisoConversionException(
                    $"Das ZIP enthält mehr als {_maximumProgramCount:N0} XXL-Dateien und wird aus Sicherheitsgründen nicht verarbeitet.");
            }

            var declaredSize = entries.Sum(entry => entry.Length);
            if (declaredSize > _maximumArchiveContentSize)
            {
                throw new XisoConversionException(
                    $"Die entpackten XXL-Dateien überschreiten zusammen die erlaubten {_maximumArchiveContentSize / 1024 / 1024:N0} MB.");
            }

            var result = new List<ExtractedProgram>(entries.Count);
            long extractedSize = 0;
            for (var index = 0; index < entries.Count; index += 1)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var entry = entries[index];
                var extractedPath = Path.Combine(destination, $"S{index + 1:000000}.XXL");

                await using var input = entry.Open();
                await using var output = new FileStream(
                    extractedPath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None,
                    65_536,
                    FileOptions.Asynchronous);
                extractedSize += await CopyWithLimitAsync(
                    input,
                    output,
                    _maximumArchiveContentSize - extractedSize,
                    _maximumArchiveContentSize,
                    cancellationToken);
                result.Add(new ExtractedProgram(entry.Name, extractedPath));
            }

            return result;
        }
        catch (InvalidDataException exception)
        {
            throw new XisoConversionException("Die ausgewählte Datei ist kein gültiges ZIP-Archiv.", exception);
        }
    }

    private async Task<string> RunCompilerAsync(
        string workingDirectory,
        string stem,
        string sourceName,
        CancellationToken cancellationToken)
    {
        var sourceFile = $"{stem}.XXL";
        var programFile = $"{stem}.PGM";
        var infoFile = $"{stem}.INF";
        var listingFile = $"{stem}.LST";
        var programPath = Path.Combine(workingDirectory, programFile);
        var infoPath = Path.Combine(workingDirectory, infoFile);
        var listingPath = Path.Combine(workingDirectory, listingFile);

        var startInfo = new ProcessStartInfo
        {
            FileName = _xisoPath,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.Default,
            StandardErrorEncoding = Encoding.Default
        };
        startInfo.ArgumentList.Add(sourceFile);
        startInfo.ArgumentList.Add("-s");
        startInfo.ArgumentList.Add($"-i{infoFile}");
        startInfo.ArgumentList.Add($"-l{listingFile}");
        startInfo.ArgumentList.Add($"-o{programFile}");

        using var process = new Process { StartInfo = startInfo };
        try
        {
            if (!process.Start())
            {
                throw new XisoConversionException($"xISO konnte für {sourceName} nicht gestartet werden.");
            }
        }
        catch (Exception exception) when (exception is not XisoConversionException)
        {
            throw new XisoConversionException(
                $"xISO konnte für {sourceName} nicht gestartet werden: {exception.Message}",
                exception);
        }

        var standardOutput = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var standardError = process.StandardError.ReadToEndAsync(cancellationToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(_compilerTimeout);

        try
        {
            await process.WaitForExitAsync(timeout.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            TryKill(process);
            throw new XisoConversionException(
                $"xISO hat die Konvertierung von {sourceName} nicht innerhalb von {_compilerTimeout.TotalSeconds:0} Sekunden beendet.");
        }
        catch (OperationCanceledException)
        {
            TryKill(process);
            throw;
        }

        var consoleText = $"{await standardOutput}\n{await standardError}".Trim();
        if (!File.Exists(infoPath))
        {
            throw new XisoConversionException(
                BuildCompilerError(sourceName, "xISO hat keine INF-Prüfdatei erzeugt.", consoleText, listingPath));
        }

        var info = await File.ReadAllTextAsync(infoPath, Encoding.ASCII, cancellationToken);
        var errorMatch = ErrorCountPattern.Match(info);
        if (!errorMatch.Success || !int.TryParse(errorMatch.Groups[1].Value, out var errorCount))
        {
            throw new XisoConversionException(
                BuildCompilerError(sourceName, "Die xISO-INF-Datei enthält keinen gültigen Fehlerstatus.", consoleText, listingPath));
        }

        if (process.ExitCode != 0 || errorCount != 0)
        {
            throw new XisoConversionException(BuildCompilerError(
                sourceName,
                $"xISO meldet {errorCount} Fehler (Exit-Code {process.ExitCode}).",
                consoleText,
                listingPath));
        }

        if (!File.Exists(programPath) || new FileInfo(programPath).Length == 0)
        {
            throw new XisoConversionException(
                BuildCompilerError(sourceName, "xISO hat keine gültige PGM-Datei erzeugt.", consoleText, listingPath));
        }

        return programPath;
    }

    private static async Task<ConversionResult> PublishResultAsync(
        ConversionRequest request,
        IReadOnlyList<ConvertedProgram> programs,
        string jobDirectory,
        CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(request.OutputDirectory);
        var writeFiles = request.ExportMode is ExportMode.Files or ExportMode.FilesAndZip;
        var writeZip = request.ExportMode is ExportMode.Zip or ExportMode.FilesAndZip;
        var finalFiles = writeFiles
            ? programs.Select(program => Path.Combine(request.OutputDirectory, program.ProgramName)).ToList()
            : new List<string>();
        var zipPath = writeZip
            ? Path.Combine(request.OutputDirectory, CreateZipName(request.InputArchive))
            : null;

        var conflicts = finalFiles
            .Append(zipPath)
            .Where(path => path is not null && File.Exists(path))
            .Cast<string>()
            .ToList();
        if (!request.OverwriteExisting && conflicts.Count > 0)
        {
            throw new XisoConversionException(
                $"Im Zielordner existieren bereits Dateien: {string.Join(", ", conflicts.Select(Path.GetFileName))}. "
                + "Aktiviere ‚Vorhandene Ausgaben ersetzen‘ oder wähle einen anderen Zielordner.");
        }

        string? stagedZip = null;
        if (writeZip && zipPath is not null)
        {
            stagedZip = Path.Combine(jobDirectory, "PROGRAMS.ZIP");
            await CreateProgramArchiveAsync(stagedZip, programs, cancellationToken);
        }

        var writtenFiles = new List<string>();
        if (writeFiles)
        {
            for (var index = 0; index < programs.Count; index += 1)
            {
                cancellationToken.ThrowIfCancellationRequested();
                File.Copy(programs[index].StagedPath, finalFiles[index], request.OverwriteExisting);
                writtenFiles.Add(finalFiles[index]);
            }
        }

        if (stagedZip is not null && zipPath is not null)
        {
            File.Copy(stagedZip, zipPath, request.OverwriteExisting);
            writtenFiles.Add(zipPath);
        }

        return new ConversionResult(programs.Count, writtenFiles, zipPath);
    }

    private static async Task CreateProgramArchiveAsync(
        string archivePath,
        IReadOnlyList<ConvertedProgram> programs,
        CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(
            archivePath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            65_536,
            FileOptions.Asynchronous);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Create, false);
        foreach (var program in programs)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var entry = archive.CreateEntry(program.ProgramName, CompressionLevel.Optimal);
            await using var input = new FileStream(
                program.StagedPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                65_536,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            await using var output = entry.Open();
            await input.CopyToAsync(output, cancellationToken);
        }
    }

    private static IReadOnlyList<string> CreateOutputNames(IEnumerable<string> sourceNames)
    {
        var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<string>();
        foreach (var sourceName in sourceNames)
        {
            var baseName = SanitizeProgramName(Path.GetFileNameWithoutExtension(sourceName));
            var candidate = $"{baseName}.PGM";
            var suffix = 2;
            while (!usedNames.Add(candidate))
            {
                var suffixText = suffix.ToString();
                var prefixLength = Math.Max(1, 8 - suffixText.Length - 1);
                candidate = $"{baseName[..Math.Min(baseName.Length, prefixLength)]}_{suffixText}.PGM";
                suffix += 1;
            }
            result.Add(candidate);
        }

        return result;
    }

    private static string SanitizeProgramName(string value)
    {
        var normalized = new string(value
            .Normalize(NormalizationForm.FormD)
            .Where(character => character <= 127 && (char.IsLetterOrDigit(character) || character is '_' or '-'))
            .Select(char.ToUpperInvariant)
            .ToArray());
        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "PROGRAM";
        }

        return normalized[..Math.Min(normalized.Length, 8)];
    }

    private static string CreateZipName(string archivePath)
    {
        var inputName = Path.GetFileNameWithoutExtension(archivePath).Trim();
        if (string.IsNullOrWhiteSpace(inputName))
        {
            inputName = "cnc-programme";
        }

        var invalidCharacters = Path.GetInvalidFileNameChars();
        var safeName = new string(inputName
            .Select(character => invalidCharacters.Contains(character) ? '_' : character)
            .ToArray());
        return $"{safeName}-pgm.zip";
    }

    private static string BuildCompilerError(
        string sourceName,
        string message,
        string consoleText,
        string listingPath)
    {
        var details = new List<string>();
        if (!string.IsNullOrWhiteSpace(consoleText))
        {
            details.Add(consoleText.Trim());
        }

        if (File.Exists(listingPath))
        {
            var listing = File.ReadAllText(listingPath, Encoding.Default).Trim();
            if (!string.IsNullOrWhiteSpace(listing))
            {
                details.Add(listing.Length > 4_000 ? listing[..4_000] : listing);
            }
        }

        return details.Count == 0
            ? $"{sourceName}: {message}"
            : $"{sourceName}: {message}{Environment.NewLine}{string.Join(Environment.NewLine, details)}";
    }

    private static async Task<long> CopyWithLimitAsync(
        Stream input,
        Stream output,
        long remainingBytes,
        long maximumBytes,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[65_536];
        long written = 0;
        while (true)
        {
            var read = await input.ReadAsync(buffer, cancellationToken);
            if (read == 0)
            {
                return written;
            }

            written += read;
            if (written > remainingBytes)
            {
                throw new XisoConversionException(
                    $"Die entpackten XXL-Dateien überschreiten zusammen die erlaubten {maximumBytes / 1024 / 1024:N0} MB.");
            }

            await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }
    }

    private static void TryKill(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(true);
            }
        }
        catch (InvalidOperationException)
        {
        }
        catch (System.ComponentModel.Win32Exception)
        {
        }
    }

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }

    private sealed record ExtractedProgram(string OriginalName, string ExtractedPath);
}

