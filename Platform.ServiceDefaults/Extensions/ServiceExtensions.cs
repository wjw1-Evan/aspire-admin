using MongoDB.Driver;
using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;

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
        services.AddScoped<IDataFactory<T>, EFCoreDataFactory<T>>();

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

        // 注册数据库操作工厂
        services.AddScoped(typeof(IDataFactory<>), typeof(EFCoreDataFactory<>));

        return services;
    }

    /// <summary>
    /// 一键添加平台所有数据库相关服务（IMongoClient, IMongoDatabase, PlatformDbContext）
    /// 支持从 Aspire 配置中自动解析数据库名称
    /// </summary>
    /// <param name="builder">主机应用程序构建器</param>
    /// <param name="connectionName">连接名称</param>
    /// <returns>构建器</returns>
    public static IHostApplicationBuilder AddPlatformDatabase(this IHostApplicationBuilder builder, string connectionName = "mongodb")
    {
        // 1. 注册 IMongoClient (Aspire 默认组件)
        builder.AddMongoDBClient(connectionName);

        // 2. 注册 IMongoDatabase (用于 TenantContext 等直接使用驱动的应用)
        builder.AddMongoDatabase(connectionName);

        // 3. 注册 PlatformDbContext (EF Core)
        builder.AddPlatformDbContext(connectionName);

        return builder;
    }

    /// <summary>
    /// 添加平台数据库上下文 (MongoDB EF Core)，支持从 Aspire 配置中自动解析数据库名称
    /// </summary>
    /// <param name="builder">主机应用程序构建器</param>
    /// <param name="connectionName">连接名称</param>
    /// <returns>构建器</returns>
    public static IHostApplicationBuilder AddPlatformDbContext(this IHostApplicationBuilder builder, string connectionName = "mongodb")
    { 
        builder.Services.AddDbContext<PlatformDbContext>((sp, options) =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            var connectionString = builder.Configuration.GetConnectionString(connectionName);
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException($"未找到连接字符串: {connectionName}");
            }

            // 从连接字符串中解析数据库名称（Aspire 通常会将数据库名包含在连接字符串中）
            var mongoUrl = new MongoUrl(connectionString);
            var databaseName = mongoUrl.DatabaseName ?? "aspire-admin-db";

            options.UseMongoDB(client, databaseName);
        });

        return builder;
    }

    /// <summary>
    /// 添加 MongoDB 数据库服务支持，支持从 Aspire 配置中自动解析数据库名称
    /// </summary>
    /// <param name="builder">主机应用程序构建器</param>
    /// <param name="connectionName">连接名称</param>
    /// <returns>构建器</returns>
    public static IHostApplicationBuilder AddMongoDatabase(this IHostApplicationBuilder builder, string connectionName = "mongodb")
    {
        builder.Services.AddScoped<IMongoDatabase>(sp =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            var connectionString = builder.Configuration.GetConnectionString(connectionName);
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException($"未找到连接字符串: {connectionName}");
            }

            var mongoUrl = new MongoUrl(connectionString);
            var databaseName = mongoUrl.DatabaseName ?? "aspire-admin-db";

            return client.GetDatabase(databaseName);
        });

        return builder;
    }

    /// <summary>
    /// 添加平台数据库上下文 (MongoDB EF Core)
    /// </summary>
    /// <param name="services">服务集合</param>
    /// <param name="databaseName">数据库名称</param>
    /// <returns>服务集合</returns>
    public static IServiceCollection AddPlatformDbContext(this IServiceCollection services, string databaseName)
    {
        services.AddDbContext<PlatformDbContext>((sp, options) =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            options.UseMongoDB(client, databaseName);
        });

        return services;
    }
}
