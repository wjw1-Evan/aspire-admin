using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Platform.ServiceDefaults.Extensions;

public static class ServiceDiscoveryExtensions
{
    private static readonly MethodInfo ConfigureMethod = typeof(OptionsConfigurationServiceCollectionExtensions)
        .GetMethod("Configure", [typeof(IServiceCollection), typeof(IConfigurationSection)])!;

    public static IServiceCollection AddServiceDiscovery(this IServiceCollection services, IConfiguration configuration)
    {
        var assemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => a.FullName?.StartsWith("Platform") == true);
        var types = assemblies.SelectMany(a => a.GetTypes())
            .Where(t => t.IsClass && !t.IsAbstract && !t.IsNested);

        foreach (var type in types)
        {
            if (TryConfigureOptions(type, services, configuration)) continue;
            if (TryRegisterHostedService(type, services)) continue;
            RegisterService(type, services);
        }

        return services;
    }

    private static bool TryConfigureOptions(Type type, IServiceCollection services, IConfiguration configuration)
    {
        if (!type.Name.EndsWith("Options")) return false;

        var sectionField = type.GetField("SectionName", BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);
        var sectionName = sectionField?.IsLiteral == true ? sectionField.GetRawConstantValue()?.ToString() : null;
        if (string.IsNullOrEmpty(sectionName)) return false;

        ConfigureMethod.MakeGenericMethod(type).Invoke(null, [services, configuration.GetSection(sectionName)]);
        return true;
    }

    private static bool TryRegisterHostedService(Type type, IServiceCollection services)
    {
        if (!typeof(IHostedService).IsAssignableFrom(type) || type.Name.Contains("Base")) return false;
        services.AddSingleton(typeof(IHostedService), type);
        return true;
    }

    private static void RegisterService(Type type, IServiceCollection services)
    {
        if (!type.Namespace?.StartsWith("Platform") == true || typeof(IHostedService).IsAssignableFrom(type))
            return;

        // 生命周期命名约定：Singleton* = 单例，Transient* = 瞬态，默认 = Scoped
        var lifetime = type.Name.StartsWith("Singleton") ? ServiceLifetime.Singleton
            : type.Name.StartsWith("Transient") ? ServiceLifetime.Transient
            : ServiceLifetime.Scoped;

        var interfaces = type.GetInterfaces()
            .Where(i => i.Namespace?.StartsWith("Platform") == true)
            .ToList();

        if (interfaces.Count > 0)
            foreach (var i in interfaces) services.Add(new ServiceDescriptor(i, type, lifetime));
        else
            services.Add(new ServiceDescriptor(type, type, lifetime));
    }
}