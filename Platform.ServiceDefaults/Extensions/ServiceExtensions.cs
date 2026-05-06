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
    /// 一键注册平台所有基础设施服务（不包含数据库提供者特定注册）。
    /// <list type="bullet">
    ///   <item>PlatformDbContext - 需在调用方使用具体 EF Core 提供者注册</item>
    ///   <item>ITenantContext（多租户上下文 - 薄封装，委托给 PlatformDbContext.AsyncLocal）</item>
    ///   <item>IFileStorageFactory（文件存储 - 需配合具体存储实现）</item>
    /// </list>
    /// </summary>
    public static IHostApplicationBuilder AddPlatformDatabase(this IHostApplicationBuilder builder, string connectionName = "mongodb")
    {
        // ── 数据库注册 ──────────────────────────────────
        // 调用者需要在自己的项目中注册 PlatformDbContext，使用合适的 EF Core 提供者
        // 示例 (MongoDB): builder.Services.AddDbContext<PlatformDbContext>(options => options.UseMongoDB(connectionString));
        // 示例 (SQL Server): builder.Services.AddDbContext<PlatformDbContext>(options => options.UseSqlServer(connectionString));
        // 
        // 如需使用 GridFS 文件存储，可保留 MongoDB 客户端注册：
        // builder.AddMongoDBClient(connectionName);
        builder.AddRedisClient(connectionName: "redis");


        // ── EF Core 基类注册 ──────────────────────────────
        // 确保所有注入 DbContext 的服务都能获取到 PlatformDbContext 实例
        builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<PlatformDbContext>());

        // ── 基础设施服务 ─────────────────────────────────
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ITenantContext, TenantContext>();
        builder.Services.AddScoped<ITenantContextSetter>(sp => sp.GetRequiredService<ITenantContext>() as TenantContext
            ?? throw new InvalidOperationException("ITenantContext must be TenantContext"));

        // ── 国密安全支持 ─────────────────────────────────
        builder.Services.AddSingleton<ISM4EncryptionProvider, SM4EncryptionProvider>();
        builder.Services.AddSingleton<IPasswordHasher, SM3PasswordHasher>();
        builder.Services.AddSingleton<ISM3HmacProvider, SM3HmacProvider>();

        return builder;
    }
}
