using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 提供系统资源（CPU、内存、磁盘、系统信息等）的采集服务
/// </summary>
public interface ISystemResourceService
{
    /// <summary>
    /// 获取当前系统资源使用情况
    /// </summary>
    /// <returns>包含 Memory/Cpu/Disk/System/Timestamp 字段的对象</returns>
    Task<object> GetSystemResourcesAsync();
}

