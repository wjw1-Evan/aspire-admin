using System.Diagnostics;
using System.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Controllers;
using Platform.ServiceDefaults.Controllers;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Globalization;
using System.Linq;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 系统监控控制器
/// </summary>
[ApiController]
[Route("api/system-monitor")]
public class SystemMonitorController : BaseApiController
{
    private readonly ILogger<SystemMonitorController> _logger;

    /// <summary>
    /// 初始化系统监控控制器
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public SystemMonitorController(ILogger<SystemMonitorController> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    private static DateTime _lastCpuSampleTime = DateTime.MinValue;
    private static TimeSpan _lastCpuTotalProcessorTime = TimeSpan.Zero;
    private static double _lastCpuUsagePercent = 0;
    private static readonly object _cpuLock = new object();

    /// <summary>
    /// 获取系统资源使用情况
    /// </summary>
    /// <returns>系统资源使用情况</returns>
    /// <response code="200">成功返回系统资源信息</response>
    /// <response code="401">未授权</response>
    [HttpGet("resources")]
    [Authorize]
    public IActionResult GetSystemResources()
    {

        var process = Process.GetCurrentProcess();

        // 获取内存使用情况
        var memoryInfo = GetMemoryInfo(process);

        // 获取 CPU 使用情况
        var cpuInfo = GetCpuInfo();

        // 获取磁盘使用情况
        var diskInfo = GetDiskInfo();

        // 获取系统信息
        var systemInfo = GetSystemInfo();

        var resources = new
        {
            Memory = memoryInfo,
            Cpu = cpuInfo,
            Disk = diskInfo,
            System = systemInfo,
            Timestamp = DateTime.UtcNow
        };

        return Success(resources);

    }

    /// <summary>
    /// 获取内存使用情况
    /// </summary>
    private object GetMemoryInfo(Process process)
    {
        try
        {
            // 进程内存使用
            var processMemory = process.WorkingSet64;

            // 获取系统内存信息（使用PerformanceCounter或WMI）
            var systemTotalMemory = GetSystemTotalMemory();
            var systemAvailableMemory = GetSystemAvailableMemory();
            var systemUsedMemory = systemTotalMemory - systemAvailableMemory;

            // 系统内存使用率（系统实际使用内存 / 系统总内存）
            var systemMemoryUsagePercent = systemTotalMemory > 0
                ? (double)systemUsedMemory / systemTotalMemory * 100
                : 0;

            // 进程内存使用率（当前进程内存 / 系统总内存）
            var processMemoryUsagePercent = systemTotalMemory > 0
                ? (double)processMemory / systemTotalMemory * 100
                : 0;

            return new
            {
                ProcessMemoryMB = Math.Round(processMemory / 1024.0 / 1024.0, 2),
                TotalMemoryMB = Math.Round(systemTotalMemory / 1024.0 / 1024.0, 2),
                AvailableMemoryMB = Math.Round(systemAvailableMemory / 1024.0 / 1024.0, 2),
                UsagePercent = Math.Round(systemMemoryUsagePercent, 2), // 系统内存使用率
                ProcessUsagePercent = Math.Round(processMemoryUsagePercent, 2), // 进程内存使用率
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

    /// <summary>
    /// 获取系统总内存
    /// </summary>
    private long GetSystemTotalMemory()
    {
        try
        {
            // 检查操作系统类型
            if (Environment.OSVersion.Platform == PlatformID.Win32NT)
            {
#if WINDOWS
                // Windows系统使用WMI
                using (var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        var totalMemoryBytes = Convert.ToInt64(obj["TotalPhysicalMemory"]);
                        return totalMemoryBytes;
                    }
                }
#else
                // 非Windows平台，使用系统原生方法
                return GetUnixSystemTotalMemory();
#endif
            }
            else
            {
                // macOS/Linux系统使用系统原生方法
                return GetUnixSystemTotalMemory();
            }
        }
        catch
        {
            // 所有方法失败时，返回0
            return 0;
        }
    }

    /// <summary>
    /// 获取Unix系统（macOS/Linux）的总内存
    /// </summary>
    private long GetUnixSystemTotalMemory()
    {
        try
        {
            // 尝试读取 /proc/meminfo (Linux)
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
                                return kb * 1024; // 转换为字节
                            }
                        }
                    }
                }
            }

