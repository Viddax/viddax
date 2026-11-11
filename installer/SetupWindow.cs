using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

internal sealed class SetupWindow : Form
{
    private static readonly Color Background = Color.Black;
    private static readonly Color Surface = Color.FromArgb(17, 17, 17);
    private static readonly Color Line = Color.FromArgb(43, 43, 43);
    private static readonly Color Muted = Color.FromArgb(166, 166, 166);
    private const int WindowWidth = 700;
    private const int InstallHeight = 464;
    private const int UninstallHeight = 376;

    private readonly bool uninstall;
    private readonly bool existing;
    private readonly string engine;
    private readonly string version;
    private readonly string defaultDirectory;
    private string directory;
    private bool allUsers;
    private bool busy;
    private bool succeeded;
    private readonly Stopwatch progressClock = new Stopwatch();
    private System.Windows.Forms.Timer fade;
    private bool closing;
    private readonly Label heading;
    private readonly Label description;
    private readonly TextBox location;
    private readonly Label locationLabel;
    private readonly Button browse;
    private readonly CheckBox scope;
    private readonly Button action;
    private readonly Button close;
    private readonly Panel progress;
    private readonly Label progressStatus;
    private readonly Label progressElapsed;
    private readonly System.Windows.Forms.Timer timer;
    private readonly Bitmap wordmark;

    [STAThread]
    private static void Main(string[] args)
    {
        if (args.Length != 6 || (args[0] != "install" && args[0] != "uninstall"))
        {
            Environment.ExitCode = 1;
            return;
        }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        using (var window = new SetupWindow(args))
            Application.Run(window);
    }

    private SetupWindow(string[] args)
    {
        uninstall = args[0] == "uninstall";
        engine = args[1];
        defaultDirectory = directory = args[2];
        version = args[3];
        existing = args[4] != "0";
        allUsers = args[5] == "all";

        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ViddaxWordmark"))
        using (Image image = Image.FromStream(stream))
            wordmark = new Bitmap(image);

        Text = uninstall ? "Viddax Uninstall" : "Viddax Setup";
        Icon = Icon.ExtractAssociatedIcon(engine);
        Font = new Font("Segoe UI", 10f);
        AutoScaleMode = AutoScaleMode.Dpi;
        AutoScaleDimensions = new SizeF(96f, 96f);
        BackColor = Background;
        ForeColor = Color.White;
        FormBorderStyle = FormBorderStyle.None;
        ClientSize = new Size(WindowWidth, uninstall ? UninstallHeight : InstallHeight);
        StartPosition = FormStartPosition.CenterScreen;
        DoubleBuffered = true;
        KeyPreview = true;

        close = AddButton("", 642, 18, 40, 40, false, closeIcon: true);
        close.AccessibleName = "Close";
        close.Click += delegate { Dismiss(); };
        CancelButton = close;

        heading = AddLabel(uninstall ? "Uninstall Viddax" : "", 64, 147, 572, 42, 19, FontStyle.Bold, Color.White);
        heading.TextAlign = ContentAlignment.MiddleCenter;
        description = AddLabel(uninstall ? "Remove the app and its shortcuts from this PC?" : "",
            94, uninstall ? 209 : 352, uninstall ? 512 : 290, 54, 11, FontStyle.Regular, Muted);
        description.TextAlign = uninstall ? ContentAlignment.TopCenter : ContentAlignment.MiddleLeft;

        locationLabel = AddLabel("Install location", 94, 175, 240, 24, 10, FontStyle.Bold, Muted);
        locationLabel.Visible = !uninstall;
        location = new TextBox {
            Text = directory,
            AccessibleName = "Install location",
            Location = new Point(113, 224),
            Size = new Size(existing ? 474 : 358, 24),
            Font = new Font("Segoe UI", 12f),
            BorderStyle = BorderStyle.None,
            BackColor = Surface,
            ForeColor = Color.White,
            ReadOnly = existing,
            Visible = !uninstall,
        };
        location.GotFocus += delegate { Invalidate(); };
        location.LostFocus += delegate { Invalidate(); };
        Controls.Add(location);
        browse = AddButton("Browse…", 480, 211, 116, 48, false);
        browse.BackColor = Surface;
        browse.Visible = !uninstall && !existing;
        browse.Click += Browse;
        scope = new ScopeCheckBox {
            Text = "Install for all users",
            Location = new Point(94, 279),
            Size = new Size(512, 52),
            Font = new Font("Segoe UI", 11f),
            ForeColor = Color.White,
            Cursor = Cursors.Hand,
            Checked = allUsers,
            Visible = !uninstall && !existing,
        };
        scope.CheckedChanged += delegate {
            allUsers = scope.Checked;
            string programFiles = Environment.GetEnvironmentVariable("ProgramW6432")
                ?? Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            SetDirectory(allUsers ? Path.Combine(programFiles, "Viddax") : defaultDirectory);
        };
        Controls.Add(scope);

        action = AddButton(uninstall ? "Uninstall" : "Install", uninstall ? 256 : 418, uninstall ? 266 : 352, 188, 54, true);
        action.Click += RunAction;
        AcceptButton = action;
        progressStatus = AddLabel("", 94, 207, 392, 28, 11, FontStyle.Regular, Color.White);
        progressElapsed = AddLabel("", 486, 207, 120, 28, 10, FontStyle.Regular, Muted);
        progressElapsed.TextAlign = ContentAlignment.MiddleRight;
        progress = new ProgressTrack {
            Location = new Point(94, 247), Size = new Size(512, 10),
            AccessibleName = "Setup progress",
        };
        progress.Paint += PaintProgress;
        Controls.Add(progress);
        progress.Visible = progressStatus.Visible = progressElapsed.Visible = false;
        timer = new System.Windows.Forms.Timer { Interval = 16 };
        timer.Tick += delegate {
            UpdateElapsed();
            progress.Invalidate();
        };

        MouseDown += DragWindow;
        FormClosing += delegate(object sender, FormClosingEventArgs e) { if (busy) e.Cancel = true; };
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        if (!SystemInformation.IsMenuAnimationEnabled) return;
        Opacity = 0.12;
        FadeTo(1, 240, delegate { });
    }

