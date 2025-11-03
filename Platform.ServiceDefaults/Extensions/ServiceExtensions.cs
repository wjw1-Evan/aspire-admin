using MongoDB.Driver;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// 服务扩展方法 - 所有微服务通用
/// </summary>
public static class ServiceExtensions
{
    /// <summary>
    /// 添加数据库操作工厂服务
    /// </summary>
    public static IServiceCollection AddDatabaseOperationFactory<T>(this IServiceCollection services) where T : class, IEntity, ISoftDeletable, ITimestamped
    {
        // 注册审计服务
        services.AddScoped<IAuditService, AuditService>();
        
        // 注册数据库操作工厂
        services.AddScoped<IDatabaseOperationFactory<T>, DatabaseOperationFactory<T>>();
        
        return services;
    }

    /// <summary>
    /// 添加数据库操作工厂服务（泛型版本）
    /// </summary>
    public static IServiceCollection AddDatabaseOperationFactories(this IServiceCollection services)
    {
        // 注册审计服务
        services.AddScoped<IAuditService, AuditService>();
        
        return services;
    }

    /// <summary>
    /// 添加数据库操作工厂服务（简化版本）
    /// </summary>
    public static IServiceCollection AddDatabaseFactory(this IServiceCollection services)
    {
        // 注册审计服务
        services.AddScoped<IAuditService, AuditService>();
        
        // 注册数据库操作工厂（使用工厂模式创建 IMongoCollection<T>）
        services.AddScoped(typeof(IDatabaseOperationFactory<>), typeof(DatabaseOperationFactory<>));
        
        return services;
    }
}
