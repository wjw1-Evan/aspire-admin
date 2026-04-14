using System.Diagnostics;
using System.Management;
using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Controllers;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Globalization;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 系统监控控制器
/// 系统资源监控、进程信息、性能指标
/// </summary>
[ApiController]
[Route("api/system-monitor")]
public class SystemMonitorController : BaseApiController
{
    private readonly ILogger<SystemMonitorController> _logger;

    public SystemMonitorController(ILogger<SystemMonitorController> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    private static DateTime _lastCpuSampleTime = DateTime.MinValue;
    private static TimeSpan _lastCpuTotalProcessorTime = TimeSpan.Zero;
    private static double _lastCpuUsagePercent = 0;
    private static readonly object _cpuLock = new object();

    private static object? _cachedResources = null;
    private static DateTime _lastResourceFetchTime = DateTime.MinValue;
    private static readonly TimeSpan _resourceCacheDuration = TimeSpan.FromSeconds(2);
    private static readonly object _resourceLock = new object();

    /// <summary>
    /// 获取系统资源使用情况
    /// </summary>
    /// <returns>系统资源信息</returns>
    [HttpGet("resources")]
    public IActionResult GetSystemResources()
    {
        lock (_resourceLock)
        {
            if (_cachedResources != null && DateTime.UtcNow - _lastResourceFetchTime < _resourceCacheDuration)
            {
                return Success(_cachedResources);
            }

            var process = Process.GetCurrentProcess();

            var memoryInfo = GetMemoryInfo(process);
            var cpuInfo = GetCpuInfo();
            var diskInfo = GetDiskInfo();
            var systemInfo = GetSystemInfo();

            _cachedResources = new
            {
                Memory = memoryInfo,
                Cpu = cpuInfo,
                Disk = diskInfo,
                System = systemInfo,
                Timestamp = DateTime.UtcNow
            };
            _lastResourceFetchTime = DateTime.UtcNow;

            return Success(_cachedResources);
        }
    }

    private object GetMemoryInfo(Process process)
    {
        try
        {
            var processMemory = process.WorkingSet64;
            var systemTotalMemory = GetSystemTotalMemory();
            var systemAvailableMemory = GetSystemAvailableMemory();
            var systemUsedMemory = systemTotalMemory - systemAvailableMemory;

            var systemMemoryUsagePercent = systemTotalMemory > 0
                ? (double)systemUsedMemory / systemTotalMemory * 100
                : 0;

            var processMemoryUsagePercent = systemTotalMemory > 0
                ? (double)processMemory / systemTotalMemory * 100
                : 0;

            return new
            {
                ProcessMemoryMB = Math.Round(processMemory / 1024.0 / 1024.0, 2),
                TotalMemoryMB = Math.Round(systemTotalMemory / 1024.0 / 1024.0, 2),
                AvailableMemoryMB = Math.Round(systemAvailableMemory / 1024.0 / 1024.0, 2),
                UsagePercent = Math.Round(systemMemoryUsagePercent, 2),
                ProcessUsagePercent = Math.Round(processMemoryUsagePercent, 2),
                Unit = "MB"
            };
        }
        catch
        {
            return new
            {
                ProcessMemoryMB = 0,
                TotalMemoryMB = 0,
                AvailableMemoryMB = 0,
                UsagePercent = 0,
                ProcessUsagePercent = 0,
                Unit = "MB"
            };
        }
    }

    private long GetSystemTotalMemory()
    {
        try
        {
            if (Environment.OSVersion.Platform == PlatformID.Win32NT)
            {
#if WINDOWS
                using (var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        var totalMemoryBytes = Convert.ToInt64(obj["TotalPhysicalMemory"]);
                        return totalMemoryBytes;
                    }
                }
#else
                return GetUnixSystemTotalMemory();
#endif
            }
            else
            {
                return GetUnixSystemTotalMemory();
            }
        }
        catch
        {
            return 0;
        }
    }

