using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 批量操作服务实现
/// </summary>
public class BulkOperationService : IBulkOperationService
{
    private readonly IDatabaseOperationFactory<BulkOperation> _bulkOperationFactory;
    private readonly IDatabaseOperationFactory<WorkflowDefinition> _workflowFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<BulkOperationService> _logger;

    public BulkOperationService(
        IDatabaseOperationFactory<BulkOperation> bulkOperationFactory,
        IDatabaseOperationFactory<WorkflowDefinition> workflowFactory,
        ITenantContext tenantContext,
        ILogger<BulkOperationService> logger)
    {
        _bulkOperationFactory = bulkOperationFactory;
        _workflowFactory = workflowFactory;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// 创建批量操作
    /// </summary>
    public async Task<BulkOperation> CreateBulkOperationAsync(BulkOperationType operationType, List<string> workflowIds, Dictionary<string, object>? parameters = null)
    {
        var userId = _bulkOperationFactory.GetRequiredUserId();
        var companyId = await _bulkOperationFactory.GetRequiredCompanyIdAsync();

        // 验证工作流ID是否存在且属于当前企业
        var filter = _workflowFactory.CreateFilterBuilder()
            .In(w => w.Id, workflowIds)
            .Equal(w => w.IsDeleted, false)
            .Build();

        var existingWorkflows = await _workflowFactory.FindAsync(filter);
        var existingWorkflowIds = existingWorkflows.Select(w => w.Id).ToList();
        var invalidWorkflowIds = workflowIds.Except(existingWorkflowIds).ToList();

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
            TotalCount = workflowIds.Count,
            CompanyId = companyId
        };

        var createdOperation = await _bulkOperationFactory.CreateAsync(bulkOperation);

        _logger.LogInformation("批量操作已创建: OperationId={OperationId}, Type={OperationType}, WorkflowCount={WorkflowCount}",
            createdOperation.Id, operationType, workflowIds.Count);

        return createdOperation;
    }

