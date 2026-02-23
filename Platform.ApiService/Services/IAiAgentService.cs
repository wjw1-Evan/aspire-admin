using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// AI 智能体服务接口
/// </summary>
public interface IAiAgentService
{
    /// <summary>
    /// 创建智能体
    /// </summary>
    Task<AiAgent> CreateAgentAsync(AiAgent agent);

    /// <summary>
    /// 获取智能体详情
    /// </summary>
    Task<AiAgent?> GetAgentByIdAsync(string id);

    /// <summary>
    /// 获取所有智能体
    /// </summary>
    Task<List<AiAgent>> GetAgentsAsync();

    /// <summary>
    /// 更新智能体
    /// </summary>
    Task<AiAgent> UpdateAgentAsync(AiAgent agent);

    /// <summary>
    /// 删除智能体
    /// </summary>
    Task<bool> DeleteAgentAsync(string id);

    /// <summary>
    /// 创建执行运行记录
    /// </summary>
    Task<AiAgentRun> CreateRunAsync(string agentId, string goal);

    /// <summary>
    /// 获取执行详情
    /// </summary>
    Task<AiAgentRun?> GetRunByIdAsync(string id);

    /// <summary>
    /// 获取智能体的执行历史
    /// </summary>
    Task<List<AiAgentRun>> GetAgentRunsAsync(string agentId);

    /// <summary>
    /// 开始一个智能体运行
    /// </summary>
    /// <param name="runId">执行记录 ID</param>
    /// <param name="sessionId">关联的会话 ID (可选)</param>
    /// <returns>异步任务</returns>
    Task StartAgentRunAsync(string runId, string? sessionId = null);

    /// <summary>
    /// 初始化预置智能体 (项目管家、物联专家、资产助手)
    /// </summary>
    Task InitializeSeedAgentsAsync();
}
