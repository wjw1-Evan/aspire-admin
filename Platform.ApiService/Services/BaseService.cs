using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 服务基类，提供公共功能
/// </summary>
public abstract class BaseService
{
    protected readonly IMongoDatabase Database;
    protected readonly IHttpContextAccessor HttpContextAccessor;
    protected readonly ILogger Logger;

    protected BaseService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ILogger logger)
    {
        Database = database;
        HttpContextAccessor = httpContextAccessor;
        Logger = logger;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    protected string? GetCurrentUserId()
    {
        return HttpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 获取当前操作用户名
    /// </summary>
    protected string? GetCurrentUsername()
    {
        return HttpContextAccessor.HttpContext?.User?.FindFirst("username")?.Value
               ?? HttpContextAccessor.HttpContext?.User?.Identity?.Name;
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