    private long GetUnixSystemTotalMemory()
    {
        try
        {
            if (System.IO.File.Exists("/proc/meminfo"))
            {
                var meminfo = System.IO.File.ReadAllText("/proc/meminfo");
                var lines = meminfo.Split('\n');
                foreach (var line in lines)
                {
                    if (line.StartsWith("MemTotal:"))
                    {
                        var parts = line.Split(':', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            var value = parts[1].Trim().Split(' ')[0];
                            if (long.TryParse(value, out var kb))
                            {
                                return kb * 1024;
                            }
                        }
                    }
                }
            }

            if (Environment.OSVersion.Platform == PlatformID.MacOSX ||
                Environment.OSVersion.Platform == PlatformID.Unix)
            {
                try
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
                        {
                            return memsize;
                        }
                    }
                }
                catch { }
            }

            return 0;
        }
        catch
        {
            return 0;
        }
    }

    private long GetSystemAvailableMemory()
    {
        try
        {
            if (Environment.OSVersion.Platform == PlatformID.Win32NT)
            {
#if WINDOWS
                using (var searcher = new ManagementObjectSearcher("SELECT AvailableBytes FROM Win32_PerfRawData_PerfOS_Memory"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        var availableBytes = Convert.ToInt64(obj["AvailableBytes"]);
                        return availableBytes;
                    }
                }
#else
                return GetUnixSystemAvailableMemory();
#endif
            }
            else
            {
                return GetUnixSystemAvailableMemory();
            }
        }
        catch
        {
            return 0;
        }
    }

    private long GetUnixSystemAvailableMemory()
    {
        try
        {
            if (System.IO.File.Exists("/proc/meminfo"))
            {
                var meminfo = System.IO.File.ReadAllText("/proc/meminfo");
                var lines = meminfo.Split('\n');
                foreach (var line in lines)
                {
                    if (line.StartsWith("MemAvailable:"))
                    {
                        var parts = line.Split(':', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            var value = parts[1].Trim().Split(' ')[0];
                            if (long.TryParse(value, out var kb))
                            {
                                return kb * 1024;
                            }
                        }
                    }
                    else if (line.StartsWith("MemFree:"))
                    {
                        var parts = line.Split(':', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            var value = parts[1].Trim().Split(' ')[0];
                            if (long.TryParse(value, out var kb))
                            {
                                return kb * 1024;
                            }
                        }
                    }
                }
            }

            if (Environment.OSVersion.Platform == PlatformID.MacOSX ||
                Environment.OSVersion.Platform == PlatformID.Unix)
            {
                try
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

                        if (process.ExitCode == 0)
                        {
                            var lines = output.Split('\n');
                            long freePages = 0;
                            long inactivePages = 0;
                            long pageSize = 0;

                            foreach (var line in lines)
                            {
                                if (line.StartsWith("Pages free:"))
                                {
                                    var value = line.Split(':')[1].Trim().TrimEnd('.');
                                    if (long.TryParse(value, out var pages))
                                        freePages = pages;
                                }
                                else if (line.StartsWith("Pages inactive:"))
                                {
                                    var value = line.Split(':')[1].Trim().TrimEnd('.');
                                    if (long.TryParse(value, out var pages))
                                        inactivePages = pages;
                                }
                                else if (line.Contains("page size of"))
                                {
                                    var parts = line.Split(' ');
                                    for (int i = 0; i < parts.Length; i++)
                                    {
                                        if (parts[i].Contains("bytes"))
                                        {
                                            var token = parts[i].Replace("bytes)", "").Replace("bytes", "");
                                            if (long.TryParse(token, out var size))
                                            {
                                                pageSize = size;
                                                break;
                                            }
                                            if (i > 0 && long.TryParse(parts[i - 1], out var size2))
                                            {
                                                pageSize = size2;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            if (pageSize <= 0)
                            {
                                _logger.LogWarning("Failed to parse page size from vm_stat output");
                                return 0;
                            }

                            var availablePages = freePages + inactivePages;
                            return availablePages * pageSize;
                        }
                    }
                }
                catch { }
            }

            return 0;
        }
        catch
        {
            return 0;
        }
    }

    private object GetCpuInfo()
    {
        try
        {
            var process = Process.GetCurrentProcess();
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
                UsagePercent = Math.Round(systemUsagePercent > 0 ? systemUsagePercent : processUsagePercent, 2),
                ProcessUsagePercent = Math.Round(processUsagePercent, 2),
                ProcessTime = Math.Round(currentProcessorTime.TotalSeconds, 2),
                Uptime = (DateTime.Now - process.StartTime).TotalSeconds,
                Unit = "%"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取 CPU 信息失败");
            return new
            {
                UsagePercent = 0,
                ProcessUsagePercent = 0,
                ProcessTime = 0,
                Uptime = 0,
                Unit = "%"
            };
        }
    }

    private double GetSystemCpuUsage()
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
#if WINDOWS
                using (var searcher = new ManagementObjectSearcher("SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor WHERE Name='_Total'"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        return Convert.ToDouble(obj["PercentProcessorTime"]);
                    }
                }
#endif
            }
            else
            {
                return GetUnixSystemCpuUsage();
            }
        }
        catch { }
        return 0;
    }

    private double GetUnixSystemCpuUsage()
    {
        try
        {
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

    private object GetDiskInfo()
    {
        try
        {
            var drives = DriveInfo.GetDrives();
            var rootPath = Path.GetPathRoot(Environment.CurrentDirectory) ?? "/";
            var currentDrive = drives.FirstOrDefault(d =>
                d.IsReady && (d.Name.Equals(rootPath, StringComparison.OrdinalIgnoreCase) ||
                             rootPath.StartsWith(d.Name, StringComparison.OrdinalIgnoreCase)))
                ?? drives.FirstOrDefault(d => d.IsReady && d.DriveType == DriveType.Fixed)
                ?? drives.FirstOrDefault(d => d.IsReady);

            if (currentDrive == null) throw new Exception("未找到可用的磁盘驱动器");

            return new
            {
                TotalSizeGB = Math.Round(currentDrive.TotalSize / 1024.0 / 1024.0 / 1024.0, 2),
                AvailableSizeGB = Math.Round(currentDrive.AvailableFreeSpace / 1024.0 / 1024.0 / 1024.0, 2),
                UsedSizeGB = Math.Round((currentDrive.TotalSize - currentDrive.AvailableFreeSpace) / 1024.0 / 1024.0 / 1024.0, 2),
                UsagePercent = Math.Round((double)(currentDrive.TotalSize - currentDrive.AvailableFreeSpace) / currentDrive.TotalSize * 100, 2),
                DriveName = currentDrive.Name,
                DriveType = currentDrive.DriveType.ToString(),
                Unit = "GB"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取磁盘信息失败");
            return new
            {
                TotalSizeGB = 0,
                AvailableSizeGB = 0,
                UsedSizeGB = 0,
                UsagePercent = 0,
                DriveName = "Unknown",
                DriveType = "Unknown",
                Unit = "GB"
            };
        }
    }

    private object GetSystemInfo()
    {
        try
        {
            return new
            {
                MachineName = Environment.MachineName,
                ProcessorCount = Environment.ProcessorCount,
                OSVersion = Environment.OSVersion.ToString(),
                FrameworkVersion = Environment.Version.ToString(),
                WorkingDirectory = Environment.CurrentDirectory,
                UserDomainName = Environment.UserDomainName,
                UserName = Environment.UserName,
                Is64BitOperatingSystem = Environment.Is64BitOperatingSystem,
                Is64BitProcess = Environment.Is64BitProcess,
                SystemUpTime = TimeSpan.FromMilliseconds(Environment.TickCount64).TotalSeconds
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取系统通用信息失败");
            return new
            {
                MachineName = "Unknown",
                ProcessorCount = 0,
                OSVersion = "Unknown",
                FrameworkVersion = "Unknown",
                WorkingDirectory = "Unknown",
                UserDomainName = "Unknown",
                UserName = "Unknown",
                Is64BitOperatingSystem = false,
                Is64BitProcess = false,
                SystemUpTime = 0
            };
        }
    }
}
