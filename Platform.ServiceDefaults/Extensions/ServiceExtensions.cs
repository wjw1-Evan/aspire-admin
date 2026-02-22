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
    /// 一键注册平台所有数据库与基础设施服务。
    /// <list type="bullet">
    ///   <item>IMongoClient + IMongoDatabase（Aspire 自动注册）</item>
    ///   <item>PlatformDbContext（EF Core + MongoDB Provider）</item>
    ///   <item>IDataFactory（泛型 CRUD 工厂）</item>
    ///   <item>ITenantContext（多租户上下文）</item>
    ///   <item>IFileStorageFactory（文件存储 / GridFS）</item>
    ///   <item>MongoDB 全局约定（IgnoreExtraElements + CamelCase）</item>
    /// </list>
    /// </summary>
    public static IHostApplicationBuilder AddPlatformDatabase(this IHostApplicationBuilder builder, string connectionName = "mongodb")
    {
        // ── Aspire 组件 ──────────────────────────────────
        // 自动从 AppHost 资源解析连接信息，注册 IMongoClient + IMongoDatabase
        builder.AddMongoDBClient(connectionName);

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

        // ── EF Core ──────────────────────────────────────
        // 复用 Aspire 已注册的 IMongoDatabase 获取 Client 和数据库名
        builder.Services.AddDbContext<PlatformDbContext>((sp, options) =>
        {
            var db = sp.GetRequiredService<MongoDB.Driver.IMongoDatabase>();
            options.UseMongoDB(db.Client, db.DatabaseNamespace.DatabaseName);
        });
        builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<PlatformDbContext>());

        // ── 基础设施服务 ─────────────────────────────────
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped(typeof(IDataFactory<>), typeof(EFCoreDataFactory<>));
        builder.Services.AddScoped<ITenantContext, TenantContext>();
        builder.Services.AddScoped<IFileStorageFactory, GridFSFileStorage>();

        return builder;
    }
}
