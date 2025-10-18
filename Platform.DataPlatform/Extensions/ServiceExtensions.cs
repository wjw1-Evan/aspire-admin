using Microsoft.Extensions.DependencyInjection;
using Platform.DataPlatform.Services;
using Platform.DataPlatform.Connectors;

namespace Platform.DataPlatform.Extensions;

/// <summary>
/// 服务扩展方法
/// </summary>
public static class ServiceExtensions
{
    /// <summary>
    /// 添加数据中台服务
    /// </summary>
    public static IServiceCollection AddDataPlatformServices(this IServiceCollection services)
    {
        // 添加数据连接器工厂
        services.AddSingleton<IDataConnectorFactory, DataConnectorFactory>();

        // 添加业务服务
        services.AddScoped<IDataSourceService, DataSourceService>();
        services.AddScoped<IDataPipelineService, DataPipelineService>();
        services.AddScoped<IDataQualityService, DataQualityService>();
        services.AddScoped<ITaskMonitorService, TaskMonitorService>();

        return services;
    }
}
