using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 系统资源采集服务实现
/// </summary>
public class SystemResourceService : ISystemResourceService
{
    private readonly ILogger<SystemResourceService> _logger;

    /// <summary>
    /// 初始化系统资源采集服务
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public SystemResourceService(ILogger<SystemResourceService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 获取当前系统资源使用情况（内存、CPU、磁盘、系统信息）
    /// </summary>
    /// <returns>匿名对象，包含 Memory/Cpu/Disk/System/Timestamp 字段</returns>
    public Task<object> GetSystemResourcesAsync()
    {
        try
        {
            var process = Process.GetCurrentProcess();

            var memoryInfo = GetMemoryInfo(process);
            var cpuInfo = GetCpuInfo(process);
            var diskInfo = GetDiskInfo();
            var systemInfo = GetSystemInfo();

            var resources = new
            {
                Memory = memoryInfo,
                Cpu = cpuInfo,
                Disk = diskInfo,
                System = systemInfo,
                Timestamp = DateTime.UtcNow
            };

            return Task.FromResult<object>(resources);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取系统资源信息失败");
            // 返回一个安全的空对象，避免调用端崩溃
            var fallback = new
            {
                Memory = new { ProcessMemoryMB = 0, TotalMemoryMB = 0, AvailableMemoryMB = 0, UsagePercent = 0, ProcessUsagePercent = 0, Unit = "MB" },
                Cpu = new { UsagePercent = 0, ProcessTime = 0, Uptime = 0, Unit = "%" },
                Disk = new { TotalSizeGB = 0, AvailableSizeGB = 0, UsedSizeGB = 0, UsagePercent = 0, DriveName = "Unknown", DriveType = "Unknown", Unit = "GB" },
                System = GetSystemInfo(),
                Timestamp = DateTime.UtcNow
            };
            return Task.FromResult<object>(fallback);
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
            return new { ProcessMemoryMB = 0, TotalMemoryMB = 0, AvailableMemoryMB = 0, UsagePercent = 0, ProcessUsagePercent = 0, Unit = "MB" };
        }
    }

    private long GetSystemTotalMemory()
    {
        try
        {
            // Linux: /proc/meminfo
            if (File.Exists("/proc/meminfo"))
            {
                var lines = File.ReadAllLines("/proc/meminfo");
                var line = lines.FirstOrDefault(l => l.StartsWith("MemTotal:"));
                if (!string.IsNullOrEmpty(line))
                {
                    var parts = line.Split(':', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2)
                    {
                        var value = parts[1].Trim().Split(' ')[0];
                        if (long.TryParse(value, out var kb)) return kb * 1024; // to bytes
                    }
                }
            }

            // macOS: sysctl -n hw.memsize
            if (OperatingSystem.IsMacOS() || OperatingSystem.IsMacCatalyst() || OperatingSystem.IsIOS())
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "sysctl",
                        Arguments = "-n hw.memsize",
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    using var p = Process.Start(psi);
                    if (p != null)
                    {
                        var output = p.StandardOutput.ReadToEnd();
                        p.WaitForExit();
                        if (p.ExitCode == 0 && long.TryParse(output.Trim(), out var mem)) return mem;
                    }
                }
                catch { }
            }
        }
        catch { }
        return 0;
    }

    private long GetSystemAvailableMemory()
    {
        try
        {
            // Linux: /proc/meminfo
            if (File.Exists("/proc/meminfo"))
            {
                var lines = File.ReadAllLines("/proc/meminfo");
                var line = lines.FirstOrDefault(l => l.StartsWith("MemAvailable:"))
                           ?? lines.FirstOrDefault(l => l.StartsWith("MemFree:"));
                if (!string.IsNullOrEmpty(line))
                {
                    var parts = line.Split(':', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2)
                    {
                        var value = parts[1].Trim().Split(' ')[0];
                        if (long.TryParse(value, out var kb)) return kb * 1024; // to bytes
                    }
                }
            }

            // macOS: vm_stat
            if (OperatingSystem.IsMacOS() || OperatingSystem.IsMacCatalyst() || OperatingSystem.IsIOS())
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "vm_stat",
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    using var p = Process.Start(psi);
                    if (p != null)
                    {
                        var output = p.StandardOutput.ReadToEnd();
                        p.WaitForExit();
                        if (p.ExitCode == 0)
                        {
                            var lines = output.Split('\n');
                            long freePages = 0;
                            long inactivePages = 0;
                            long pageSize = 0;
                            foreach (var l in lines)
                            {
                                if (l.StartsWith("Pages free:"))
                                {
                                    var value = l.Split(':')[1].Trim().TrimEnd('.');
                                    if (long.TryParse(value, out var pages)) freePages = pages;
                                }
                                else if (l.StartsWith("Pages inactive:"))
                                {
                                    var value = l.Split(':')[1].Trim().TrimEnd('.');
                                    if (long.TryParse(value, out var pages)) inactivePages = pages;
                                }
                                else if (l.Contains("page size of"))
                                {
                                    var parts = l.Split(' ');
                                    for (int i = 0; i < parts.Length; i++)
                                    {
                                        if (parts[i].Contains("bytes"))
                                        {
                                            var token = parts[i].Replace("bytes)", string.Empty).Replace("bytes", string.Empty);
                                            if (long.TryParse(token, out var size)) { pageSize = size; break; }
                                            if (i > 0 && long.TryParse(parts[i - 1], out var size2)) { pageSize = size2; break; }
                                        }
                                    }
                                }
                            }
                            if (pageSize > 0)
                            {
                                var availablePages = freePages + inactivePages;
                                return availablePages * pageSize;
                            }
                        }
                    }
                }
                catch { }
            }
        }
        catch { }
        return 0;
    }

    private object GetCpuInfo(Process process)
    {
        var startTime = process.StartTime;
        var totalProcessorTime = process.TotalProcessorTime;
        var uptime = DateTime.Now - startTime;
        var cpuUsagePercent = uptime.TotalMilliseconds > 0
            ? (totalProcessorTime.TotalMilliseconds / uptime.TotalMilliseconds) * 100
            : 0;
        return new { UsagePercent = Math.Round(cpuUsagePercent, 2), ProcessTime = totalProcessorTime.TotalSeconds, Uptime = uptime.TotalSeconds, Unit = "%" };
    }

    private object GetDiskInfo()
    {
        try
        {
            var currentDrive = new DriveInfo(Path.GetPathRoot(Environment.CurrentDirectory) ?? "/");
            return new
            {
                TotalSizeGB = Math.Round(currentDrive.TotalSize / 1024.0 / 1024.0 / 1024.0, 2),
                AvailableSizeGB = Math.Round(currentDrive.AvailableFreeSpace / 1024.0 / 1024.0 / 1024.0, 2),
                UsedSizeGB = Math.Round((currentDrive.TotalSize - currentDrive.AvailableFreeSpace) / 1024.0 / 1024.0 / 1024.0, 2),
                UsagePercent = currentDrive.TotalSize > 0 ? Math.Round((double)(currentDrive.TotalSize - currentDrive.AvailableFreeSpace) / currentDrive.TotalSize * 100, 2) : 0,
                DriveName = currentDrive.Name,
                DriveType = currentDrive.DriveType.ToString(),
                Unit = "GB"
            };
        }
        catch
        {
            return new { TotalSizeGB = 0, AvailableSizeGB = 0, UsedSizeGB = 0, UsagePercent = 0, DriveName = "Unknown", DriveType = "Unknown", Unit = "GB" };
        }
    }

    private object GetSystemInfo()
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
}

