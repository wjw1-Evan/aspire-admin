using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 服务基类，提供公共功能
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
    /// 记录错误日志
    /// </summary>
    protected void LogError(Exception ex, string message, params object[] args)
    {
        Logger.LogError(ex, message, args);
    }

    /// <summary>
    /// 记录信息日志
    /// </summary>
    protected void LogInformation(string message, params object[] args)
    {
        Logger.LogInformation(message, args);
    }

    /// <summary>
    /// 记录警告日志
    /// </summary>
    protected void LogWarning(string message, params object[] args)
    {
        Logger.LogWarning(message, args);
    }
}

