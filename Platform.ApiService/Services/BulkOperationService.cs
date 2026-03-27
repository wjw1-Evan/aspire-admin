using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

/// <summary>
/// 批量操作服务
/// </summary>
public class BulkOperationService : IBulkOperationService
{
    private readonly DbContext _context;

    private readonly ITenantContext _tenantContext;
    private readonly ILogger<BulkOperationService> _logger;

    /// <summary>
    /// 初始化批量操作服务
    /// </summary>
    /// <param name="context">数据库上下文</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="logger">日志</param>
    public BulkOperationService(DbContext context,
        ITenantContext tenantContext,
        ILogger<BulkOperationService> logger
    ) {
        _context = context;
        
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// 创建批量操作
    /// </summary>
    /// <param name="operationType">操作类型</param>
    /// <param name="workflowIds">目标工作流ID列表</param>
    /// <param name="parameters">操作参数</param>
    /// <returns>创建的批量操作</returns>
    public async Task<BulkOperation> CreateBulkOperationAsync(BulkOperationType operationType, List<string> workflowIds, Dictionary<string, object>? parameters = null)
    {
        
        Expression<Func<WorkflowDefinition, bool>> filter = w =>
            workflowIds.Contains(w.Id!) &&
            w.IsDeleted != true;

        var existingWorkflows = await _context.Set<WorkflowDefinition>().Where(filter).ToListAsync();
        var existingWorkflowIds = existingWorkflows.Select(w => w.Id).ToList();
        var invalidWorkflowIds = workflowIds.Except(existingWorkflowIds.Where(id => id != null).Select(id => id!)).ToList();

        if (invalidWorkflowIds.Any())
        {
            throw new ArgumentException($"以下工作流ID无效或不存在: {string.Join(", ", invalidWorkflowIds)}");
        }

        var bulkOperation = new BulkOperation
        {
            OperationType = operationType,
            Status = BulkOperationStatus.Queued,
            TargetWorkflowIds = workflowIds,
            Parameters = parameters ?? new Dictionary<string, object>(),
            TotalCount = workflowIds.Count
        };

        await _context.Set<BulkOperation>().AddAsync(bulkOperation);
        await _context.SaveChangesAsync();
        _logger.LogInformation("批量操作已创建: OperationId={OperationId}, Type={OperationType}, WorkflowCount={WorkflowCount}",
            bulkOperation.Id, operationType, workflowIds.Count);

        return bulkOperation;
    }

    /// <summary>
    /// 执行批量操作
    /// </summary>
    /// <param name="operationId">批量操作ID</param>
    /// <param name="cancellationToken">取消标记</param>
    /// <returns>是否执行成功</returns>
    public async Task<bool> ExecuteBulkOperationAsync(string operationId, CancellationToken cancellationToken = default)
    {
        var operation = await _context.Set<BulkOperation>().FirstOrDefaultAsync(x => x.Id == operationId);
        if (operation == null)
        {
            _logger.LogWarning("批量操作不存在: OperationId={OperationId}", operationId);
            return false;
        }

        if (operation.Status != BulkOperationStatus.Queued)
        {
            _logger.LogWarning("批量操作状态不正确: OperationId={OperationId}, Status={Status}", operationId, operation.Status);
            return false;
        }

        await UpdateOperationStatusAsync(operationId, BulkOperationStatus.InProgress, DateTime.UtcNow);

        try
        {
            _logger.LogInformation("开始执行批量操作: OperationId={OperationId}, Type={OperationType}", operationId, operation.OperationType);

            switch (operation.OperationType)
            {
                case BulkOperationType.Activate:
                    await ExecuteActivateOperationAsync(operation, cancellationToken);
                    break;
                case BulkOperationType.Deactivate:
                    await ExecuteDeactivateOperationAsync(operation, cancellationToken);
                    break;
                case BulkOperationType.Delete:
                    await ExecuteDeleteOperationAsync(operation, cancellationToken);
                    break;
                case BulkOperationType.UpdateCategory:
                    await ExecuteUpdateCategoryOperationAsync(operation, cancellationToken);
                    break;
                default:
                    throw new NotSupportedException($"不支持的批量操作类型: {operation.OperationType}");
            }

            await UpdateOperationStatusAsync(operationId, BulkOperationStatus.Completed, null, DateTime.UtcNow);

            _logger.LogInformation("批量操作执行完成: OperationId={OperationId}, Success={SuccessCount}, Failed={FailedCount}",
                operationId, operation.SuccessCount, operation.FailureCount);

            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("批量操作被取消: OperationId={OperationId}", operationId);
            await UpdateOperationStatusAsync(operationId, BulkOperationStatus.Cancelled);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量操作执行失败: OperationId={OperationId}", operationId);
            await UpdateOperationStatusAsync(operationId, BulkOperationStatus.Failed);
            return false;
        }
    }

    /// <summary>
    /// 取消批量操作
    /// </summary>
    /// <param name="operationId">批量操作ID</param>
    /// <returns>是否取消成功</returns>
    public async Task<bool> CancelBulkOperationAsync(string operationId)
    {
        var operation = await _context.Set<BulkOperation>().FirstOrDefaultAsync(x => x.Id == operationId);
        if (operation == null || !operation.Cancellable)
        {
            return false;
        }

        if (operation.Status == BulkOperationStatus.InProgress || operation.Status == BulkOperationStatus.Queued)
        {
            await UpdateOperationStatusAsync(operationId, BulkOperationStatus.Cancelled);
            _logger.LogInformation("批量操作已取消: OperationId={OperationId}", operationId);
            return true;
        }

        return false;
    }

    /// <summary>
    /// 获取批量操作详情
    /// </summary>
    /// <param name="operationId">批量操作ID</param>
    /// <returns>批量操作详情</returns>
    public async Task<BulkOperation?> GetBulkOperationAsync(string operationId)
    {
        return await _context.Set<BulkOperation>().FirstOrDefaultAsync(x => x.Id == operationId);
    }

    /// <summary>
    /// 获取当前用户的批量操作列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>批量操作列表</returns>
    public async Task<List<BulkOperation>> GetUserBulkOperationsAsync(int page = 1, int pageSize = 20)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        Expression<Func<BulkOperation, bool>> filter = b =>
            b.CreatedBy == userId &&
            b.IsDeleted != true;

        var orderBy = (IQueryable<BulkOperation> query) => query.OrderByDescending(b => b.CreatedAt);

        var __fpQ = _context.Set<BulkOperation>().Where(filter);
        var _ = await __fpQ.LongCountAsync();
        var operations = await orderBy(__fpQ).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return operations;
    }

