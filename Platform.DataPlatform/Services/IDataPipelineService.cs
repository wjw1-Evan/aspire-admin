using Platform.DataPlatform.Models;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 数据管道服务接口
/// </summary>
public interface IDataPipelineService
{
    /// <summary>
    /// 获取数据管道列表
    /// </summary>
    Task<List<DataPipeline>> GetAllAsync();

    /// <summary>
    /// 根据ID获取数据管道
    /// </summary>
    Task<DataPipeline?> GetByIdAsync(string id);

    /// <summary>
    /// 创建数据管道
    /// </summary>
    Task<DataPipeline> CreateAsync(CreateDataPipelineRequest request);

    /// <summary>
    /// 更新数据管道
    /// </summary>
    Task<bool> UpdateAsync(string id, UpdateDataPipelineRequest request);

    /// <summary>
    /// 删除数据管道
    /// </summary>
    Task<bool> DeleteAsync(string id);

    /// <summary>
    /// 执行数据管道
    /// </summary>
    Task<PipelineExecutionResult> ExecuteAsync(string pipelineId, ExecutePipelineRequest? request = null);

    /// <summary>
    /// 暂停数据管道
    /// </summary>
    Task<bool> PauseAsync(string id);

    /// <summary>
    /// 恢复数据管道
    /// </summary>
    Task<bool> ResumeAsync(string id);

    /// <summary>
    /// 获取管道执行历史
    /// </summary>
    Task<List<PipelineExecutionResult>> GetExecutionHistoryAsync(string pipelineId, int limit = 10);

    /// <summary>
    /// 获取管道统计信息
    /// </summary>
    Task<Dictionary<string, object>> GetStatisticsAsync(string pipelineId);

    /// <summary>
    /// 验证管道配置
    /// </summary>
    Task<bool> ValidateConfigurationAsync(CreateDataPipelineRequest request);
}
