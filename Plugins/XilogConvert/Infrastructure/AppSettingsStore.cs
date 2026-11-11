using System.Text.Json;
using CarpentersProduction.XilogConvert.Conversion;

namespace CarpentersProduction.XilogConvert.Infrastructure;

public sealed class AppSettings
{
    public string OutputDirectory { get; set; } = string.Empty;

    public ExportMode ExportMode { get; set; } = ExportMode.Files;

    public bool OverwriteExisting { get; set; } = true;
}

public sealed class AppSettingsStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true
    };

    private readonly PortableConfiguration _configuration;
    private readonly string _settingsPath;

    public AppSettingsStore(PortableConfiguration configuration)
    {
        _configuration = configuration;
        _settingsPath = configuration.SettingsPath;
    }

    public AppSettings Load()
    {
        try
        {
            if (!File.Exists(_settingsPath))
            {
                return CreateDefaults();
            }

            var settings = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(_settingsPath));
            if (settings is null || string.IsNullOrWhiteSpace(settings.OutputDirectory))
            {
                return CreateDefaults();
            }

            settings.OutputDirectory = ResolveStoredPath(settings.OutputDirectory);
            return settings;
        }
        catch (JsonException)
        {
            return CreateDefaults();
        }
        catch (IOException)
        {
            return CreateDefaults();
        }
        catch (UnauthorizedAccessException)
        {
            return CreateDefaults();
        }
        catch (Exception exception) when (exception is ArgumentException
            or NotSupportedException)
        {
            return CreateDefaults();
        }
    }

    public void Save(AppSettings settings)
    {
        var directory = Path.GetDirectoryName(_settingsPath)
            ?? throw new InvalidOperationException("Der Einstellungsordner konnte nicht ermittelt werden.");
        Directory.CreateDirectory(directory);

        var temporaryPath = $"{_settingsPath}.{Guid.NewGuid():N}.tmp";
        try
        {
            var portableSettings = new AppSettings
            {
                OutputDirectory = CreateStoredPath(settings.OutputDirectory),
                ExportMode = settings.ExportMode,
                OverwriteExisting = settings.OverwriteExisting
            };
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(portableSettings, SerializerOptions));
            File.Move(temporaryPath, _settingsPath, true);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }
    }

    private AppSettings CreateDefaults() => new()
    {
        OutputDirectory = _configuration.DefaultOutputDirectory,
        ExportMode = _configuration.DefaultExportMode,
        OverwriteExisting = _configuration.DefaultOverwriteExisting
    };

    private string ResolveStoredPath(string value) => Path.GetFullPath(Path.IsPathRooted(value)
        ? value
        : Path.Combine(_configuration.ApplicationDirectory, value));

    public string ResolveOutputPath(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Der Zielordner darf nicht leer sein.", nameof(value));
        }

        return ResolveStoredPath(value);
    }

    private string CreateStoredPath(string value)
    {
        var fullPath = Path.GetFullPath(Path.IsPathRooted(value)
            ? value
            : Path.Combine(_configuration.ApplicationDirectory, value));
        var relativePath = Path.GetRelativePath(_configuration.ApplicationDirectory, fullPath);
        return !Path.IsPathRooted(relativePath)
            && relativePath != ".."
            && !relativePath.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal)
                ? $".{Path.DirectorySeparatorChar}{relativePath}"
                : fullPath;
    }
}

