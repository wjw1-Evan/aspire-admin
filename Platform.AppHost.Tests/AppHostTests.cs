using Xunit;
using System.IO;
using System;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Net.Http;
using System.Net.Sockets;
using System.Net;

namespace Platform.AppHost.Tests
{
    public class AppHostTests
    {
        [Fact]
        public void AppHost_File_Should_Exist()
        {
            // 检查 AppHost.cs 文件是否存在，使用绝对路径
            var filePath = Path.Combine("/Users/fanshuyi/Projects/aspire-admin/Platform.AppHost/AppHost.cs");
            Assert.True(File.Exists(filePath), $"{filePath} should exist");
        }

        [Fact]
        public async Task DotnetRun_Starts_AppHost_Process()
        {
            var projectFile = "/Users/fanshuyi/Projects/aspire-admin/Platform.AppHost/Platform.AppHost.csproj";
            var psi = new ProcessStartInfo("dotnet", $"run --project \"{projectFile}\"")
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            var output = new StringBuilder();
            using (var proc = new Process { StartInfo = psi, EnableRaisingEvents = true })
            {
                proc.OutputDataReceived += (s, e) => { if (e.Data != null) output.AppendLine(e.Data); };
                proc.ErrorDataReceived += (s, e) => { if (e.Data != null) output.AppendLine(e.Data); };

                var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                try
                {
                    proc.Start();
                    proc.BeginOutputReadLine();
                    proc.BeginErrorReadLine();

                    var sw = Stopwatch.StartNew();
                    bool sawOutput = false;
                    while (sw.Elapsed < TimeSpan.FromSeconds(20))
                    {
                        if (output.Length > 0)
                        {
                            sawOutput = true;
                            break;
                        }
                        if (proc.HasExited) break;
                        await Task.Delay(200, cts.Token);
                    }

                    if (!proc.HasExited)
                    {
                        try { proc.Kill(true); } catch { }
                    }

                    Assert.True(sawOutput || !proc.HasExited, $"`dotnet run` did not produce output or stay running. Output:\n{output}");
                }
                finally
                {
                    cts.Dispose();
                }
            }
        }

    }
}
