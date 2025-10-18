using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 服务基类，提供公共功能 - 所有微服务通用
/// </summary>
public abstract class BaseService
{
    protected readonly IMongoDatabase Database;
    protected readonly IHttpContextAccessor HttpContextAccessor;
    protected readonly ITenantContext TenantContext;
    protected readonly ILogger Logger;

    protected BaseService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger logger)
    {
        Database = database;
        HttpContextAccessor = httpContextAccessor;
        TenantContext = tenantContext;
        Logger = logger;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    protected string? GetCurrentUserId()
    {
        return TenantContext.GetCurrentUserId();
    }

    /// <summary>
    /// 获取当前操作用户名
    /// </summary>
    protected string? GetCurrentUsername()
    {
        return TenantContext.GetCurrentUsername();
    }

    /// <summary>
    /// 获取当前企业ID
    /// </summary>
    protected string? GetCurrentCompanyId()
    {
        return TenantContext.GetCurrentCompanyId();
    }

    /// <summary>
    /// 获取当前用户ID（必需，不存在则抛异常）
    /// </summary>
    protected string GetRequiredUserId()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("未找到用户信息");
        }
        return userId;
    }

    /// <summary>
    /// 获取当前企业ID（必需，不存在则抛异常）
    /// </summary>
    protected string GetRequiredCompanyId()
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到企业信息");
        }
        return companyId;
    }

    /// <summary>
    /// 获取 MongoDB 集合
    /// </summary>
    protected IMongoCollection<T> GetCollection<T>(string collectionName)
    {
        return Database.GetCollection<T>(collectionName);
    }

    /// <summary>
    /// 构建多租户过滤器
    /// </summary>
    protected FilterDefinition<T> BuildMultiTenantFilter<T>(FilterDefinition<T>? additionalFilter = null) where T : IMultiTenant
    {
        var builder = Builders<T>.Filter;
        var filters = new List<FilterDefinition<T>>();

        var companyId = GetCurrentCompanyId();
        if (!string.IsNullOrEmpty(companyId))
        {
            filters.Add(builder.Eq(e => e.CompanyId, companyId));
        }

        if (additionalFilter != null)
        {
            filters.Add(additionalFilter);
        }

        return filters.Count > 0 ? builder.And(filters) : builder.Empty;
    }

    /// <summary>
    /// 设置实体的多租户信息
    /// </summary>
    protected void SetMultiTenantInfo<T>(T entity) where T : IMultiTenant
    {
        var companyId = GetRequiredCompanyId();
        entity.CompanyId = companyId;
    }

    /// <summary>
    /// 设置实体的时间戳信息
    /// </summary>
    protected static void SetTimestampInfo<T>(T entity, bool isUpdate = false) where T : ITimestamped
    {
        if (!isUpdate)
        {
            entity.CreatedAt = DateTime.UtcNow;
        }
        entity.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// 记录操作日志
    /// </summary>
    protected void LogOperation(string operation, string? entityId = null, object? data = null)
    {
        var userId = GetCurrentUserId();
        var companyId = GetCurrentCompanyId();
        
        Logger.LogInformation("操作: {Operation}, 用户: {UserId}, 企业: {CompanyId}, 实体ID: {EntityId}, 数据: {@Data}",
            operation, userId, companyId, entityId, data);
    }

    /// <summary>
    /// 记录信息日志
    /// </summary>
    protected void LogInformation(string message, params object[] args)
    {
        Logger.LogInformation(message, args);
    }

    /// <summary>
    /// 记录错误日志
    /// </summary>
    protected void LogError(string operation, Exception exception, string? entityId = null)
    {
        var userId = GetCurrentUserId();
        var companyId = GetCurrentCompanyId();
        
        Logger.LogError(exception, "操作失败: {Operation}, 用户: {UserId}, 企业: {CompanyId}, 实体ID: {EntityId}",
            operation, userId, companyId, entityId);
    }
}
