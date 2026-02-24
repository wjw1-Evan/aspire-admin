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
            .Where(t => t.IsClass && !t.IsAbstract && !t.IsNested);

        foreach (var type in types)
        {
            // 1. Options 绑定
            if (type.Name.EndsWith("Options"))
            {
                var sectionField = type.GetField("SectionName", BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);
                if (sectionField?.IsLiteral == true)
                {
                    var sectionName = sectionField.GetRawConstantValue()?.ToString();
                    if (!string.IsNullOrEmpty(sectionName))
                    {
                        var method = typeof(OptionsConfigurationServiceCollectionExtensions).GetMethods()
                            .First(m => m.Name == "Configure" && m.GetParameters().Length == 2).MakeGenericMethod(type);
                        method.Invoke(null, [services, configuration.GetSection(sectionName)]);
                    }
                }
            }

            // 2. HostedService 注册
            if (typeof(IHostedService).IsAssignableFrom(type) && !type.Name.Contains("Base"))
            {
                services.AddSingleton(typeof(IHostedService), type);
            }

            // 3. 业务逻辑接口自动注册
            if (Namespaces.Any(ns => type.Namespace?.StartsWith(ns) == true) && !typeof(IHostedService).IsAssignableFrom(type))
            {
                // 识别生命周期 (Singleton > Transient > Scoped)
                var lifetime = ServiceLifetime.Scoped;
                if (typeof(ISingletonDependency).IsAssignableFrom(type)) lifetime = ServiceLifetime.Singleton;
                else if (typeof(ITransientDependency).IsAssignableFrom(type)) lifetime = ServiceLifetime.Transient;
                else if (typeof(IScopedDependency).IsAssignableFrom(type)) lifetime = ServiceLifetime.Scoped;

                var interfaces = type.GetInterfaces()
                    .Where(i => i.Namespace?.StartsWith("Platform") == true && i.Name != nameof(IScopedDependency) &&
                                i.Name != nameof(ISingletonDependency) && i.Name != nameof(ITransientDependency))
                    .ToList();

                if (interfaces.Count > 0)
                {
                    foreach (var i in interfaces) services.Add(new ServiceDescriptor(i, type, lifetime));
                }
                else
                {
                    services.Add(new ServiceDescriptor(type, type, lifetime));
                }
            }
        }
        return services;
    }
}
