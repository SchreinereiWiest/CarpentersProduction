using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using CarpentersProduction.XilogConvert.Conversion;
using CarpentersProduction.XilogConvert.Infrastructure;

namespace CarpentersProduction.XilogConvert;

public sealed class MainForm : Form
{
    private readonly PortableConfiguration _configuration;
    private readonly AppSettingsStore _settingsStore;
    private readonly XisoConverter _converter;
    private readonly TextBox _archiveTextBox = new();
    private readonly TextBox _outputTextBox = new();
    private readonly ComboBox _exportModeComboBox = new();
    private readonly CheckBox _overwriteCheckBox = new();
    private readonly Label _toolStatusLabel = new();
    private readonly Label _statusLabel = new();
    private readonly ProgressBar _progressBar = new();
    private readonly TextBox _logTextBox = new();
    private readonly Button _convertButton = new();
    private readonly Button _cancelButton = new();
    private readonly Button _openOutputButton = new();
    private readonly Panel _dropPanel = new();
    private readonly Label _dropLabel = new();

    private CancellationTokenSource? _conversionCancellation;
    private bool _busy;
    private bool _xisoReady;

    public MainForm(string? initialArchive, PortableConfiguration configuration)
    {
        _configuration = configuration;
        _settingsStore = new AppSettingsStore(configuration);
        _converter = new XisoConverter(configuration);
        Text = "XilogConvert · XXL zu PGM";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(760, 650);
        ClientSize = new Size(840, 700);
        Font = new Font("Segoe UI", 9F);
        AutoScaleMode = AutoScaleMode.Dpi;
        AllowDrop = true;

        BuildInterface();
        ApplySettings(_settingsStore.Load());
        if (!string.IsNullOrWhiteSpace(initialArchive))
        {
            SelectArchive(initialArchive);
        }

        DragEnter += HandleDragEnter;
        DragDrop += HandleDragDrop;
        DragLeave += HandleDragLeave;
        _dropPanel.DragEnter += HandleDragEnter;
        _dropPanel.DragDrop += HandleDragDrop;
        _dropPanel.DragLeave += HandleDragLeave;
        _dropLabel.DragEnter += HandleDragEnter;
        _dropLabel.DragDrop += HandleDragDrop;
        _dropLabel.DragLeave += HandleDragLeave;
        Shown += (_, _) => ValidateXisoInstallation();
        FormClosing += HandleFormClosing;
    }

