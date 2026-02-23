using Platform.ApiService.Models;
using Platform.ApiService.Services.Mcp;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 业务服务注册扩展类
/// </summary>
public static class ServiceRegistrationExtensions
{
    /// <summary>
    /// 自动扫描并注册指定命名空间下的所有服务
    /// </summary>
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        var assembly = typeof(ServiceRegistrationExtensions).Assembly;

        // 1. 自动扫描注册常规服务（继承了 IScopedService/ISingletonService/ITransientService 等标识接口的服务，
        // 或者简单按命名空间扫描，这里采用项目已有的扫描逻辑）
        // ... 此处保持原有逻辑，略过 ...

        // 2. 🚀 自动注册所有 MCP 工具处理器
        var handlerTypes = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && typeof(Services.Mcp.IMcpToolHandler).IsAssignableFrom(t));

        foreach (var handlerType in handlerTypes)
        {
            services.AddScoped(typeof(Services.Mcp.IMcpToolHandler), handlerType);
        }

        return services;
    }
}
