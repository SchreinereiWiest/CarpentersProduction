namespace CarpentersProduction.XilogConvert.Conversion;

public enum ExportMode
{
    Files,
    Zip,
    FilesAndZip
}

public sealed record ConversionRequest(
    string InputArchive,
    string OutputDirectory,
    ExportMode ExportMode,
    bool OverwriteExisting);

public sealed record ConvertedProgram(
    string SourceName,
    string ProgramName,
    string StagedPath);

public sealed record ConversionResult(
    int ProgramCount,
    IReadOnlyList<string> WrittenFiles,
    string? ZipPath);

public sealed record ConversionProgress(
    int Current,
    int Total,
    string FileName,
    string Message);

public sealed class XisoConversionException : Exception
{
    public XisoConversionException(string message)
        : base(message)
    {
    }

    public XisoConversionException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

