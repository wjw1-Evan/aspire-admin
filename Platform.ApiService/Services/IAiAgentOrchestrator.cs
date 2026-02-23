namespace Platform.ApiService.Services;

/// <summary>
/// AI 智能体编排引擎接口
/// </summary>
public interface IAiAgentOrchestrator
{
    /// <summary>
    /// 执行一个智能体任务运行
    /// </summary>
    /// <param name="runId">执行记录 ID</param>
    /// <param name="userId">用户 ID</param>
    /// <param name="sessionId">关联的聊天会话 ID (可选)</param>
    /// <returns>异步任务</returns>
    Task ExecuteRunAsync(string runId, string userId, string? sessionId = null);
}
