using System.Globalization;
using System.Text.RegularExpressions;
using CarpentersProduction.XilogConvert.Conversion;

namespace CarpentersProduction.XilogConvert.Infrastructure;

public sealed record PortableConfiguration(
    string ApplicationDirectory,
    string EnvironmentPath,
    string XisoPath,
    string XisoChecksum,
    string SettingsPath,
    string DefaultOutputDirectory,
    ExportMode DefaultExportMode,
    bool DefaultOverwriteExisting,
    string TemporaryDirectory,
    TimeSpan CompilerTimeout,
    int MaximumProgramCount,
    long MaximumArchiveContentSize);

public sealed class PortableConfigurationException : Exception
{
    public PortableConfigurationException(string message)
        : base(message)
    {
    }

    public PortableConfigurationException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

public static partial class PortableEnvironment
{
    private const string EnvironmentFileName = ".env";
    private static readonly Regex VariableReferencePattern = new(
        @"\$\{(?<braced>[A-Za-z_][A-Za-z0-9_]*)\}|%(?<windows>[A-Za-z_][A-Za-z0-9_]*)%",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static PortableConfiguration Load(string applicationDirectory)
    {
        var root = Path.GetFullPath(applicationDirectory);
        var environmentPath = Path.Combine(root, EnvironmentFileName);
        if (!File.Exists(environmentPath))
        {
            throw new PortableConfigurationException(
                $"Die portable Konfigurationsdatei fehlt: {environmentPath}");
        }

        Dictionary<string, string> fileValues;
        try
        {
            fileValues = Parse(File.ReadAllLines(environmentPath));
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            throw new PortableConfigurationException(
                $"Die portable Konfiguration konnte nicht gelesen werden: {environmentPath}",
                exception);
        }

        string ResolveValue(string key, string? fallback = null, bool required = false)
        {
            var processValue = Environment.GetEnvironmentVariable(key);
            var rawValue = !string.IsNullOrWhiteSpace(processValue)
                ? processValue
                : fileValues.GetValueOrDefault(key, fallback ?? string.Empty);
            var value = ExpandVariables(rawValue, key, root, fileValues, []);
            if (required && string.IsNullOrWhiteSpace(value))
            {
                throw new PortableConfigurationException(
                    $"Die Variable {key} fehlt in {environmentPath}.");
            }

            return value;
        }

        string ResolvePath(string key, string fallback, bool required = false)
        {
            var value = ResolveValue(key, fallback, required).Trim();
            try
            {
                return Path.GetFullPath(Path.IsPathRooted(value)
                    ? value
                    : Path.Combine(root, value));
            }
            catch (Exception exception) when (exception is ArgumentException
                or NotSupportedException
                or PathTooLongException)
            {
                throw new PortableConfigurationException(
                    $"Die Variable {key} enthält keinen gültigen Pfad: {value}",
                    exception);
            }
        }

        int ResolveInteger(string key, int fallback, int minimum, int maximum)
        {
            var rawValue = ResolveValue(key, fallback.ToString(CultureInfo.InvariantCulture));
            if (!int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
                || value < minimum
                || value > maximum)
            {
                throw new PortableConfigurationException(
                    $"Die Variable {key} muss zwischen {minimum} und {maximum} liegen.");
            }

            return value;
        }

        var checksum = ResolveValue("XILOGCONVERT_XISO_SHA256", required: true).Trim();
        if (!Regex.IsMatch(checksum, "^[0-9a-fA-F]{64}$", RegexOptions.CultureInvariant))
        {
            throw new PortableConfigurationException(
                "XILOGCONVERT_XISO_SHA256 muss eine SHA-256-Prüfsumme mit 64 Hex-Zeichen enthalten.");
        }

        var timeoutSeconds = ResolveInteger(
            "XILOGCONVERT_COMPILER_TIMEOUT_SECONDS",
            60,
            5,
            3_600);
        var maximumPrograms = ResolveInteger(
            "XILOGCONVERT_MAX_PROGRAMS",
            5_000,
            1,
            100_000);
        var maximumMegabytes = ResolveInteger(
            "XILOGCONVERT_MAX_UNPACKED_MB",
            250,
            1,
            10_240);

        return new PortableConfiguration(
            root,
            environmentPath,
            ResolvePath("XILOGCONVERT_XISO_PATH", @".\xISO.exe", true),
            checksum,
            ResolvePath("XILOGCONVERT_SETTINGS_PATH", @".\settings.json"),
            ResolvePath("XILOGCONVERT_DEFAULT_OUTPUT_PATH", @".\PGM"),
            ResolveExportMode(ResolveValue("XILOGCONVERT_DEFAULT_EXPORT_MODE", "files")),
            ResolveBoolean(ResolveValue("XILOGCONVERT_DEFAULT_OVERWRITE", "true"), "XILOGCONVERT_DEFAULT_OVERWRITE"),
            ResolvePath("XILOGCONVERT_TEMP_PATH", Path.Combine(Path.GetTempPath(), "XilogConvert")),
            TimeSpan.FromSeconds(timeoutSeconds),
            maximumPrograms,
            maximumMegabytes * 1024L * 1024L);
    }

    private static Dictionary<string, string> Parse(IEnumerable<string> lines)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var lineNumber = 0;
        foreach (var originalLine in lines)
        {
            lineNumber += 1;
            var line = originalLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            if (line.StartsWith("export ", StringComparison.OrdinalIgnoreCase))
            {
                line = line[7..].TrimStart();
            }

            var separator = line.IndexOf('=');
            if (separator <= 0)
            {
                throw new PortableConfigurationException(
                    $"Ungültige .env-Zeile {lineNumber}: {originalLine}");
            }

            var key = line[..separator].Trim();
            if (!Regex.IsMatch(key, "^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.CultureInvariant))
            {
                throw new PortableConfigurationException(
                    $"Ungültiger Variablenname in .env-Zeile {lineNumber}: {key}");
            }

            values[key] = Unquote(line[(separator + 1)..].Trim());
        }

        return values;
    }

    private static string Unquote(string value)
    {
        if (value.Length < 2)
        {
            return value;
        }

        if (value[0] == '\'' && value[^1] == '\'')
        {
            return value[1..^1];
        }

        if (value[0] != '"' || value[^1] != '"')
        {
            return value;
        }

        return value[1..^1]
            .Replace("\\\"", "\"", StringComparison.Ordinal)
            .Replace("\\\\", "\\", StringComparison.Ordinal);
    }

    private static string ExpandVariables(
        string value,
        string currentKey,
        string applicationDirectory,
        IReadOnlyDictionary<string, string> fileValues,
        HashSet<string> expansionStack)
    {
        if (!expansionStack.Add(currentKey))
        {
            throw new PortableConfigurationException(
                $"Zyklische Variablenreferenz in .env: {string.Join(" -> ", expansionStack.Append(currentKey))}");
        }

        try
        {
            var expanded = value;
            for (var pass = 0; pass < 10; pass += 1)
            {
                var changed = false;
                expanded = VariableReferencePattern.Replace(expanded, match =>
                {
                    var variableName = match.Groups["braced"].Success
                        ? match.Groups["braced"].Value
                        : match.Groups["windows"].Value;
                    string? replacement;
                    if (string.Equals(variableName, "APP_DIR", StringComparison.OrdinalIgnoreCase))
                    {
                        replacement = applicationDirectory;
                    }
                    else
                    {
                        replacement = Environment.GetEnvironmentVariable(variableName);
                        if (string.IsNullOrWhiteSpace(replacement)
                            && fileValues.TryGetValue(variableName, out var fileValue))
                        {
                            replacement = ExpandVariables(
                                fileValue,
                                variableName,
                                applicationDirectory,
                                fileValues,
                                expansionStack);
                        }
                    }

                    if (replacement is null)
                    {
                        return match.Value;
                    }

                    changed = true;
                    return replacement;
                });

                if (!VariableReferencePattern.IsMatch(expanded))
                {
                    return expanded;
                }

                if (!changed)
                {
                    var unresolved = VariableReferencePattern.Match(expanded).Value;
                    throw new PortableConfigurationException(
                        $"Die Variable {currentKey} verweist auf eine nicht definierte Variable: {unresolved}");
                }
            }

            throw new PortableConfigurationException(
                $"Die Variable {currentKey} enthält zu viele verschachtelte Referenzen.");
        }
        finally
        {
            expansionStack.Remove(currentKey);
        }
    }

    private static ExportMode ResolveExportMode(string value) => value.Trim().ToLowerInvariant() switch
    {
        "files" => ExportMode.Files,
        "zip" => ExportMode.Zip,
        "files-and-zip" or "filesandzip" or "both" => ExportMode.FilesAndZip,
        _ => throw new PortableConfigurationException(
            "XILOGCONVERT_DEFAULT_EXPORT_MODE muss files, zip oder files-and-zip sein.")
    };

    private static bool ResolveBoolean(string value, string key) => value.Trim().ToLowerInvariant() switch
    {
        "1" or "true" or "yes" or "on" => true,
        "0" or "false" or "no" or "off" => false,
        _ => throw new PortableConfigurationException(
            $"Die Variable {key} muss true oder false sein.")
    };
}

