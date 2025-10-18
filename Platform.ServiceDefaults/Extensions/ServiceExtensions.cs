using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Driver;
using Platform.ServiceDefaults.Middleware;
using Platform.ServiceDefaults.Services;
using System.Reflection;
using System.Text;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// 服务扩展方法 - 所有微服务通用
/// </summary>
public static class ServiceExtensions
{
    /// <summary>
    /// 添加通用服务 - 所有微服务都应该调用此方法
    /// </summary>
    public static IServiceCollection AddCommonServices(this IServiceCollection services)
    {
        // 添加HTTP上下文访问器
        services.AddHttpContextAccessor();

        // 添加租户上下文
        services.AddScoped<ITenantContext, TenantContext>();

        // 添加日志记录
        services.AddLogging();

        // 添加内存缓存
        services.AddMemoryCache();

        // 添加分布式缓存（Redis）
        services.AddStackExchangeRedisCache(options =>
        {
            // 配置Redis连接字符串
            options.Configuration = "localhost:6379";
        });

        return services;
    }

    /// <summary>
    /// 添加MongoDB服务
    /// </summary>
    public static IServiceCollection AddMongoDbServices(this IServiceCollection services, string connectionString, string databaseName)
    {
        services.AddSingleton<IMongoClient>(provider => new MongoClient(connectionString));
        services.AddScoped<IMongoDatabase>(provider =>
        {
            var client = provider.GetRequiredService<IMongoClient>();
            return client.GetDatabase(databaseName);
        });

        return services;
    }

    /// <summary>
    /// 添加JWT认证服务
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, string secretKey, string issuer, string audience)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                    ClockSkew = TimeSpan.Zero
                };
            });

        return services;
    }

    /// <summary>
    /// 添加CORS服务
    /// </summary>
    public static IServiceCollection AddCorsServices(this IServiceCollection services, string[] allowedOrigins)
    {
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                builder.WithOrigins(allowedOrigins)
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            });
        });

        return services;
    }

    /// <summary>
    /// 添加健康检查服务
    /// </summary>
    public static IServiceCollection AddHealthCheckServices(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);

        return services;
    }


    /// <summary>
    /// 添加异常处理服务
    /// </summary>
    public static IServiceCollection AddExceptionHandling(this IServiceCollection services)
    {
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();

        return services;
    }

    /// <summary>
    /// 添加请求日志服务
    /// </summary>
    public static IServiceCollection AddRequestLogging(this IServiceCollection services)
    {
        services.AddScoped<RequestLoggingMiddleware>();
        return services;
    }

    /// <summary>
    /// 添加性能监控服务
    /// </summary>
    public static IServiceCollection AddPerformanceMonitoring(this IServiceCollection services)
    {
        services.AddScoped<PerformanceMonitoringMiddleware>();
        return services;
    }
}