    /// <summary>
    /// 清理已完成的批量操作
    /// </summary>
    /// <param name="olderThan">清理阈值</param>
    /// <returns>删除数量</returns>
    public async Task<int> CleanupCompletedOperationsAsync(TimeSpan olderThan)
    {
        var cutoffDate = DateTime.UtcNow.Subtract(olderThan);

        Expression<Func<BulkOperation, bool>> filter = b =>
            (b.Status == BulkOperationStatus.Completed ||
             b.Status == BulkOperationStatus.Cancelled ||
             b.Status == BulkOperationStatus.Failed) &&
            b.CompletedAt < cutoffDate &&
            b.IsDeleted != true;

        var operationsToDelete = await _context.Set<BulkOperation>().Where(filter).ToListAsync();
        var deletedCount = 0;

        foreach (var operation in operationsToDelete)
        {
            if (operation.Id != null)
            {
                            var __sd2 = await _context.Set<BulkOperation>().FirstOrDefaultAsync(x => x.Id == operation.Id);
            if (__sd2 != null) { __sd2.IsDeleted = true; await _context.SaveChangesAsync(); }

                deletedCount++;
            }
        }

        _logger.LogInformation("清理已完成的批量操作: 删除数量={DeletedCount}", deletedCount);
        return deletedCount;
    }

    private async Task UpdateOperationStatusAsync(string operationId, BulkOperationStatus status, DateTime? startedAt = null, DateTime? completedAt = null)
    {
        var __entity = await _context.Set<BulkOperation>().FirstOrDefaultAsync(x => x.Id == operationId);
        if (__entity != null)
        {
    
            __entity.Status = status;
            if (startedAt.HasValue) __entity.StartedAt = startedAt.Value;
            if (completedAt.HasValue) __entity.CompletedAt = completedAt.Value;
            await _context.SaveChangesAsync();
        }

    }

