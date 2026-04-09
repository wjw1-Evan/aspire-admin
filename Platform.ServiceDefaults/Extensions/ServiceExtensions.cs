using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Aspire.MongoDB.EntityFrameworkCore;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// 平台数据库与基础设施服务扩展方法 - 所有微服务通用。
/// 遵循 Aspire Shared Project 模式，将跨微服务共享的基础设施注册集中在此。
/// </summary>
public static class ServiceExtensions
{
    /// <summary>
    /// 一键注册平台所有数据库与基础设施服务。
    /// <list type="bullet">
    ///   <item>IMongoClient + IMongoDatabase（Aspire 自动注册）</item>
    ///   <item>PlatformDbContext（EF Core + MongoDB Provider）- 服务层直接使用</item>
    ///   <item>ITenantContext（多租户上下文 - Singleton，从 HttpContext.Items 读取 userId）</item>
    ///   <item>MongoDB 全局约定（IgnoreExtraElements + CamelCase）</item>
    /// </list>
    /// connectionName 与 apphost mongo.AddDatabase 相同
    /// </summary>
    public static IHostApplicationBuilder AddPlatformDatabase(this IHostApplicationBuilder builder, string connectionName)
    {
        // ── Aspire 组件 ──────────────────────────────────
        // 自动从 AppHost 资源解析连接信息并注册：
        // 1. IMongoClient / IMongoDatabase (提供给 GridFS / Native Driver)
        // 2. PlatformDbContext (提供给 Entity Framework Core)
        builder.AddMongoDBClient(connectionName);
        builder.AddMongoDbContext<PlatformDbContext>(connectionName);

        // ── MongoDB 全局约定 ─────────────────────────────
        // 集中在此注册，确保所有微服务行为一致
        MongoDB.Bson.Serialization.Conventions.ConventionRegistry.Register(
            "PlatformConventions",
            new MongoDB.Bson.Serialization.Conventions.ConventionPack
            {
                new MongoDB.Bson.Serialization.Conventions.IgnoreExtraElementsConvention(true),
                new MongoDB.Bson.Serialization.Conventions.CamelCaseElementNameConvention()
            },
            _ => true);

        // ── EF Core 基类注册 ──────────────────────────────
        // 确保所有注入 DbContext 的服务都能获取到 PlatformDbContext 实例
        builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<PlatformDbContext>());

        // ── 基础设施服务 ─────────────────────────────────
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton<ITenantContext, TenantContext>();

        // ── 国密安全支持 ─────────────────────────────────
        builder.Services.AddSingleton<ISM4EncryptionProvider, SM4EncryptionProvider>();
        builder.Services.AddSingleton<IPasswordHasher, SM3PasswordHasher>();

        return builder;
    }
}