    private void Dismiss()
    {
        if (busy || closing) return;
        if (!SystemInformation.IsMenuAnimationEnabled)
        {
            Close();
            return;
        }
        closing = true;
        action.Enabled = close.Enabled = browse.Enabled = scope.Enabled = location.Enabled = false;
        FadeTo(0, 160, Close);
    }

    private void FadeTo(double target, int duration, Action complete)
    {
        if (fade != null) fade.Dispose();
        double initial = Opacity;
        var clock = Stopwatch.StartNew();
        fade = new System.Windows.Forms.Timer { Interval = 15 };
        fade.Tick += delegate {
            double elapsed = Math.Min(1, clock.Elapsed.TotalMilliseconds / duration);
            double eased = target > initial ? 1 - Math.Pow(1 - elapsed, 3) : elapsed * elapsed;
            Opacity = initial + (target - initial) * eased;
            if (elapsed < 1) return;
            fade.Stop();
            complete();
        };
        fade.Start();
    }

    private Label AddLabel(string text, int x, int y, int width, int height, float size, FontStyle weight, Color color)
    {
        var label = new Label {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(width, height),
            Font = new Font("Segoe UI", size, weight),
            ForeColor = color,
            UseMnemonic = false,
        };
        Controls.Add(label);
        return label;
    }

