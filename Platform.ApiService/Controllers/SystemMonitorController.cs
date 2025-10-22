using System.Diagnostics;
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
            
            // 使用固定的系统总内存值（8GB）
            var totalSystemMemory = 8L * 1024 * 1024 * 1024;
            
            // 可用内存
            var availableMemory = totalSystemMemory - processMemory;
            
            // 内存使用率
            var memoryUsagePercent = (double)processMemory / totalSystemMemory * 100;

            return new
            {
                ProcessMemoryMB = Math.Round(processMemory / 1024.0 / 1024.0, 2),
                TotalMemoryMB = Math.Round(totalSystemMemory / 1024.0 / 1024.0, 2),
                AvailableMemoryMB = Math.Round(availableMemory / 1024.0 / 1024.0, 2),
                UsagePercent = Math.Round(memoryUsagePercent, 2),
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
                Unit = "MB"
            };
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



