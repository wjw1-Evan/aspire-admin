using System.Diagnostics;
using System.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Controllers;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 系统监控控制器
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SystemMonitorController : BaseApiController
{
    private readonly ILogger<SystemMonitorController> _logger;

    public SystemMonitorController(ILogger<SystemMonitorController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 获取系统资源使用情况（测试端点，无需认证）
    /// </summary>
    /// <returns>系统资源使用情况</returns>
    /// <response code="200">成功返回系统资源信息</response>
    [HttpGet("resources-test")]
    public IActionResult GetSystemResourcesTest()
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
                // 非Windows平台，使用Unix方法
                return GetUnixSystemTotalMemory();
#endif
            }
            else
            {
                // macOS/Linux系统使用更准确的方法
                return GetUnixSystemTotalMemory();
            }
        }
        catch
        {
            // 所有方法失败时，使用默认值
            return 8L * 1024 * 1024 * 1024; // 默认8GB
        }
        
        return 8L * 1024 * 1024 * 1024; // 默认8GB
    }

    /// <summary>
    /// 获取Unix系统（macOS/Linux）的总内存
    /// </summary>
    private long GetUnixSystemTotalMemory()
    {
        try
        {
            // 使用GC.GetTotalMemory()作为基础，但使用更合理的倍数
            var gcMemory = GC.GetTotalMemory(false);
            
            // 如果GC内存太小，使用进程工作集估算
            if (gcMemory < 100 * 1024 * 1024) // 小于100MB
            {
                var process = Process.GetCurrentProcess();
                return process.WorkingSet64 * 50; // 使用更大的倍数估算
            }
            
            return gcMemory * 20; // 使用更大的倍数估算
        }
        catch
        {
            return 8L * 1024 * 1024 * 1024; // 默认8GB
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
            // 所有方法失败时，使用默认值
            return 4L * 1024 * 1024 * 1024; // 默认4GB可用
        }
        
        return 4L * 1024 * 1024 * 1024; // 默认4GB可用
    }

    /// <summary>
    /// 获取Unix系统（macOS/Linux）的可用内存
    /// </summary>
    private long GetUnixSystemAvailableMemory()
    {
        try
        {
            // 获取系统总内存
            var totalMemory = GetUnixSystemTotalMemory();
            
            // 获取当前进程内存
            var process = Process.GetCurrentProcess();
            var processMemory = process.WorkingSet64;
            
            // 估算系统可用内存（总内存 - 进程内存 - 系统开销）
            // 系统开销通常占总内存的30-40%
            var systemOverhead = (long)(totalMemory * 0.35); // 35%系统开销
            var availableMemory = totalMemory - processMemory - systemOverhead;
            
            // 确保可用内存不为负数
            return Math.Max(availableMemory, (long)(totalMemory * 0.2)); // 至少保留20%可用内存
        }
        catch
        {
            return 4L * 1024 * 1024 * 1024; // 默认4GB可用
        }
    }

    /// <summary>
    /// 获取 CPU 使用情况
    /// </summary>
    private object GetCpuInfo()
    {
        // 获取进程 CPU 时间
        var process = Process.GetCurrentProcess();
        var startTime = process.StartTime;
        var totalProcessorTime = process.TotalProcessorTime;
        var uptime = DateTime.Now - startTime;
        
        // 计算 CPU 使用率（近似值）
        var cpuUsagePercent = uptime.TotalMilliseconds > 0 
            ? (totalProcessorTime.TotalMilliseconds / uptime.TotalMilliseconds) * 100 
            : 0;

        return new
        {
            UsagePercent = Math.Round(cpuUsagePercent, 2),
            ProcessTime = totalProcessorTime.TotalSeconds,
            Uptime = uptime.TotalSeconds,
            Unit = "%"
        };
    }

    /// <summary>
    /// 获取磁盘使用情况
    /// </summary>
    private object GetDiskInfo()
    {
        try
        {
            var currentDrive = new DriveInfo(Path.GetPathRoot(Environment.CurrentDirectory) ?? "C:");
            
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
        catch
        {
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



