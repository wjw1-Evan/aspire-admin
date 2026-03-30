using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 批量更新任务状态请求DTO
/// </summary>
public class BatchUpdateTaskStatusRequest
{
    /// <summary>任务ID列表</summary>
    public List<string> TaskIds { get; set; } = new();

    /// <summary>新状态</summary>
    public int Status { get; set; }
}

/// <summary>
/// 更新任务进度请求DTO
/// </summary>
public class UpdateTaskProgressRequest
{
    /// <summary>进度百分比（0-100）</summary>
    public int Progress { get; set; }
}

/// <summary>
/// 添加任务依赖请求DTO
/// </summary>
public class AddTaskDependencyRequest
{
    /// <summary>前置任务ID</summary>
    public string PredecessorTaskId { get; set; } = string.Empty;

    /// <summary>后续任务ID</summary>
    public string SuccessorTaskId { get; set; } = string.Empty;

    /// <summary>依赖类型</summary>
    public int DependencyType { get; set; } = (int)TaskDependencyType.FinishToStart;

    /// <summary>延迟天数</summary>
    public int LagDays { get; set; } = 0;
}