    private async Task ExecuteActivateOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var __entity = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == workflowId!);
        if (__entity != null)
        {
    
                    __entity.IsActive = true;
            await _context.SaveChangesAsync();
        }

                operation.SuccessCount++;
                _logger.LogDebug("工作流激活成功: WorkflowId={WorkflowId}", workflowId);
            }
            catch (Exception ex)
            {
                operation.FailureCount++;
                operation.Errors.Add(new BulkOperationError
                {
                    WorkflowId = workflowId,
                    ErrorMessage = ex.Message
                });
                _logger.LogError(ex, "激活工作流失败: WorkflowId={WorkflowId}", workflowId);
            }

            operation.ProcessedCount++;
            await UpdateProgressAsync(operation);
        }
    }

    private async Task ExecuteDeactivateOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var __entity = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == workflowId!);
        if (__entity != null)
        {
    
                    __entity.IsActive = false;
            await _context.SaveChangesAsync();
        }

                operation.SuccessCount++;
                _logger.LogDebug("工作流停用成功: WorkflowId={WorkflowId}", workflowId);
            }
            catch (Exception ex)
            {
                operation.FailureCount++;
                operation.Errors.Add(new BulkOperationError
                {
                    WorkflowId = workflowId,
                    ErrorMessage = ex.Message
                });
                _logger.LogError(ex, "停用工作流失败: WorkflowId={WorkflowId}", workflowId);
            }

            operation.ProcessedCount++;
            await UpdateProgressAsync(operation);
        }
    }

    private async Task ExecuteDeleteOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                if (workflowId != null)
                {
                    var __sdE = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == workflowId);
        if (__sdE != null) { __sdE.IsDeleted = true; await _context.SaveChangesAsync(); }
        var result = __sdE != null;
                    if (result)
                    {
                        operation.SuccessCount++;
                        _logger.LogDebug("工作流删除成功: WorkflowId={WorkflowId}", workflowId);
                    }
                    else
                    {
                        operation.FailureCount++;
                        operation.Errors.Add(new BulkOperationError
                        {
                            WorkflowId = workflowId,
                            ErrorMessage = "工作流不存在或已被删除"
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                operation.FailureCount++;
                operation.Errors.Add(new BulkOperationError
                {
                    WorkflowId = workflowId,
                    ErrorMessage = ex.Message
                });
                _logger.LogError(ex, "删除工作流失败: WorkflowId={WorkflowId}", workflowId);
            }

            operation.ProcessedCount++;
            await UpdateProgressAsync(operation);
        }
    }

    private async Task ExecuteUpdateCategoryOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        if (!operation.Parameters.TryGetValue("category", out var categoryObj) || categoryObj is not string category)
        {
            throw new ArgumentException("更新类别操作需要提供 'category' 参数");
        }

        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var __entity = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == workflowId!);
        if (__entity != null)
        {
    
                    __entity.Category = category;
            await _context.SaveChangesAsync();
        }

                operation.SuccessCount++;
                _logger.LogDebug("工作流类别更新成功: WorkflowId={WorkflowId}, Category={Category}", workflowId, category);
            }
            catch (Exception ex)
            {
                operation.FailureCount++;
                operation.Errors.Add(new BulkOperationError
                {
                    WorkflowId = workflowId,
                    ErrorMessage = ex.Message
                });
                _logger.LogError(ex, "更新工作流类别失败: WorkflowId={WorkflowId}", workflowId);
            }

            operation.ProcessedCount++;
            await UpdateProgressAsync(operation);
        }
    }

    private async Task UpdateProgressAsync(BulkOperation operation)
    {
        if (operation.Id == null) return;

        var __entity = await _context.Set<BulkOperation>().FirstOrDefaultAsync(x => x.Id == operation.Id);
        if (__entity != null)
        {
    
            __entity.ProcessedCount = operation.ProcessedCount;
            __entity.SuccessCount = operation.SuccessCount;
            __entity.FailureCount = operation.FailureCount;
            __entity.Errors = operation.Errors;
            await _context.SaveChangesAsync();
        }

    }
}