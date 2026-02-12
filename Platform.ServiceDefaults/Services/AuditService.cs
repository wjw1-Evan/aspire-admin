using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;
using System.Linq;
using System.Text.Json;
using System.Collections.Concurrent;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 优化的审计服务接口 - 支持限流和批量处理
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// 记录关键操作（优化版，支持限流）
    /// </summary>
    /// <param name="operationType">操作类型</param>
    /// <param name="entityType">实体类型</param>
    /// <param name="entityId">实体标识</param>
    /// <param name="responseData">操作后的响应数据</param>
    /// <param name="description">操作描述</param>
    Task RecordOperationAsync(string operationType, string entityType, string entityId, object? responseData = null, string? description = null);
    
    /// <summary>
    /// 批量记录审计日志
    /// </summary>
    Task RecordBatchAsync(IEnumerable<AuditEntry> entries);
}

/// <summary>
/// 审计条目
/// </summary>
public class AuditEntry
{
    public string OperationType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public object? ResponseData { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// 🚀 优化的审计服务实现 - 支持限流和批量处理
/// </summary>
public class AuditService : IAuditService
{
    private readonly PlatformDbContext _context;
    private readonly ILogger<AuditService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    // 🚀 限流控制 - 使用内存缓存记录最近的操作
    private static readonly ConcurrentDictionary<string, DateTime> RecentOperations = new();
    private static readonly TimeSpan RateLimitWindow = TimeSpan.FromSeconds(1);
    private const int MaxOperationsPerWindow = 10;

    public AuditService(PlatformDbContext context, ILogger<AuditService> logger, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// 🚀 记录关键操作（优化版，支持限流）
    /// </summary>
    public async Task RecordOperationAsync(string operationType, string entityType, string entityId, object? responseData = null, string? description = null)
    {
        // 🚀 限流检查 - 避免审计日志过多
        var userId = _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value ?? "anonymous";
        var rateLimitKey = $"{userId}:{entityType}:{operationType}";
        
        if (!ShouldRecordOperation(rateLimitKey))
        {
            _logger.LogDebug("审计日志限流跳过: {RateLimitKey}", rateLimitKey);
            return;
        }

        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var username = httpContext?.User?.FindFirst("username")?.Value;
            var companyId = httpContext?.User?.FindFirst("companyId")?.Value;

            var audit = new OperationAudit
            {
                EntityType = entityType,
                EntityId = entityId,
                OperationType = ParseOperationType(operationType),
                UserId = userId == "anonymous" ? null : userId,
                Username = username,
                CompanyId = companyId,
                Description = description ?? $"{operationType} {entityType}",
                AfterData = SerializeResponseData(responseData, operationType, entityType, entityId),
                RequestId = httpContext?.TraceIdentifier,
                ClientIp = ResolveClientIp(httpContext),
                UserAgent = httpContext?.Request.Headers["User-Agent"].ToString()
            };

            await _context.Set<OperationAudit>().AddAsync(audit);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "记录审计日志失败: {OperationType} {EntityType} {EntityId}", operationType, entityType, entityId);
        }
    }

    /// <summary>
    /// 🚀 限流检查 - 防止审计日志洪水
    /// </summary>
    private static bool ShouldRecordOperation(string key)
    {
        var now = DateTime.UtcNow;
        
        // 清理过期条目
        var expiredKeys = RecentOperations
            .Where(x => now - x.Value > RateLimitWindow)
            .Select(x => x.Key)
            .ToList();
            
        foreach (var expiredKey in expiredKeys)
        {
            RecentOperations.TryRemove(expiredKey, out _);
        }
        
        // 检查当前键的操作频率
        var recentCount = RecentOperations.Count(x => x.Key.StartsWith(key.Split(':')[0]) && now - x.Value <= RateLimitWindow);
        
        if (recentCount >= MaxOperationsPerWindow)
        {
            return false;
        }
        
        // 记录本次操作
        RecentOperations[key] = now;
        return true;
    }

    private string? SerializeResponseData(object? responseData, string operationType, string entityType, string entityId)
    {
        if (responseData == null)
        {
            return null;
        }

        if (responseData is string stringData)
        {
            return stringData;
        }

        try
        {
            return JsonSerializer.Serialize(responseData, SerializerOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "序列化审计响应数据失败: {OperationType} {EntityType} {EntityId}", operationType, entityType, entityId);
            return null;
        }
    }

    /// <summary>
    /// 🚀 批量记录审计日志
    /// </summary>
    public async Task RecordBatchAsync(IEnumerable<AuditEntry> entries)
    {
        var entryList = entries.ToList();
        if (entryList.Count == 0) return;

        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var userId = httpContext?.User?.FindFirst("userId")?.Value;
            var username = httpContext?.User?.FindFirst("username")?.Value;
            var companyId = httpContext?.User?.FindFirst("companyId")?.Value;
            var clientIp = ResolveClientIp(httpContext);
            var userAgent = httpContext?.Request.Headers["User-Agent"].ToString();
            var requestId = httpContext?.TraceIdentifier;

            var audits = entryList.Select(entry => new OperationAudit
            {
                EntityType = entry.EntityType,
                EntityId = entry.EntityId,
                OperationType = ParseOperationType(entry.OperationType),
                UserId = userId,
                Username = username,
                CompanyId = companyId,
                Description = entry.Description ?? $"{entry.OperationType} {entry.EntityType}",
                AfterData = SerializeResponseData(entry.ResponseData, entry.OperationType, entry.EntityType, entry.EntityId),
                RequestId = requestId,
                ClientIp = clientIp,
                UserAgent = userAgent
            }).ToList();

            await _context.Set<OperationAudit>().AddRangeAsync(audits);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量记录审计日志失败: {Count}", entryList.Count);
        }
    }

    /// <summary>
    /// 解析操作类型
    /// </summary>
    private static OperationType ParseOperationType(string operationType)
    {
        return operationType.ToLower() switch
        {
            "create" => OperationType.Create,
            "update" => OperationType.Update,
            "delete" => OperationType.Delete,
            "softdelete" => OperationType.SoftDelete,
            "harddelete" => OperationType.HardDelete,
            "replace" => OperationType.Replace,
            "batch_create" or "batchcreate" => OperationType.BatchCreate,
            "batch_update" or "batchupdate" => OperationType.BatchUpdate,
            "batch_delete" or "batchdelete" => OperationType.BatchDelete,
            "query" => OperationType.Query,
            _ => OperationType.Update
        };
    }

    private static string? ResolveClientIp(HttpContext? httpContext)
    {
        if (httpContext == null)
        {
            return null;
        }

        if (httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out StringValues forwardedFor) &&
            !StringValues.IsNullOrEmpty(forwardedFor))
        {
            var firstIp = forwardedFor.ToString()
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(firstIp))
            {
                return firstIp;
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString();
    }
}