    private void BuildInterface()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(18),
            ColumnCount = 1,
            RowCount = 8
        };
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 116));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        var heading = new Label
        {
            AutoSize = true,
            Font = new Font(Font.FontFamily, 17F, FontStyle.Bold),
            Text = "XilogConvert",
            Margin = new Padding(0, 0, 0, 12)
        };
        root.Controls.Add(heading, 0, 0);

        _dropPanel.AllowDrop = true;
        _dropPanel.BorderStyle = BorderStyle.FixedSingle;
        _dropPanel.Dock = DockStyle.Fill;
        _dropPanel.Margin = new Padding(0, 0, 0, 12);
        _dropPanel.BackColor = Color.FromArgb(245, 248, 252);
        _dropLabel.AllowDrop = true;
        _dropLabel.Dock = DockStyle.Fill;
        _dropLabel.TextAlign = ContentAlignment.MiddleCenter;
        _dropLabel.Font = new Font(Font.FontFamily, 11F, FontStyle.Bold);
        _dropLabel.Text = "Frontend-ZIP mit XXL-Dateien hier ablegen\r\noder unten auswählen";
        _dropLabel.ForeColor = Color.FromArgb(45, 75, 110);
        _dropPanel.Controls.Add(_dropLabel);
        root.Controls.Add(_dropPanel, 0, 1);

        var archiveRow = CreatePathRow(
            "Eingabe-ZIP",
            _archiveTextBox,
            "ZIP auswählen …",
            SelectArchiveFromDialog);
        root.Controls.Add(archiveRow, 0, 2);

        var settingsGroup = new GroupBox
        {
            Text = "Ausgabe",
            Dock = DockStyle.Top,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Padding = new Padding(12),
            Margin = new Padding(0, 10, 0, 10)
        };
        var settingsTable = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            ColumnCount = 3,
            RowCount = 3
        };
        settingsTable.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 116));
        settingsTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        settingsTable.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        settingsTable.Controls.Add(CreateFieldLabel("Zielordner"), 0, 0);
        _outputTextBox.Dock = DockStyle.Fill;
        _outputTextBox.Margin = new Padding(0, 3, 8, 7);
        _outputTextBox.TextChanged += (_, _) => UpdateConvertButtonState();
        settingsTable.Controls.Add(_outputTextBox, 1, 0);
        var outputButton = new Button
        {
            AutoSize = true,
            Text = "Ordner wählen …",
            Margin = new Padding(0, 0, 0, 7)
        };
        outputButton.Click += (_, _) => SelectOutputDirectory();
        settingsTable.Controls.Add(outputButton, 2, 0);

        settingsTable.Controls.Add(CreateFieldLabel("Ausgabeart"), 0, 1);
        _exportModeComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
        _exportModeComboBox.Dock = DockStyle.Left;
        _exportModeComboBox.Width = 280;
        _exportModeComboBox.Margin = new Padding(0, 3, 8, 7);
        _exportModeComboBox.Items.AddRange([
            new ExportModeOption(ExportMode.Files, "Einzelne PGM-Dateien"),
            new ExportModeOption(ExportMode.Zip, "ZIP mit PGM-Dateien"),
            new ExportModeOption(ExportMode.FilesAndZip, "PGM-Dateien und ZIP")
        ]);
        settingsTable.Controls.Add(_exportModeComboBox, 1, 1);
        settingsTable.SetColumnSpan(_exportModeComboBox, 2);

        _overwriteCheckBox.AutoSize = true;
        _overwriteCheckBox.Text = "Vorhandene Ausgaben ersetzen";
        _overwriteCheckBox.Margin = new Padding(0, 4, 0, 0);
        settingsTable.Controls.Add(_overwriteCheckBox, 1, 2);
        settingsTable.SetColumnSpan(_overwriteCheckBox, 2);
        settingsGroup.Controls.Add(settingsTable);
        root.Controls.Add(settingsGroup, 0, 3);

        _toolStatusLabel.AutoSize = true;
        _toolStatusLabel.Text = "xISO wird geprüft …";
        _toolStatusLabel.ForeColor = Color.DimGray;
        _toolStatusLabel.Margin = new Padding(0, 0, 0, 8);
        root.Controls.Add(_toolStatusLabel, 0, 4);

        var progressTable = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            ColumnCount = 1,
            RowCount = 2,
            Margin = new Padding(0, 0, 0, 8)
        };
        progressTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        _statusLabel.AutoSize = true;
        _statusLabel.Text = "Bereit";
        _statusLabel.Margin = new Padding(0, 0, 0, 5);
        _progressBar.Dock = DockStyle.Top;
        _progressBar.Height = 18;
        progressTable.Controls.Add(_statusLabel, 0, 0);
        progressTable.Controls.Add(_progressBar, 0, 1);
        root.Controls.Add(progressTable, 0, 5);

        var logGroup = new GroupBox
        {
            Text = "Protokoll",
            Dock = DockStyle.Fill,
            Padding = new Padding(10),
            Margin = new Padding(0, 0, 0, 12)
        };
        _logTextBox.Dock = DockStyle.Fill;
        _logTextBox.Multiline = true;
        _logTextBox.ReadOnly = true;
        _logTextBox.ScrollBars = ScrollBars.Both;
        _logTextBox.WordWrap = false;
        _logTextBox.BackColor = Color.White;
        _logTextBox.Font = new Font("Consolas", 9F);
        logGroup.Controls.Add(_logTextBox);
        root.Controls.Add(logGroup, 0, 6);

        var buttonRow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            FlowDirection = FlowDirection.RightToLeft,
            WrapContents = false,
            Margin = new Padding(0)
        };
        _convertButton.AutoSize = true;
        _convertButton.Text = "XXL in PGM konvertieren";
        _convertButton.Font = new Font(Font, FontStyle.Bold);
        _convertButton.Padding = new Padding(8, 3, 8, 3);
        _convertButton.Enabled = false;
        _convertButton.Click += async (_, _) => await StartConversionAsync();
        buttonRow.Controls.Add(_convertButton);

        _cancelButton.AutoSize = true;
        _cancelButton.Text = "Abbrechen";
        _cancelButton.Padding = new Padding(6, 3, 6, 3);
        _cancelButton.Enabled = false;
        _cancelButton.Click += (_, _) => _conversionCancellation?.Cancel();
        buttonRow.Controls.Add(_cancelButton);

        _openOutputButton.AutoSize = true;
        _openOutputButton.Text = "Zielordner öffnen";
        _openOutputButton.Padding = new Padding(6, 3, 6, 3);
        _openOutputButton.Click += (_, _) => OpenOutputDirectory();
        buttonRow.Controls.Add(_openOutputButton);
        root.Controls.Add(buttonRow, 0, 7);

        Controls.Add(root);
        AcceptButton = _convertButton;
    }

    private static Control CreatePathRow(
        string label,
        TextBox textBox,
        string buttonText,
        Action selectAction)
    {
        var table = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            ColumnCount = 3,
            RowCount = 1,
            Margin = new Padding(0)
        };
        table.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 116));
        table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        table.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        table.Controls.Add(CreateFieldLabel(label), 0, 0);
        textBox.Dock = DockStyle.Fill;
        textBox.ReadOnly = true;
        textBox.Margin = new Padding(0, 3, 8, 3);
        table.Controls.Add(textBox, 1, 0);
        var button = new Button { AutoSize = true, Text = buttonText };
        button.Click += (_, _) => selectAction();
        table.Controls.Add(button, 2, 0);
        return table;
    }

    private static Label CreateFieldLabel(string text) => new()
    {
        AutoSize = true,
        Text = text,
        Margin = new Padding(0, 7, 8, 0)
    };

    private void ApplySettings(AppSettings settings)
    {
        _outputTextBox.Text = settings.OutputDirectory;
        _overwriteCheckBox.Checked = settings.OverwriteExisting;
        var selectedMode = _exportModeComboBox.Items
            .Cast<ExportModeOption>()
            .FirstOrDefault(option => option.Mode == settings.ExportMode);
        _exportModeComboBox.SelectedItem = selectedMode;
        if (_exportModeComboBox.SelectedIndex < 0)
        {
            _exportModeComboBox.SelectedIndex = 0;
        }
    }

    private void SelectArchiveFromDialog()
    {
        using var dialog = new OpenFileDialog
        {
            Title = "Frontend-ZIP mit XXL-Dateien auswählen",
            Filter = "ZIP-Archive (*.zip)|*.zip|Alle Dateien (*.*)|*.*",
            CheckFileExists = true,
            Multiselect = false
        };
        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            SelectArchive(dialog.FileName);
        }
    }

    private void SelectArchive(string archivePath)
    {
        if (_busy)
        {
            return;
        }

        if (!File.Exists(archivePath)
            || !string.Equals(Path.GetExtension(archivePath), ".zip", StringComparison.OrdinalIgnoreCase))
        {
            MessageBox.Show(
                this,
                "Bitte eine vorhandene ZIP-Datei auswählen.",
                Text,
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            return;
        }

        _archiveTextBox.Text = Path.GetFullPath(archivePath);
        _statusLabel.Text = "ZIP ausgewählt. Bereit zur Konvertierung.";
        AppendLog($"Ausgewählt: {_archiveTextBox.Text}");
        UpdateConvertButtonState();
    }

    private void SelectOutputDirectory()
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Zielordner für die PGM-Programme auswählen",
            UseDescriptionForTitle = true,
            ShowNewFolderButton = true,
            SelectedPath = Directory.Exists(_outputTextBox.Text)
                ? _outputTextBox.Text
                : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)
        };
        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            _outputTextBox.Text = dialog.SelectedPath;
            SaveSettings();
        }
    }

    private async Task StartConversionAsync()
    {
        if (_busy)
        {
            return;
        }

        var exportMode = (_exportModeComboBox.SelectedItem as ExportModeOption)?.Mode
            ?? ExportMode.Files;
        string outputDirectory;
        try
        {
            outputDirectory = _settingsStore.ResolveOutputPath(_outputTextBox.Text.Trim());
        }
        catch (Exception exception) when (exception is ArgumentException
            or NotSupportedException
            or PathTooLongException)
        {
            MessageBox.Show(
                this,
                $"Der Zielordner ist ungültig: {exception.Message}",
                Text,
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            return;
        }

        var request = new ConversionRequest(
            _archiveTextBox.Text.Trim(),
            outputDirectory,
            exportMode,
            _overwriteCheckBox.Checked);

        SaveSettings();
        _logTextBox.Clear();
        AppendLog($"Eingabe: {request.InputArchive}");
        AppendLog($"Ziel: {request.OutputDirectory}");
        AppendLog($"Ausgabe: {GetExportModeLabel(exportMode)}");
        SetBusy(true);
        _progressBar.Value = 0;
        _conversionCancellation = new CancellationTokenSource();

        var progress = new Progress<ConversionProgress>(update =>
        {
            _progressBar.Maximum = Math.Max(1, update.Total);
            _progressBar.Value = Math.Clamp(update.Current, 0, _progressBar.Maximum);
            _statusLabel.Text = update.Message;
            if (update.Current > 0)
            {
                AppendLog($"[{update.Current}/{update.Total}] {update.Message}");
            }
        });

        try
        {
            var result = await _converter.ConvertAsync(
                request,
                progress,
                _conversionCancellation.Token);
            _progressBar.Maximum = Math.Max(1, result.ProgramCount);
            _progressBar.Value = _progressBar.Maximum;
            _statusLabel.Text = $"Fertig: {result.ProgramCount} PGM-Programme wurden erzeugt.";
            AppendLog($"Erfolgreich abgeschlossen: {result.ProgramCount} Programme.");
            foreach (var path in result.WrittenFiles)
            {
                AppendLog($"Ausgabe: {path}");
            }

            MessageBox.Show(
                this,
                $"{result.ProgramCount} XXL-Dateien wurden erfolgreich in PGM umgewandelt.",
                "Konvertierung abgeschlossen",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
        catch (OperationCanceledException)
        {
            _statusLabel.Text = "Konvertierung abgebrochen.";
            AppendLog("Die Konvertierung wurde abgebrochen.");
        }
        catch (XisoConversionException exception)
        {
            _statusLabel.Text = "Konvertierung fehlgeschlagen.";
            AppendLog($"FEHLER: {exception.Message}");
            MessageBox.Show(
                this,
                exception.Message,
                "Xilog-Konvertierung fehlgeschlagen",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        catch (Exception exception)
        {
            _statusLabel.Text = "Unerwarteter Fehler.";
            AppendLog($"FEHLER: {exception}");
            MessageBox.Show(
                this,
                $"Die Konvertierung ist unerwartet fehlgeschlagen: {exception.Message}",
                "Xilog-Konvertierung fehlgeschlagen",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        finally
        {
            _conversionCancellation.Dispose();
            _conversionCancellation = null;
            SetBusy(false);
        }
    }

    private void ValidateXisoInstallation()
    {
        try
        {
            var checksum = _converter.ValidateInstallation();
            _xisoReady = true;
            _toolStatusLabel.Text = $"xISO bereit · portable .env · SHA-256 {checksum[..12]}…";
            _toolStatusLabel.ForeColor = Color.DarkGreen;
            AppendLog($"Konfiguration: {_configuration.EnvironmentPath}");
            AppendLog($"xISO: {_configuration.XisoPath}");
            UpdateConvertButtonState();
        }
        catch (XisoConversionException exception)
        {
            _xisoReady = false;
            _toolStatusLabel.Text = $"xISO nicht bereit · {exception.Message}";
            _toolStatusLabel.ForeColor = Color.DarkRed;
            _convertButton.Enabled = false;
            AppendLog($"FEHLER: {exception.Message}");
            UpdateConvertButtonState();
        }
    }

    private void HandleDragEnter(object? sender, DragEventArgs eventArgs)
    {
        if (_busy || !TryGetDroppedArchive(eventArgs.Data, out _))
        {
            eventArgs.Effect = DragDropEffects.None;
            return;
        }

        eventArgs.Effect = DragDropEffects.Copy;
        _dropPanel.BackColor = Color.FromArgb(224, 240, 255);
    }

    private void HandleDragDrop(object? sender, DragEventArgs eventArgs)
    {
        _dropPanel.BackColor = Color.FromArgb(245, 248, 252);
        if (!_busy && TryGetDroppedArchive(eventArgs.Data, out var archive))
        {
            SelectArchive(archive);
        }
    }

    private void HandleDragLeave(object? sender, EventArgs eventArgs)
    {
        _dropPanel.BackColor = Color.FromArgb(245, 248, 252);
    }

    private static bool TryGetDroppedArchive(IDataObject? data, out string archive)
    {
        archive = string.Empty;
        if (data?.GetData(DataFormats.FileDrop) is not string[] { Length: 1 } files)
        {
            return false;
        }

        archive = files[0];
        return File.Exists(archive)
            && string.Equals(Path.GetExtension(archive), ".zip", StringComparison.OrdinalIgnoreCase);
    }

    private void SetBusy(bool busy)
    {
        _busy = busy;
        _archiveTextBox.Enabled = !busy;
        _outputTextBox.Enabled = !busy;
        _exportModeComboBox.Enabled = !busy;
        _overwriteCheckBox.Enabled = !busy;
        _cancelButton.Enabled = busy;
        _openOutputButton.Enabled = !busy;
        UseWaitCursor = busy;
        UpdateConvertButtonState();
    }

    private void UpdateConvertButtonState()
    {
        _convertButton.Enabled = !_busy
            && _xisoReady
            && File.Exists(_archiveTextBox.Text)
            && string.Equals(Path.GetExtension(_archiveTextBox.Text), ".zip", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(_outputTextBox.Text);
    }

    private void OpenOutputDirectory()
    {
        var path = _outputTextBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            Directory.CreateDirectory(path);
            Process.Start(new ProcessStartInfo
            {
                FileName = path,
                UseShellExecute = true
            });
        }
        catch (Exception exception) when (exception is IOException
            or UnauthorizedAccessException
            or System.ComponentModel.Win32Exception)
        {
            MessageBox.Show(this, exception.Message, "Zielordner konnte nicht geöffnet werden", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private void SaveSettings()
    {
        try
        {
            _settingsStore.Save(new AppSettings
            {
                OutputDirectory = _outputTextBox.Text.Trim(),
                ExportMode = (_exportModeComboBox.SelectedItem as ExportModeOption)?.Mode ?? ExportMode.Files,
                OverwriteExisting = _overwriteCheckBox.Checked
            });
        }
        catch (Exception exception) when (exception is IOException
            or UnauthorizedAccessException
            or InvalidOperationException
            or ArgumentException
            or NotSupportedException)
        {
            AppendLog($"Hinweis: Einstellungen konnten nicht gespeichert werden: {exception.Message}");
        }
    }

    private void HandleFormClosing(object? sender, FormClosingEventArgs eventArgs)
    {
        if (_busy)
        {
            eventArgs.Cancel = true;
            _conversionCancellation?.Cancel();
            _statusLabel.Text = "Konvertierung wird abgebrochen …";
            return;
        }

        SaveSettings();
    }

    private void AppendLog(string message)
    {
        _logTextBox.AppendText($"{DateTime.Now:HH:mm:ss}  {message}{Environment.NewLine}");
    }

    private static string GetExportModeLabel(ExportMode mode) => mode switch
    {
        ExportMode.Zip => "PGM-ZIP",
        ExportMode.FilesAndZip => "einzelne PGM-Dateien und PGM-ZIP",
        _ => "einzelne PGM-Dateien"
    };

    private sealed record ExportModeOption(ExportMode Mode, string Label)
    {
        public override string ToString() => Label;
    }
}

