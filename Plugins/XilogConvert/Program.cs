using System.Windows.Forms;
using CarpentersProduction.XilogConvert.Infrastructure;

namespace CarpentersProduction.XilogConvert;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        PortableConfiguration configuration;
        try
        {
            configuration = PortableEnvironment.Load(AppContext.BaseDirectory);
        }
        catch (PortableConfigurationException exception)
        {
            MessageBox.Show(
                exception.Message,
                "XilogConvert · portable Konfiguration fehlt",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        var initialArchive = FindInitialArchive(args);
        Application.Run(new MainForm(initialArchive, configuration));
    }

    private static string? FindInitialArchive(IEnumerable<string> arguments)
    {
        foreach (var argument in arguments)
        {
            try
            {
                var path = Path.GetFullPath(argument);
                if (File.Exists(path)
                    && string.Equals(Path.GetExtension(path), ".zip", StringComparison.OrdinalIgnoreCase))
                {
                    return path;
                }
            }
            catch (Exception exception) when (exception is ArgumentException
                or NotSupportedException
                or PathTooLongException)
            {
            }
        }

        return null;
    }
}