    /// <summary>
    /// 执行批量操作
    /// </summary>
    public async Task<bool> ExecuteBulkOperationAsync(string operationId, CancellationToken cancellationToken = default)
    {
        var operation = await _bulkOperationFactory.GetByIdAsync(operationId);
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

        // 更新状态为进行中
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

            // 更新状态为已完成
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
    public async Task<bool> CancelBulkOperationAsync(string operationId)
    {
        var operation = await _bulkOperationFactory.GetByIdAsync(operationId);
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
    /// 获取批量操作状态
    /// </summary>
    public async Task<BulkOperation?> GetBulkOperationAsync(string operationId)
    {
        return await _bulkOperationFactory.GetByIdAsync(operationId);
    }

    /// <summary>
    /// 获取用户的批量操作列表
    /// </summary>
    public async Task<List<BulkOperation>> GetUserBulkOperationsAsync(int page = 1, int pageSize = 20)
    {
        var userId = _bulkOperationFactory.GetRequiredUserId();

        var filter = _bulkOperationFactory.CreateFilterBuilder()
            .Equal(b => b.CreatedBy, userId)
            .Equal(b => b.IsDeleted, false)
            .Build();

        var sort = _bulkOperationFactory.CreateSortBuilder()
            .Descending(b => b.CreatedAt)
            .Build();

        var (operations, _) = await _bulkOperationFactory.FindPagedAsync(filter, sort, page, pageSize);
        return operations;
    }

    /// <summary>
    /// 清理已完成的批量操作
    /// </summary>
    public async Task<int> CleanupCompletedOperationsAsync(TimeSpan olderThan)
    {
        var cutoffDate = DateTime.UtcNow.Subtract(olderThan);

        var filter = _bulkOperationFactory.CreateFilterBuilder()
            .In(b => b.Status, new[] { BulkOperationStatus.Completed, BulkOperationStatus.Cancelled, BulkOperationStatus.Failed })
            .LessThan(b => b.CompletedAt, cutoffDate)
            .Equal(b => b.IsDeleted, false)
            .Build();

        var operationsToDelete = await _bulkOperationFactory.FindAsync(filter);
        var deletedCount = 0;

        foreach (var operation in operationsToDelete)
        {
            await _bulkOperationFactory.FindOneAndSoftDeleteAsync(
                _bulkOperationFactory.CreateFilterBuilder().Equal(b => b.Id, operation.Id).Build()
            );
            deletedCount++;
        }

        _logger.LogInformation("清理已完成的批量操作: 删除数量={DeletedCount}", deletedCount);
        return deletedCount;
    }

    #region 私有方法

    /// <summary>
    /// 更新操作状态
    /// </summary>
    private async Task UpdateOperationStatusAsync(string operationId, BulkOperationStatus status, DateTime? startedAt = null, DateTime? completedAt = null)
    {
        var updateBuilder = _bulkOperationFactory.CreateUpdateBuilder()
            .Set(b => b.Status, status);

        if (startedAt.HasValue)
            updateBuilder.Set(b => b.StartedAt, startedAt.Value);

        if (completedAt.HasValue)
            updateBuilder.Set(b => b.CompletedAt, completedAt.Value);

        var filter = _bulkOperationFactory.CreateFilterBuilder()
            .Equal(b => b.Id, operationId)
            .Build();

        await _bulkOperationFactory.FindOneAndUpdateAsync(filter, updateBuilder.Build());
    }

    /// <summary>
    /// 执行激活操作
    /// </summary>
    private async Task ExecuteActivateOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var filter = _workflowFactory.CreateFilterBuilder()
                    .Equal(w => w.Id, workflowId)
                    .Equal(w => w.IsDeleted, false)
                    .Build();

                var update = _workflowFactory.CreateUpdateBuilder()
                    .Set(w => w.IsActive, true)
                    .Build();

                var result = await _workflowFactory.FindOneAndUpdateAsync(filter, update);
                if (result != null)
                {
                    operation.SuccessCount++;
                    _logger.LogDebug("工作流激活成功: WorkflowId={WorkflowId}", workflowId);
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

    /// <summary>
    /// 执行停用操作
    /// </summary>
    private async Task ExecuteDeactivateOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var filter = _workflowFactory.CreateFilterBuilder()
                    .Equal(w => w.Id, workflowId)
                    .Equal(w => w.IsDeleted, false)
                    .Build();

                var update = _workflowFactory.CreateUpdateBuilder()
                    .Set(w => w.IsActive, false)
                    .Build();

                var result = await _workflowFactory.FindOneAndUpdateAsync(filter, update);
                if (result != null)
                {
                    operation.SuccessCount++;
                    _logger.LogDebug("工作流停用成功: WorkflowId={WorkflowId}", workflowId);
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

    /// <summary>
    /// 执行删除操作
    /// </summary>
    private async Task ExecuteDeleteOperationAsync(BulkOperation operation, CancellationToken cancellationToken)
    {
        foreach (var workflowId in operation.TargetWorkflowIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var filter = _workflowFactory.CreateFilterBuilder()
                    .Equal(w => w.Id, workflowId)
                    .Equal(w => w.IsDeleted, false)
                    .Build();

                var result = await _workflowFactory.FindOneAndSoftDeleteAsync(filter);
                if (result != null)
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

    /// <summary>
    /// 执行更新类别操作
    /// </summary>
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
                var filter = _workflowFactory.CreateFilterBuilder()
                    .Equal(w => w.Id, workflowId)
                    .Equal(w => w.IsDeleted, false)
                    .Build();

                var update = _workflowFactory.CreateUpdateBuilder()
                    .Set(w => w.Category, category)
                    .Build();

                var result = await _workflowFactory.FindOneAndUpdateAsync(filter, update);
                if (result != null)
                {
                    operation.SuccessCount++;
                    _logger.LogDebug("工作流类别更新成功: WorkflowId={WorkflowId}, Category={Category}", workflowId, category);
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

    /// <summary>
    /// 更新进度
    /// </summary>
    private async Task UpdateProgressAsync(BulkOperation operation)
    {
        var filter = _bulkOperationFactory.CreateFilterBuilder()
            .Equal(b => b.Id, operation.Id)
            .Build();

        var update = _bulkOperationFactory.CreateUpdateBuilder()
            .Set(b => b.ProcessedCount, operation.ProcessedCount)
            .Set(b => b.SuccessCount, operation.SuccessCount)
            .Set(b => b.FailureCount, operation.FailureCount)
            .Set(b => b.Errors, operation.Errors)
            .Build();

        await _bulkOperationFactory.FindOneAndUpdateAsync(filter, update);
    }

    #endregion
}