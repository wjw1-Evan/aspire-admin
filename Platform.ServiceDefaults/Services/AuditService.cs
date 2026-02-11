using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;
using System.Linq;
using System.Text.Json;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 简化的审计服务接口 - 只记录关键操作
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// 记录关键操作（简化版）
    /// </summary>
    /// <param name="operationType">操作类型</param>
    /// <param name="entityType">实体类型</param>
    /// <param name="entityId">实体标识</param>
    /// <param name="responseData">操作后的响应数据</param>
    /// <param name="description">操作描述</param>
    Task RecordOperationAsync(string operationType, string entityType, string entityId, object? responseData = null, string? description = null);
}

/// <summary>
/// 简化的审计服务实现
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

    public AuditService(PlatformDbContext context, ILogger<AuditService> logger, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// 记录关键操作（简化版）
    /// </summary>
    /// <param name="operationType">操作类型</param>
    /// <param name="entityType">实体类型</param>
    /// <param name="entityId">实体标识</param>
    /// <param name="responseData">操作后的响应数据</param>
    /// <param name="description">操作描述</param>
    public async Task RecordOperationAsync(string operationType, string entityType, string entityId, object? responseData = null, string? description = null)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var userId = httpContext?.User?.FindFirst("userId")?.Value;
            var username = httpContext?.User?.FindFirst("username")?.Value;
            var companyId = httpContext?.User?.FindFirst("companyId")?.Value;

            // 解析操作类型
            var operationTypeEnum = operationType.ToLower() switch
            {
                "create" => OperationType.Create,
                "update" => OperationType.Update,
                "delete" => OperationType.Delete,
                "softdelete" => OperationType.SoftDelete,
                "harddelete" => OperationType.HardDelete,
                "replace" => OperationType.Replace,
                _ => OperationType.Update
            };

            var audit = new OperationAudit
            {
                EntityType = entityType,
                EntityId = entityId,
                OperationType = operationTypeEnum,
                UserId = userId,
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