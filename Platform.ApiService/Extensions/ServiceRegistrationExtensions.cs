using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 极致简化的平平台自动发现与注册扩展
/// </summary>
public static class ServiceRegistrationExtensions
{
    private static readonly string[] Namespaces = ["Platform.ApiService.Services", "Platform.ApiService.BackgroundServices"];

    /// <summary>
    /// 自动发现并注册所有服务
    /// </summary>
    /// <param name="services"></param>
    /// <param name="configuration"></param>
    /// <returns></returns>
    public static IServiceCollection AddPlatformDiscovery(this IServiceCollection services, IConfiguration configuration)
    {
        var types = typeof(ServiceRegistrationExtensions).Assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && !t.IsSealed);

        foreach (var type in types)
        {
            // 1. Options 绑定 (判断逻辑合并)
            var section = type.GetField("SectionName", BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);
            if (type.Name.EndsWith("Options") && section?.IsLiteral == true)
            {
                var cfgMethod = typeof(OptionsConfigurationServiceCollectionExtensions).GetMethods()
                    .First(m => m.Name == "Configure" && m.GetParameters().Length == 2).MakeGenericMethod(type);
                cfgMethod.Invoke(null, [services, configuration.GetSection(section.GetRawConstantValue()?.ToString()!)]);
            }

            // 2. HostedService 注册
            if (typeof(IHostedService).IsAssignableFrom(type) && !type.Name.Contains("Base"))
            {
                var method = typeof(ServiceCollectionHostedServiceExtensions).GetMethods()
                    .First(m => m.Name == "AddHostedService" && m.IsGenericMethodDefinition && m.GetParameters().Length == 1);
                method.MakeGenericMethod(type).Invoke(null, [services]);
            }

            // 3. 业务逻辑注册 (命名空间过滤)
            if (Namespaces.Any(ns => type.Namespace?.StartsWith(ns) == true) && !typeof(IHostedService).IsAssignableFrom(type))
            {
                var lifetime = typeof(ISingletonDependency).IsAssignableFrom(type) ? ServiceLifetime.Singleton :
                               typeof(ITransientDependency).IsAssignableFrom(type) ? ServiceLifetime.Transient : ServiceLifetime.Scoped;

                var interfaces = type.GetInterfaces().Where(i => !i.Name.StartsWith("I") || (i.Namespace?.StartsWith("Platform") == true));

                if (interfaces.Any())
                {
                    foreach (var i in interfaces) services.Add(new ServiceDescriptor(i, type, lifetime));
                }
                else if (type.GetConstructors().Any(c => c.GetParameters().Length > 0))
                {
                    services.Add(new ServiceDescriptor(type, type, lifetime));
                }
            }
        }
        return services;
    }
}
