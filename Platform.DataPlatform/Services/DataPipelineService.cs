using MongoDB.Driver;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Connectors;
using Platform.ServiceDefaults.Services;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 数据管道服务实现
/// </summary>
public class DataPipelineService : BaseService, IDataPipelineService
{
    private readonly IMongoCollection<DataPipeline> _pipelines;
    private readonly IMongoCollection<PipelineExecutionResult> _executions;
    private readonly IDataConnectorFactory _connectorFactory;

    public DataPipelineService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<DataPipelineService> logger,
        IDataConnectorFactory connectorFactory)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _pipelines = database.GetCollection<DataPipeline>("pipelines");
        _executions = database.GetCollection<PipelineExecutionResult>("pipelineExecutions");
        _connectorFactory = connectorFactory;
    }

    public async Task<List<DataPipeline>> GetAllAsync()
    {
        var companyId = GetRequiredCompanyId();
        var filter = Builders<DataPipeline>.Filter.And(
            Builders<DataPipeline>.Filter.Eq(p => p.CompanyId, companyId),
            Builders<DataPipeline>.Filter.Eq(p => p.IsDeleted, false)
        );

        return await _pipelines.Find(filter).ToListAsync();
    }

    public async Task<DataPipeline?> GetByIdAsync(string id)
    {
        var companyId = GetRequiredCompanyId();
        var filter = Builders<DataPipeline>.Filter.And(
            Builders<DataPipeline>.Filter.Eq(p => p.Id, id),
            Builders<DataPipeline>.Filter.Eq(p => p.CompanyId, companyId),
            Builders<DataPipeline>.Filter.Eq(p => p.IsDeleted, false)
        );

        return await _pipelines.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<DataPipeline> CreateAsync(CreateDataPipelineRequest request)
    {
        var pipeline = new DataPipeline
        {
            Name = request.Name,
            Title = request.Title,
            Description = request.Description,
            SourceDataSourceId = request.SourceDataSourceId,
            TargetDataSourceId = request.TargetDataSourceId,
            SourceTable = request.SourceTable,
            TargetTable = request.TargetTable,
            ScheduleStrategy = request.ScheduleStrategy,
            CronExpression = request.CronExpression,
            TransformRules = request.TransformRules,
            QualityRuleIds = request.QualityRuleIds,
            Tags = request.Tags,
            Metadata = request.Metadata,
            CompanyId = GetRequiredCompanyId(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _pipelines.InsertOneAsync(pipeline);
        return pipeline;
    }

    public async Task<bool> UpdateAsync(string id, UpdateDataPipelineRequest request)
    {
        var filter = Builders<DataPipeline>.Filter.And(
            Builders<DataPipeline>.Filter.Eq(p => p.Id, id),
            Builders<DataPipeline>.Filter.Eq(p => p.CompanyId, GetRequiredCompanyId()),
            Builders<DataPipeline>.Filter.Eq(p => p.IsDeleted, false)
        );

        var update = Builders<DataPipeline>.Update
            .Set(p => p.Name, request.Name)
            .Set(p => p.Title, request.Title)
            .Set(p => p.Description, request.Description)
            .Set(p => p.SourceDataSourceId, request.SourceDataSourceId)
            .Set(p => p.TargetDataSourceId, request.TargetDataSourceId)
            .Set(p => p.SourceTable, request.SourceTable)
            .Set(p => p.TargetTable, request.TargetTable)
            .Set(p => p.ScheduleStrategy, request.ScheduleStrategy)
            .Set(p => p.CronExpression, request.CronExpression)
            .Set(p => p.TransformRules, request.TransformRules)
            .Set(p => p.QualityRuleIds, request.QualityRuleIds)
            .Set(p => p.Tags, request.Tags)
            .Set(p => p.Metadata, request.Metadata)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        var result = await _pipelines.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var filter = Builders<DataPipeline>.Filter.And(
            Builders<DataPipeline>.Filter.Eq(p => p.Id, id),
            Builders<DataPipeline>.Filter.Eq(p => p.CompanyId, GetRequiredCompanyId()),
            Builders<DataPipeline>.Filter.Eq(p => p.IsDeleted, false)
        );

        var update = Builders<DataPipeline>.Update
            .Set(p => p.IsDeleted, true)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        var result = await _pipelines.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<PipelineExecutionResult> ExecuteAsync(string pipelineId, ExecutePipelineRequest? request = null)
    {
        var pipeline = await GetByIdAsync(pipelineId);
        if (pipeline == null)
        {
            throw new KeyNotFoundException($"数据管道 {pipelineId} 不存在");
        }

        if (!pipeline.IsEnabled)
        {
            throw new InvalidOperationException("管道未启用");
        }

        var executionId = Guid.NewGuid().ToString();
        var executionResult = new PipelineExecutionResult
        {
            PipelineId = pipelineId,
            ExecutionId = executionId,
            StartTime = DateTime.UtcNow
        };

        try
        {
            // 更新管道状态为运行中
            await UpdatePipelineStatusAsync(pipelineId, PipelineStatus.Running);

            // 执行数据管道逻辑
            var result = await ExecutePipelineLogicAsync(pipeline);
            
            executionResult.IsSuccess = result.IsSuccess;
            executionResult.ErrorMessage = result.ErrorMessage;
            executionResult.RecordsProcessed = result.RecordsProcessed;
            executionResult.RecordsFailed = result.RecordsFailed;
            executionResult.Metadata = result.Metadata;

            // 更新管道统计信息
            await UpdatePipelineStatisticsAsync(pipelineId, executionResult);

            // 更新管道状态
            var newStatus = executionResult.IsSuccess ? PipelineStatus.Active : PipelineStatus.Error;
            await UpdatePipelineStatusAsync(pipelineId, newStatus, executionResult.ErrorMessage);

        }
        catch (Exception ex)
        {
            executionResult.IsSuccess = false;
            executionResult.ErrorMessage = ex.Message;
            
            await UpdatePipelineStatusAsync(pipelineId, PipelineStatus.Error, ex.Message);
        }
        finally
        {
            executionResult.EndTime = DateTime.UtcNow;
            
            // 保存执行结果
            await _executions.InsertOneAsync(executionResult);
        }

        return executionResult;
    }

    public async Task<bool> PauseAsync(string id)
    {
        return await UpdatePipelineStatusAsync(id, PipelineStatus.Paused);
    }

    public async Task<bool> ResumeAsync(string id)
    {
        return await UpdatePipelineStatusAsync(id, PipelineStatus.Active);
    }

    public async Task<List<PipelineExecutionResult>> GetExecutionHistoryAsync(string pipelineId, int limit = 10)
    {
        var filter = Builders<PipelineExecutionResult>.Filter.Eq(e => e.PipelineId, pipelineId);
        var sort = Builders<PipelineExecutionResult>.Sort.Descending(e => e.StartTime);

        return await _executions.Find(filter)
            .Sort(sort)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<Dictionary<string, object>> GetStatisticsAsync(string pipelineId)
    {
        var pipeline = await GetByIdAsync(pipelineId);
        if (pipeline == null)
        {
            throw new KeyNotFoundException($"数据管道 {pipelineId} 不存在");
        }

        var executionFilter = Builders<PipelineExecutionResult>.Filter.Eq(e => e.PipelineId, pipelineId);
        var totalExecutions = await _executions.CountDocumentsAsync(executionFilter);

        var successFilter = Builders<PipelineExecutionResult>.Filter.And(
            executionFilter,
            Builders<PipelineExecutionResult>.Filter.Eq(e => e.IsSuccess, true)
        );
        var successfulExecutions = await _executions.CountDocumentsAsync(successFilter);

        var successRate = totalExecutions > 0 ? (double)successfulExecutions / totalExecutions * 100 : 0;

        var lastExecution = await _executions.Find(executionFilter)
            .Sort(Builders<PipelineExecutionResult>.Sort.Descending(e => e.StartTime))
            .FirstOrDefaultAsync();

        return new Dictionary<string, object>
        {
            ["totalExecutions"] = totalExecutions,
            ["successfulExecutions"] = successfulExecutions,
            ["failedExecutions"] = totalExecutions - successfulExecutions,
            ["successRate"] = Math.Round(successRate, 2),
            ["executionCount"] = pipeline.ExecutionCount,
            ["averageExecutionTime"] = pipeline.AverageExecutionTime,
            ["lastExecutedAt"] = pipeline.LastExecutedAt,
            ["lastExecutionResult"] = lastExecution
        };
    }

    public async Task<bool> ValidateConfigurationAsync(CreateDataPipelineRequest request)
    {
        try
        {
            // 验证源数据源和目标数据源
            // 这里可以添加更详细的验证逻辑
            return !string.IsNullOrEmpty(request.SourceDataSourceId) &&
                   !string.IsNullOrEmpty(request.TargetDataSourceId) &&
                   !string.IsNullOrEmpty(request.SourceTable) &&
                   !string.IsNullOrEmpty(request.TargetTable);
        }
        catch
        {
            return false;
        }
    }

    private async Task<bool> UpdatePipelineStatusAsync(string id, PipelineStatus status, string? errorMessage = null)
    {
        var filter = Builders<DataPipeline>.Filter.And(
            Builders<DataPipeline>.Filter.Eq(p => p.Id, id),
            Builders<DataPipeline>.Filter.Eq(p => p.CompanyId, GetRequiredCompanyId())
        );

        var update = Builders<DataPipeline>.Update
            .Set(p => p.Status, status)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        if (errorMessage != null)
        {
            update = update.Set(p => p.LastErrorMessage, errorMessage);
        }

        var result = await _pipelines.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    private async Task UpdatePipelineStatisticsAsync(string pipelineId, PipelineExecutionResult executionResult)
    {
        var filter = Builders<DataPipeline>.Filter.And(
            Builders<DataPipeline>.Filter.Eq(p => p.Id, pipelineId),
            Builders<DataPipeline>.Filter.Eq(p => p.CompanyId, GetRequiredCompanyId())
        );

        var update = Builders<DataPipeline>.Update
            .Inc(p => p.ExecutionCount, 1)
            .Set(p => p.LastExecutedAt, executionResult.StartTime)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        // 计算平均执行时间
        if (executionResult.Duration.HasValue)
        {
            var pipeline = await GetByIdAsync(pipelineId);
            if (pipeline != null)
            {
                var newAverageTime = CalculateAverageExecutionTime(pipeline.AverageExecutionTime, executionResult.Duration.Value, pipeline.ExecutionCount);
                update = update.Set(p => p.AverageExecutionTime, newAverageTime);
            }
        }

        await _pipelines.UpdateOneAsync(filter, update);
    }

    private TimeSpan CalculateAverageExecutionTime(TimeSpan? currentAverage, TimeSpan newDuration, long executionCount)
    {
        if (!currentAverage.HasValue || executionCount <= 1)
        {
            return newDuration;
        }

        // 使用加权平均计算新的平均执行时间
        var totalTime = currentAverage.Value.TotalMilliseconds * (executionCount - 1) + newDuration.TotalMilliseconds;
        return TimeSpan.FromMilliseconds(totalTime / executionCount);
    }

    private async Task<PipelineExecutionResult> ExecutePipelineLogicAsync(DataPipeline pipeline)
    {
        var result = new PipelineExecutionResult
        {
            PipelineId = pipeline.Id,
            IsSuccess = false,
            RecordsProcessed = 0,
            RecordsFailed = 0,
            Metadata = new Dictionary<string, object>()
        };

        try
        {
            // 获取源数据源连接器
            // 这里需要根据实际的数据源类型创建连接器
            // 暂时使用简化的实现
            
            // 模拟数据管道执行
            await Task.Delay(1000); // 模拟处理时间
            
            result.IsSuccess = true;
            result.RecordsProcessed = 100; // 模拟处理了100条记录
            result.Metadata["executionTime"] = "1000ms";
            result.Metadata["recordsPerSecond"] = 100;

        }
        catch (Exception ex)
        {
            result.IsSuccess = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }
}