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
    /// 自动注册指定命名空间下的所有服务
    /// </summary>
    /// <param name="services">服务集合</param>
    /// <param name="servicesNamespace">要扫描的命名空间</param>
    /// <returns>服务集合</returns>
    /// <remarks>
    /// 通过反射自动发现并注册服务：
    /// - 扫描实现类，自动查找它们实现的接口并注册
    /// - 使用 IsInterface 识别接口，不依赖命名约定（如 "I" 开头）
    /// - 基于实际的类型关系进行注册
    /// - 所有服务使用 Scoped 生命周期注册
    /// </remarks>
    public static IServiceCollection AddBusinessServices(this IServiceCollection services, string servicesNamespace)
    {
        var assembly = Assembly.GetExecutingAssembly();
        
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

    /// <summary>
    /// 自动注册包含 "Services" 的命名空间下的所有服务
    /// </summary>
    /// <param name="services">服务集合</param>
    /// <returns>服务集合</returns>
    /// <remarks>
    /// 这是便捷方法，自动查找程序集中包含 "Services" 的命名空间并扫描注册。
    /// 如果程序集中有多个包含 "Services" 的命名空间，将使用第一个找到的。
    /// 如果需要扫描特定命名空间，请使用重载方法并传入命名空间参数。
    /// </remarks>
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        
        // 查找程序集中包含 "Services" 的命名空间
        var servicesNamespace = assembly.GetTypes()
            .Where(t => t.Namespace != null && t.Namespace.Contains(".Services"))
            .Select(t => t.Namespace)
            .Distinct()
            .FirstOrDefault()
            ?? throw new InvalidOperationException("未找到包含 'Services' 的命名空间");
        
        return services.AddBusinessServices(servicesNamespace);
    }
}

