using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Services;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// 服务自动注册扩展方法
/// </summary>
public static class ServiceRegistrationExtensions
{
    /// <summary>
    /// 自动注册 Platform.ApiService.Services 命名空间下的所有服务
    /// </summary>
    /// <param name="services">服务集合</param>
    /// <returns>服务集合</returns>
    /// <remarks>
    /// 通过反射自动发现并注册服务：
    /// - 扫描实现类，自动查找它们实现的接口并注册
    /// - 使用 IsInterface 识别接口，不依赖命名约定（如 "I" 开头）
    /// - 基于实际的类型关系进行注册
    /// - 所有服务使用 Scoped 生命周期注册
    /// </remarks>
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var servicesNamespace = typeof(IUserService).Namespace; // Platform.ApiService.Services
        
        // 遍历所有实现类，找到它们实现的接口并注册
        foreach (var implementationType in assembly.GetTypes()
            .Where(t => t.IsClass 
                && !t.IsAbstract 
                && t.Namespace == servicesNamespace))
        {
            // 查找实现类实现的接口（在指定命名空间下，不依赖命名约定）
            var interfaceType = implementationType.GetInterfaces()
                .FirstOrDefault(i => i.IsInterface && i.Namespace == servicesNamespace);
            
            if (interfaceType != null)
            {
                services.AddScoped(interfaceType, implementationType);
            }
        }

        return services;
    }
}

