using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// 平台数据库与基础设施服务扩展方法 - 所有微服务通用。
/// 遵循 Aspire Shared Project 模式，将跨微服务共享的基础设施注册集中在此。
/// </summary>
public static class ServiceExtensions
{
    /// <summary>
    /// 一键注册平台所有基础设施服务，根据 Database:Provider 配置自动选择 EF Core 提供者。
    /// 支持: mongodb (默认), sqlserver, postgresql
    /// </summary>
    public static IHostApplicationBuilder AddPlatformDatabase(
        this IHostApplicationBuilder builder,
        string connectionName = "database")
    {
        var dbProvider = builder.Configuration["Database:Provider"] ?? "mongodb";

        switch (dbProvider.ToLowerInvariant())
        {
            case "sqlserver":
                builder.AddSqlServerDbContext<PlatformDbContext>(connectionName);
                break;

            case "postgresql":
                builder.AddNpgsqlDbContext<PlatformDbContext>(connectionName);
                break;

            case "mongodb":
            default:
                builder.AddMongoDbContext<PlatformDbContext>(
                    connectionName,
                    databaseName: builder.Configuration["Database:Name"] ?? "appdb");
                break;
        }

        builder.AddRedisClient(connectionName: "redis");

        builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<PlatformDbContext>());

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ITenantContext, TenantContext>();
        builder.Services.AddScoped<ITenantContextSetter>(sp => sp.GetRequiredService<ITenantContext>() as TenantContext
            ?? throw new InvalidOperationException("ITenantContext must be TenantContext"));

        builder.Services.AddSingleton<ISM4EncryptionProvider, SM4EncryptionProvider>();
        builder.Services.AddSingleton<IPasswordHasher, SM3PasswordHasher>();
        builder.Services.AddSingleton<ISM3HmacProvider, SM3HmacProvider>();

        return builder;
    }
}