    private Button AddButton(string text, int x, int y, int width, int height, bool primary, bool closeIcon = false)
    {
        var button = new PillButton(primary, closeIcon) {
            Text = text,
            Location = new Point(x, y),
            Size = new Size(width, height),
            FlatStyle = FlatStyle.Flat,
            BackColor = Background,
            ForeColor = primary ? Background : Color.White,
            Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 10f, FontStyle.Bold),
            UseVisualStyleBackColor = false,
        };
        Controls.Add(button);
        return button;
    }

    private void SetDirectory(string path)
    {
        directory = path;
        location.Text = path;
    }

    private void Browse(object sender, EventArgs e)
    {
        using (var dialog = new FolderBrowserDialog())
        {
            dialog.Description = "Choose a folder for Viddax";
            dialog.SelectedPath = directory;
            if (dialog.ShowDialog(this) != DialogResult.OK) return;
            string selected = dialog.SelectedPath.TrimEnd(Path.DirectorySeparatorChar);
            SetDirectory(string.Equals(Path.GetFileName(selected), "Viddax", StringComparison.OrdinalIgnoreCase)
                ? selected : Path.Combine(dialog.SelectedPath, "Viddax"));
        }
    }

    private async void RunAction(object sender, EventArgs e)
    {
        if (busy) return;
        if (succeeded)
        {
            if (!uninstall)
            {
                try { Process.Start(Path.Combine(directory, "Viddax.exe")); }
                catch { description.Text = "Open Viddax from the Start menu."; return; }
            }
            Dismiss();
            return;
        }

        if (!uninstall && !existing)
        {
            try
            {
                string path = location.Text.Trim();
                if (!Path.IsPathRooted(path) || path.Length < 3 || path[1] != ':' || path[2] != '\\'
                    || path.IndexOfAny(Path.GetInvalidPathChars()) >= 0)
                    throw new ArgumentException();
                string destination = Path.GetFullPath(path).TrimEnd('\\');
                if (destination.Length < 3) throw new ArgumentException();
                SetDirectory(destination);
            }
            catch (Exception error)
            {
                if (!(error is ArgumentException || error is NotSupportedException || error is PathTooLongException)) throw;
                description.Text = "Enter a full folder path on a local drive.";
                location.Focus();
                return;
            }
        }
        string failure = null;
        BeginProgress();
        try { await Task.Run((Action)RunEngine); }
        catch (Exception error) { failure = error.Message; }
        finally
        {
            timer.Stop();
            progressClock.Stop();
            busy = false;
            action.Enabled = browse.Enabled = scope.Enabled = close.Enabled = location.Enabled = true;
        }

        if (failure != null)
        {
            ShowSetupControls();
            heading.Text = uninstall ? "Uninstall Viddax" : "";
            description.Text = failure;
            action.Text = "Try again";
            return;
        }

        succeeded = true;
        heading.Text = uninstall ? "Viddax removed" : "Viddax is ready";
        progressStatus.Text = uninstall ? "Uninstall complete" : "Installation complete";
        UpdateElapsed();
        progress.Invalidate();
        action.Text = uninstall ? "Done" : "Open Viddax";
        action.Left = (ClientSize.Width - action.Width) / 2;
        action.Visible = true;
        action.Focus();
    }

    private void BeginProgress()
    {
        busy = true;
        action.Visible = locationLabel.Visible = location.Visible = browse.Visible = scope.Visible = false;
        close.Enabled = false;
        heading.Text = uninstall ? "Uninstalling Viddax" : "Installing Viddax";
        description.Text = "";
        progressStatus.Text = uninstall ? "Removing app files and shortcuts…" : "Setting up app files…";
        progress.Visible = progressStatus.Visible = progressElapsed.Visible = true;
        progressClock.Restart();
        UpdateElapsed();
        timer.Interval = SystemInformation.IsMenuAnimationEnabled ? 16 : 250;
        timer.Start();
        Invalidate();
    }

    private void ShowSetupControls()
    {
        progress.Visible = progressStatus.Visible = progressElapsed.Visible = false;
        action.Visible = true;
        locationLabel.Visible = location.Visible = !uninstall;
        browse.Visible = scope.Visible = !uninstall && !existing;
        Invalidate();
    }

    private void UpdateElapsed()
    {
        TimeSpan elapsed = progressClock.Elapsed;
        string value = string.Format("{0:00}:{1:00} elapsed", (int)elapsed.TotalMinutes, elapsed.Seconds);
        if (progressElapsed.Text != value) progressElapsed.Text = value;
    }

    private void RunEngine()
    {
        string app = Path.Combine(directory, "Viddax.exe");
        if (!uninstall && !existing && Directory.Exists(directory))
        {
            using (var files = Directory.EnumerateFileSystemEntries(directory).GetEnumerator())
                if (files.MoveNext()) throw new IOException("Choose an empty Viddax folder to continue.");
        }

        string arguments = "/S " + (allUsers ? "/allusers" : "/currentuser");
        if (!uninstall) arguments += " /D=" + directory;
        var start = new ProcessStartInfo(engine, arguments) {
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetTempPath(),
        };
        using (Process child = Process.Start(start))
        {
            child.WaitForExit();
            if (child.ExitCode != 0) throw new IOException("Windows setup returned error " + child.ExitCode + ".");
        }

        if (uninstall)
        {
            // NSIS can relaunch from a temporary copy to delete the installed uninstaller.
            for (int attempt = 0; attempt < 150 && File.Exists(app); attempt++) Thread.Sleep(200);
            if (File.Exists(app)) throw new IOException("Close Viddax and try uninstalling again.");
        }
        else if (!File.Exists(app) || FileVersionInfo.GetVersionInfo(app).ProductVersion != version + ".0")
        {
            throw new IOException("Viddax setup did not finish. Check the install location and try again.");
        }
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        float scale = ClientSize.Width / (float)WindowWidth;
        int height = (int)Math.Round(ClientSize.Height / scale);
        e.Graphics.ScaleTransform(scale, scale);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
        using (var outline = new Pen(Line))
        using (var frame = RoundedRectangle(new Rectangle(1, 1, WindowWidth - 2, height - 2), 23))
        {
            e.Graphics.DrawPath(outline, frame);
            if (!uninstall && !busy && !succeeded)
            {
                using (var field = Pill(new Rectangle(94, 205, 512, 60)))
                using (var fill = new SolidBrush(Surface))
                using (var fieldBorder = new Pen(location.Focused ? Muted : Line))
                {
                    e.Graphics.FillPath(fill, field);
                    e.Graphics.DrawPath(fieldBorder, field);
                }
            }
            int width = 238;
            int wordmarkHeight = width * wordmark.Height / wordmark.Width;
            e.Graphics.DrawImage(wordmark, new Rectangle((WindowWidth - width) / 2, 67, width, wordmarkHeight));
        }
    }

    protected override void OnSizeChanged(EventArgs e)
    {
        base.OnSizeChanged(e);
        if (ClientSize.Width == 0 || ClientSize.Height == 0) return;
        int radius = (int)Math.Round(24f * ClientSize.Width / WindowWidth);
        using (var shape = RoundedRectangle(ClientRectangle, radius))
        {
            Region previous = Region;
            Region = new Region(shape);
            if (previous != null) previous.Dispose();
        }
    }

    private static GraphicsPath RoundedRectangle(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        int size = Math.Max(1, Math.Min(radius * 2, Math.Min(bounds.Width, bounds.Height)));
        path.AddArc(bounds.Left, bounds.Top, size, size, 180, 90);
        path.AddArc(bounds.Right - size, bounds.Top, size, size, 270, 90);
        path.AddArc(bounds.Right - size, bounds.Bottom - size, size, size, 0, 90);
        path.AddArc(bounds.Left, bounds.Bottom - size, size, size, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static GraphicsPath Pill(Rectangle bounds)
    {
        var path = new GraphicsPath();
        int size = bounds.Height;
        path.AddArc(bounds.Left, bounds.Top, size, size, 90, 180);
        path.AddArc(bounds.Right - size, bounds.Top, size, size, 270, 180);
        path.CloseFigure();
        return path;
    }

    private sealed class ScopeCheckBox : CheckBox
    {
        private readonly System.Windows.Forms.Timer transition;
        private readonly Stopwatch clock = new Stopwatch();
        private double amount;
        private double from;
        private bool hovered;

        internal ScopeCheckBox()
        {
            SetStyle(ControlStyles.OptimizedDoubleBuffer, true);
            transition = new System.Windows.Forms.Timer { Interval = 15 };
            transition.Tick += delegate {
                double elapsed = Math.Min(1, clock.Elapsed.TotalMilliseconds / 180);
                double eased = 1 - Math.Pow(1 - elapsed, 3);
                amount = from + ((Checked ? 1 : 0) - from) * eased;
                if (elapsed == 1) transition.Stop();
                Invalidate();
            };
        }

        protected override void OnCheckedChanged(EventArgs e)
        {
            base.OnCheckedChanged(e);
            transition.Stop();
            if (Visible && IsHandleCreated && SystemInformation.IsMenuAnimationEnabled)
            {
                from = amount;
                clock.Restart();
                transition.Start();
            }
            else
            {
                amount = Checked ? 1 : 0;
                Invalidate();
            }
        }

        protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); hovered = true; Invalidate(); }
        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); hovered = false; Invalidate(); }
        protected override void OnGotFocus(EventArgs e) { base.OnGotFocus(e); Invalidate(); }
        protected override void OnLostFocus(EventArgs e) { base.OnLostFocus(e); Invalidate(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.Clear(Background);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            float scale = Height / 52f;
            int inset = (int)Math.Round(18 * scale);
            int side = (int)Math.Round(22 * scale);
            var indicator = new Rectangle(Width - inset - side, (Height - side) / 2, side, side);
            int shade = (int)Math.Round(28 + 221 * amount);

            using (var row = RoundedRectangle(new Rectangle(1, 1, Width - 3, Height - 3), (int)Math.Round(16 * scale)))
            using (var rowFill = new SolidBrush(hovered && Enabled ? Color.FromArgb(25, 25, 25) : Surface))
            using (var rowBorder = new Pen(Focused && ShowFocusCues ? Muted : Line))
            using (var box = RoundedRectangle(indicator, (int)Math.Round(6 * scale)))
            using (var boxFill = new SolidBrush(Color.FromArgb(shade, shade, shade)))
            using (var boxBorder = new Pen(Color.FromArgb(Math.Max(120, shade), Math.Max(120, shade), Math.Max(120, shade))))
            {
                e.Graphics.FillPath(rowFill, row);
                e.Graphics.DrawPath(rowBorder, row);
                e.Graphics.FillPath(boxFill, box);
                e.Graphics.DrawPath(boxBorder, box);
            }

            var label = new Rectangle(inset, 0, indicator.Left - inset * 2, Height);
            TextRenderer.DrawText(e.Graphics, Text, Font, label, Enabled ? ForeColor : Muted,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);

            double mark = Math.Max(0, (amount - 0.3) / 0.7);
            if (mark == 0) return;
            var start = new PointF(indicator.X + side * 0.26f, indicator.Y + side * 0.52f);
            var elbow = new PointF(indicator.X + side * 0.43f, indicator.Y + side * 0.69f);
            var end = new PointF(indicator.X + side * 0.75f, indicator.Y + side * 0.35f);
            using (var stroke = new Pen(Background, 2.2f * scale))
            {
                stroke.StartCap = stroke.EndCap = LineCap.Round;
                DrawCheckSegment(e.Graphics, stroke, start, elbow, Math.Min(1, mark * 2.5));
                if (mark > 0.4) DrawCheckSegment(e.Graphics, stroke, elbow, end, (mark - 0.4) / 0.6);
            }
        }

        private static void DrawCheckSegment(Graphics graphics, Pen stroke, PointF start, PointF end, double fraction)
        {
            graphics.DrawLine(stroke, start, new PointF(
                start.X + (end.X - start.X) * (float)fraction,
                start.Y + (end.Y - start.Y) * (float)fraction));
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) transition.Dispose();
            base.Dispose(disposing);
        }
    }

    private sealed class PillButton : Button
    {
        private readonly bool primary;
        private readonly bool closeIcon;
        private bool hovered;

        internal PillButton(bool primary, bool closeIcon)
        {
            this.primary = primary;
            this.closeIcon = closeIcon;
            SetStyle(ControlStyles.OptimizedDoubleBuffer, true);
        }

        protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); hovered = true; Invalidate(); }
        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); hovered = false; Invalidate(); }
        protected override void OnGotFocus(EventArgs e) { base.OnGotFocus(e); Invalidate(); }
        protected override void OnLostFocus(EventArgs e) { base.OnLostFocus(e); Invalidate(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.Clear(BackColor);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            var bounds = new Rectangle(1, 1, Width - 3, Height - 3);
            using (var shape = Pill(bounds))
            using (var fill = new SolidBrush(primary ? (Enabled && !hovered ? Color.White : Muted)
                : (Enabled && hovered ? Line : Surface)))
            using (var border = new Pen(Focused && ShowFocusCues ? Muted : Line))
            {
                e.Graphics.FillPath(fill, shape);
                if (!primary || (Focused && ShowFocusCues)) e.Graphics.DrawPath(border, shape);
            }
            Color ink = Enabled ? ForeColor : (primary ? Background : Muted);
            if (closeIcon)
            {
                float centerX = bounds.Left + bounds.Width / 2f;
                float centerY = bounds.Top + bounds.Height / 2f;
                float radius = bounds.Height * 0.14f;
                using (var stroke = new Pen(ink, bounds.Height * 0.05f))
                {
                    stroke.StartCap = stroke.EndCap = LineCap.Round;
                    e.Graphics.DrawLine(stroke, centerX - radius, centerY - radius, centerX + radius, centerY + radius);
                    e.Graphics.DrawLine(stroke, centerX - radius, centerY + radius, centerX + radius, centerY - radius);
                }
                return;
            }
            TextRenderer.DrawText(e.Graphics, Text, Font, ClientRectangle, ink, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    private sealed class ProgressTrack : Panel
    {
        internal ProgressTrack() { DoubleBuffered = true; }
    }

    private void PaintProgress(object sender, PaintEventArgs e)
    {
        e.Graphics.Clear(Background);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        int width = progress.Width - 1;
        using (var track = Pill(new Rectangle(0, 0, width, progress.Height - 1)))
        using (var trackFill = new SolidBrush(Color.FromArgb(35, 35, 35)))
        using (var completeFill = new SolidBrush(Color.White))
        {
            e.Graphics.FillPath(succeeded ? completeFill : trackFill, track);
            if (succeeded) return;
            int segment = width / 3;
            double cycle = progressClock.Elapsed.TotalMilliseconds % 1500 / 1500;
            int position = SystemInformation.IsMenuAnimationEnabled
                ? (int)((width + segment) * cycle) - segment
                : (width - segment) / 2;
            var sweep = new Rectangle(position, 0, segment, progress.Height);
            e.Graphics.SetClip(track);
            using (var light = new LinearGradientBrush(sweep, Color.FromArgb(35, 35, 35), Color.White, LinearGradientMode.Horizontal))
            {
                light.SetSigmaBellShape(0.55f);
                e.Graphics.FillRectangle(light, sweep);
            }
        }
    }

    private void DragWindow(object sender, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left) return;
        ReleaseCapture();
        SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero);
    }

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr window, int message, IntPtr wParam, IntPtr lParam);

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            if (timer != null) timer.Dispose();
            if (fade != null) fade.Dispose();
            if (wordmark != null) wordmark.Dispose();
        }
        base.Dispose(disposing);
    }
}
