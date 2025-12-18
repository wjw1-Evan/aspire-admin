using Platform.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 任务管理服务接口
/// </summary>
public interface ITaskService
{
    /// <summary>
    /// 创建任务
    /// </summary>
    /// <param name="request">创建任务请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>创建的任务</returns>
    Task<TaskDto> CreateTaskAsync(CreateTaskRequest request, string userId, string companyId);

    /// <summary>
    /// 获取任务详情
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <returns>任务详情</returns>
    Task<TaskDto?> GetTaskByIdAsync(string taskId);

    /// <summary>
    /// 查询任务列表
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>任务列表</returns>
    Task<TaskListResponse> QueryTasksAsync(TaskQueryRequest request, string companyId);

    /// <summary>
    /// 更新任务
    /// </summary>
    /// <param name="request">更新请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>更新后的任务</returns>
    Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId);

    /// <summary>
    /// 分配任务
    /// </summary>
    /// <param name="request">分配请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>分配后的任务</returns>
    Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId);

    /// <summary>
    /// 执行任务
    /// </summary>
    /// <param name="request">执行请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>执行后的任务</returns>
    Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request, string userId);

    /// <summary>
    /// 完成任务
    /// </summary>
    /// <param name="request">完成请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>完成后的任务</returns>
    Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request, string userId);

    /// <summary>
    /// 取消任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="userId">当前用户ID</param>
    /// <param name="remarks">取消备注</param>
    /// <returns>取消后的任务</returns>
    Task<TaskDto> CancelTaskAsync(string taskId, string userId, string? remarks = null);

    /// <summary>
    /// 删除任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>是否删除成功</returns>
    Task<bool> DeleteTaskAsync(string taskId, string userId);

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="userId">用户ID（可选，用于获取用户相关的统计）</param>
    /// <returns>统计信息</returns>
    Task<TaskStatistics> GetTaskStatisticsAsync(string companyId, string? userId = null);

    /// <summary>
    /// 获取任务执行日志
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>执行日志列表</returns>
    Task<(List<TaskExecutionLogDto> logs, int total)> GetTaskExecutionLogsAsync(string taskId, int page = 1, int pageSize = 10);

    /// <summary>
    /// 记录任务执行日志
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="userId">执行者ID</param>
    /// <param name="status">执行状态</param>
    /// <param name="message">执行消息</param>
    /// <param name="progressPercentage">进度百分比</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>记录的日志</returns>
    Task<TaskExecutionLogDto> LogTaskExecutionAsync(
        string taskId,
        string userId,
        TaskExecutionResult status,
        string? message = null,
        int progressPercentage = 0,
        string? companyId = null);

    /// <summary>
    /// 获取用户的待办任务
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>待办任务列表</returns>
    Task<List<TaskDto>> GetUserTodoTasksAsync(string userId, string companyId);

    /// <summary>
    /// 获取用户创建的任务
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>创建的任务列表</returns>
    Task<(List<TaskDto> tasks, int total)> GetUserCreatedTasksAsync(string userId, string companyId, int page = 1, int pageSize = 10);

    /// <summary>
    /// 批量更新任务状态
    /// </summary>
    /// <param name="taskIds">任务ID列表</param>
    /// <param name="status">新状态</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>更新的任务数量</returns>
    Task<int> BatchUpdateTaskStatusAsync(List<string> taskIds, Models.TaskStatus status, string userId);

    /// <summary>
    /// 获取项目下的所有任务（树形结构）
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <returns>任务树列表</returns>
    Task<List<TaskDto>> GetTasksByProjectIdAsync(string projectId);

    /// <summary>
    /// 获取任务树（支持按项目过滤）
    /// </summary>
    /// <param name="projectId">项目ID（可选）</param>
    /// <returns>任务树列表</returns>
    Task<List<TaskDto>> GetTaskTreeAsync(string? projectId = null);

    /// <summary>
    /// 添加任务依赖
    /// </summary>
    /// <param name="predecessorTaskId">前置任务ID</param>
    /// <param name="successorTaskId">后续任务ID</param>
    /// <param name="dependencyType">依赖类型</param>
    /// <param name="lagDays">延迟天数</param>
    /// <param name="userId">当前用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>任务依赖ID</returns>
    Task<string> AddTaskDependencyAsync(string predecessorTaskId, string successorTaskId, int dependencyType, int lagDays, string userId, string companyId);

    /// <summary>
    /// 移除任务依赖
    /// </summary>
    /// <param name="dependencyId">依赖ID</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>是否移除成功</returns>
    Task<bool> RemoveTaskDependencyAsync(string dependencyId, string userId);

    /// <summary>
    /// 获取任务依赖关系
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <returns>依赖关系列表</returns>
    Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId);

    /// <summary>
    /// 计算关键路径
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <returns>关键路径任务ID列表</returns>
    Task<List<string>> CalculateCriticalPathAsync(string projectId);

    /// <summary>
    /// 更新任务进度（同时更新项目进度）
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="progress">进度百分比</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>更新后的任务</returns>
    Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress, string userId);
}