            // macOS 使用 sysctl 命令
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
                catch
                {
                    // sysctl 失败，继续尝试其他方法
                }
            }

            // 如果所有方法都失败，返回0
            return 0;
        }
        catch
        {
            return 0;
        }
    }

    /// <summary>
    /// 获取系统可用内存
    /// </summary>
    private long GetSystemAvailableMemory()
    {
        try
        {
            // 检查操作系统类型
            if (Environment.OSVersion.Platform == PlatformID.Win32NT)
            {
#if WINDOWS
                // Windows系统使用WMI
                using (var searcher = new ManagementObjectSearcher("SELECT AvailableBytes FROM Win32_PerfRawData_PerfOS_Memory"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        var availableBytes = Convert.ToInt64(obj["AvailableBytes"]);
                        return availableBytes;
                    }
                }
#else
                // 非Windows平台，使用Unix方法
                return GetUnixSystemAvailableMemory();
#endif
            }
            else
            {
                // macOS/Linux系统使用更准确的方法
                return GetUnixSystemAvailableMemory();
            }
        }
        catch
        {
            // 所有方法失败时，返回0
            return 0;
        }
    }

    /// <summary>
    /// 获取Unix系统（macOS/Linux）的可用内存
    /// </summary>
    private long GetUnixSystemAvailableMemory()
    {
        try
        {
            // 尝试读取 /proc/meminfo (Linux)
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
                                return kb * 1024; // 转换为字节
                            }
                        }
                    }
                    else if (line.StartsWith("MemFree:"))
                    {
                        // 如果没有 MemAvailable，使用 MemFree
                        var parts = line.Split(':', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            var value = parts[1].Trim().Split(' ')[0];
                            if (long.TryParse(value, out var kb))
                            {
                                return kb * 1024; // 转换为字节
                            }
                        }
                    }
                }
            }

            // macOS 使用 vm_stat 命令获取可用内存
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
                            long pageSize = 0; // 必须从系统中获取，不允许估算

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
                                    // 匹配格式："Mach Virtual Memory Statistics: (page size of 16384 bytes)"
                                    var parts = line.Split(' ');
                                    for (int i = 0; i < parts.Length; i++)
                                    {
                                        if (parts[i].Contains("bytes"))
                                        {
                                            // 尝试从包含bytes的token中提取数字（如"16384"或"bytes)"）
                                            var token = parts[i].Replace("bytes)", "").Replace("bytes", "");
                                            if (long.TryParse(token, out var size))
                                            {
                                                pageSize = size;
                                                break;
                                            }
                                            // 如果当前token是"bytes)"，尝试前一个token
                                            if (i > 0 && long.TryParse(parts[i - 1], out var size2))
                                            {
                                                pageSize = size2;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            // 必须成功获取页面大小才能计算
                            if (pageSize <= 0)
                            {
                                _logger.LogWarning("Failed to parse page size from vm_stat output");
                                return 0;
                            }

                            // macOS 可用内存 = 空闲页面 + 非活跃页面
                            var availablePages = freePages + inactivePages;
                            return availablePages * pageSize;
                        }
                    }
                }
                catch
                {
                    // vm_stat 失败，继续尝试其他方法
                }
            }

            // 如果所有方法都失败，返回0
            return 0;
        }
        catch
        {
            return 0;
        }
    }

    /// <summary>
    /// 获取 CPU 使用情况
    /// </summary>
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

                    if (elapsed.TotalMilliseconds > 500)
                    {
                        // 计算最近一段时间的进程 CPU 使用率，并根据核心数进行归一化 (0-100%)
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
                    // 首次采样，记录状态
                    _lastCpuSampleTime = currentTime;
                    _lastCpuTotalProcessorTime = currentProcessorTime;

                    // 初始平均值作为兜底
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
                // 与内存监控对齐，UsagePercent 优先返回系统整体使用率
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

    /// <summary>
    /// 获取系统整体 CPU 使用率
    /// </summary>
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
                // macOS/Linux 通过 shell 命令获取
                return GetUnixSystemCpuUsage();
            }
        }
        catch { }
        return 0;
    }

    /// <summary>
    /// 获取 Unix 系统整体 CPU 使用率
    /// </summary>
    private double GetUnixSystemCpuUsage()
    {
        try
        {
            var isMac = RuntimeInformation.IsOSPlatform(OSPlatform.OSX);
            var startInfo = new ProcessStartInfo
            {
                FileName = isMac ? "top" : "top",
                Arguments = isMac ? "-l 1 -n 0" : "-bn1",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process != null)
            {
                var output = process.StandardOutput.ReadToEnd();
                // 不使用 WaitForExit 以免挂起太久，但 top -l 1 通常很快
                process.WaitForExit(2000);

                if (isMac)
                {
                    // macOS 格式: "CPU usage: 10.45% user, 8.24% sys, 81.30% idle"
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
                    // Linux 格式: "%Cpu(s):  5.0 us,  2.0 sy,  0.0 ni, 93.0 id, ..."
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

    /// <summary>
    /// 获取磁盘使用情况
    /// </summary>
    private object GetDiskInfo()
    {
        try
        {
            var drives = DriveInfo.GetDrives();
            // 优先匹配当前目录所在的驱动器，或者第一个固定驱动器
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

    /// <summary>
    /// 获取系统信息
    /// </summary>
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



