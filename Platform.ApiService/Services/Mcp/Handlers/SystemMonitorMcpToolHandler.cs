using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Globalization;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class SystemMonitorMcpToolHandler : McpToolHandlerBase
{
    private readonly ILogger<SystemMonitorMcpToolHandler> _logger;

    private static DateTime _lastCpuSampleTime = DateTime.MinValue;
    private static TimeSpan _lastCpuTotalProcessorTime = TimeSpan.Zero;
    private static double _lastCpuUsagePercent = 0;
    private static readonly object _cpuLock = new object();

    public SystemMonitorMcpToolHandler(ILogger<SystemMonitorMcpToolHandler> logger)
    {
        _logger = logger;

        RegisterTool("get_system_status", "获取服务器系统状态，包含 CPU 使用率、内存占用和磁盘使用情况。关键词：系统状态,CPU,内存,磁盘,服务器状态,系统监控",
            HandleGetSystemStatusAsync);

        RegisterTool("get_system_info", "获取服务器基本信息，包括操作系统、处理器数量、框架版本等。关键词：系统信息,服务器信息,环境信息",
            HandleGetSystemInfoAsync);
    }

    private async Task<object?> HandleGetSystemStatusAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        await Task.CompletedTask;
        try
        {
            var process = Process.GetCurrentProcess();
            var cpuInfo = GetCpuInfo(process);
            var memoryInfo = GetMemoryInfo(process);
            var diskInfo = GetDiskInfo();

            return new
            {
                cpu = cpuInfo,
                memory = memoryInfo,
                disk = diskInfo,
                processName = process.ProcessName,
                processId = process.Id,
                timestamp = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取系统监控状态失败");
            return new { error = $"获取系统状态失败: {ex.Message}" };
        }
    }

    private async Task<object?> HandleGetSystemInfoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        await Task.CompletedTask;
        try
        {
            return new
            {
                machineName = Environment.MachineName,
                processorCount = Environment.ProcessorCount,
                osVersion = Environment.OSVersion.ToString(),
                frameworkVersion = Environment.Version.ToString(),
                is64BitOperatingSystem = Environment.Is64BitOperatingSystem,
                is64BitProcess = Environment.Is64BitProcess,
                systemUpTimeSeconds = TimeSpan.FromMilliseconds(Environment.TickCount64).TotalSeconds,
                workingDirectory = Environment.CurrentDirectory,
                userDomainName = Environment.UserDomainName,
                userName = Environment.UserName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取系统信息失败");
            return new { error = $"获取系统信息失败: {ex.Message}" };
        }
    }

    private object GetCpuInfo(Process process)
    {
        try
        {
            var currentTime = DateTime.UtcNow;
            var currentProcessorTime = process.TotalProcessorTime;

            double processUsagePercent = 0;
            double systemUsagePercent = GetSystemCpuUsage();

            lock (_cpuLock)
            {
                if (_lastCpuSampleTime != DateTime.MinValue)
                {
                    var elapsed = currentTime - _lastCpuSampleTime;
                    var processorElapsed = currentProcessorTime - _lastCpuTotalProcessorTime;

                    if (elapsed.TotalMilliseconds >= 1000)
                    {
                        processUsagePercent = (processorElapsed.TotalMilliseconds / elapsed.TotalMilliseconds / Environment.ProcessorCount) * 100;
                        _lastCpuUsagePercent = processUsagePercent;
                        _lastCpuSampleTime = currentTime;
                        _lastCpuTotalProcessorTime = currentProcessorTime;
                    }
                    else
                    {
                        processUsagePercent = _lastCpuUsagePercent;
                    }
                }
                else
                {
                    _lastCpuSampleTime = currentTime;
                    _lastCpuTotalProcessorTime = currentProcessorTime;

                    var startTime = process.StartTime;
                    var uptime = DateTime.Now - startTime;
                    processUsagePercent = uptime.TotalMilliseconds > 0
                        ? (currentProcessorTime.TotalMilliseconds / uptime.TotalMilliseconds / Environment.ProcessorCount) * 100
                        : 0;
                    _lastCpuUsagePercent = processUsagePercent;
                }
            }

            return new
            {
                usagePercent = Math.Round(systemUsagePercent > 0 ? systemUsagePercent : processUsagePercent, 2),
                processUsagePercent = Math.Round(processUsagePercent, 2),
                processTimeSeconds = Math.Round(currentProcessorTime.TotalSeconds, 2),
                uptimeSeconds = (DateTime.Now - process.StartTime).TotalSeconds,
                unit = "%"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取 CPU 信息失败");
            return new { usagePercent = 0, processUsagePercent = 0, processTimeSeconds = 0, uptimeSeconds = 0, unit = "%" };
        }
    }

    private double GetSystemCpuUsage()
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return 0;

            var isMac = RuntimeInformation.IsOSPlatform(OSPlatform.OSX);
            var startInfo = new ProcessStartInfo
            {
                FileName = "top",
                Arguments = isMac ? "-l 1 -n 0" : "-bn1",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process != null)
            {
                var output = process.StandardOutput.ReadToEnd();
                process.WaitForExit(2000);

                if (isMac)
                {
                    var match = Regex.Match(output, @"CPU usage:\s+([\d.]+)%\s+user,\s+([\d.]+)%\s+sys", RegexOptions.IgnoreCase);
                    if (match.Success)
                    {
                        var user = double.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                        var sys = double.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
                        return user + sys;
                    }
                }
                else
                {
                    var match = Regex.Match(output, @"%Cpu\(s\):\s+([\d.]+)\s+us,\s+([\d.]+)\s+sy", RegexOptions.IgnoreCase);
                    if (match.Success)
                    {
                        var user = double.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                        var sys = double.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
                        return user + sys;
                    }
                }
            }
        }
        catch { }
        return 0;
    }

    private object GetMemoryInfo(Process process)
    {
        try
        {
            var processMemory = process.WorkingSet64;
            var systemTotalMemory = GetSystemTotalMemory();
            var systemAvailableMemory = GetSystemAvailableMemory();
            var systemUsedMemory = systemTotalMemory - systemAvailableMemory;

            return new
            {
                processMemoryMB = Math.Round(processMemory / 1024.0 / 1024.0, 2),
                totalMemoryMB = Math.Round(systemTotalMemory / 1024.0 / 1024.0, 2),
                availableMemoryMB = Math.Round(systemAvailableMemory / 1024.0 / 1024.0, 2),
                usagePercent = systemTotalMemory > 0 ? Math.Round((double)systemUsedMemory / systemTotalMemory * 100, 2) : 0,
                processUsagePercent = systemTotalMemory > 0 ? Math.Round((double)processMemory / systemTotalMemory * 100, 2) : 0,
                unit = "MB"
            };
        }
        catch
        {
            return new { processMemoryMB = 0, totalMemoryMB = 0, availableMemoryMB = 0, usagePercent = 0, processUsagePercent = 0, unit = "MB" };
        }
    }

    private long GetSystemTotalMemory()
    {
        try
        {
            if (Environment.OSVersion.Platform == PlatformID.MacOSX || Environment.OSVersion.Platform == PlatformID.Unix)
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "sysctl",
                    Arguments = "-n hw.memsize",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(startInfo);
                if (process != null)
                {
                    var output = process.StandardOutput.ReadToEnd();
                    process.WaitForExit();
                    if (process.ExitCode == 0 && long.TryParse(output.Trim(), out var memsize))
                        return memsize;
                }
            }
        }
        catch { }
        return 0;
    }

    private long GetSystemAvailableMemory()
    {
        try
        {
            if (Environment.OSVersion.Platform == PlatformID.MacOSX || Environment.OSVersion.Platform == PlatformID.Unix)
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "vm_stat",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(startInfo);
                if (process != null)
                {
                    var output = process.StandardOutput.ReadToEnd();
                    process.WaitForExit();

                    long freePages = 0, inactivePages = 0, pageSize = 0;
                    foreach (var line in output.Split('\n'))
                    {
                        if (line.StartsWith("Pages free:"))
                            long.TryParse(line.Split(':')[1].Trim().TrimEnd('.'), out freePages);
                        else if (line.StartsWith("Pages inactive:"))
                            long.TryParse(line.Split(':')[1].Trim().TrimEnd('.'), out inactivePages);
                        else if (line.Contains("page size of"))
                        {
                            var parts = line.Split(' ');
                            for (int i = 0; i < parts.Length; i++)
                            {
                                var token = parts[i].Replace("bytes)", "").Replace("bytes", "");
                                if (long.TryParse(token, out var size)) { pageSize = size; break; }
                                if (i > 0 && long.TryParse(parts[i - 1], out var size2)) { pageSize = size2; break; }
                            }
                        }
                    }

                    if (pageSize > 0) return (freePages + inactivePages) * pageSize;
                }
            }
        }
        catch { }
        return 0;
    }

    private object GetDiskInfo()
    {
        try
        {
            var rootPath = Path.GetPathRoot(Environment.CurrentDirectory) ?? "/";
            var drives = DriveInfo.GetDrives();
            var currentDrive = drives.FirstOrDefault(d => d.IsReady && (d.Name.Equals(rootPath, StringComparison.OrdinalIgnoreCase) || rootPath.StartsWith(d.Name, StringComparison.OrdinalIgnoreCase)))
                ?? drives.FirstOrDefault(d => d.IsReady && d.DriveType == DriveType.Fixed)
                ?? drives.FirstOrDefault(d => d.IsReady);

            if (currentDrive == null) throw new Exception("未找到可用的磁盘驱动器");

            return new
            {
                totalSizeGB = Math.Round(currentDrive.TotalSize / 1024.0 / 1024.0 / 1024.0, 2),
                availableSizeGB = Math.Round(currentDrive.AvailableFreeSpace / 1024.0 / 1024.0 / 1024.0, 2),
                usedSizeGB = Math.Round((currentDrive.TotalSize - currentDrive.AvailableFreeSpace) / 1024.0 / 1024.0 / 1024.0, 2),
                usagePercent = Math.Round((double)(currentDrive.TotalSize - currentDrive.AvailableFreeSpace) / currentDrive.TotalSize * 100, 2),
                driveName = currentDrive.Name,
                unit = "GB"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取磁盘信息失败");
            return new { totalSizeGB = 0, availableSizeGB = 0, usedSizeGB = 0, usagePercent = 0, driveName = "Unknown", unit = "GB" };
        }
    }
}
