using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 简化的审计服务接口 - 只记录关键操作
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// 记录关键操作（简化版）
    /// </summary>
    Task RecordOperationAsync(string operationType, string entityType, string entityId, string? description = null);
}

/// <summary>
/// 简化的审计服务实现
/// </summary>
public class AuditService : IAuditService
{
    private readonly IMongoCollection<OperationAudit> _auditCollection;
    private readonly ILogger<AuditService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(IMongoDatabase database, ILogger<AuditService> logger, IHttpContextAccessor httpContextAccessor)
    {
        _auditCollection = database.GetCollection<OperationAudit>("operationAudits");
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// 记录关键操作（简化版）
    /// </summary>
    public async Task RecordOperationAsync(string operationType, string entityType, string entityId, string? description = null)
    {
        try
        {
            var userId = _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
            var companyId = _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value;

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
                CompanyId = companyId,
                Description = description ?? $"{operationType} {entityType}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            await _auditCollection.InsertOneAsync(audit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "记录审计日志失败: {OperationType} {EntityType} {EntityId}", operationType, entityType, entityId);
        }
    }
}