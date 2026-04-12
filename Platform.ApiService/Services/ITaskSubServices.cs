using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ITaskCrudService
{
    Task<TaskDto> CreateTaskAsync(CreateTaskRequest request);
    Task<TaskDto?> GetTaskByIdAsync(string taskId);
    Task<System.Linq.Dynamic.Core.PagedResult<TaskDto>> QueryTasksAsync(Platform.ServiceDefaults.Models.PageParams request);
    Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId);
    Task<bool> DeleteTaskAsync(string taskId, string userId);
    Task<int> BatchUpdateTaskStatusAsync(List<string> taskIds, Models.TaskStatus status);
    Task<List<TaskDto>> GetUserTodoTasksAsync(string userId);
    Task<System.Linq.Dynamic.Core.PagedResult<TaskDto>> GetUserCreatedTasksAsync(string userId, Platform.ServiceDefaults.Models.PageParams request);
}

public interface ITaskExecutionService
{
    Task<TaskDto> AssignTaskAsync(AssignTaskRequest request);
    Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request);
    Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request);
    Task<TaskDto> CancelTaskAsync(string taskId, string? remarks = null);
    Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress);
}

public interface ITaskDependencyService
{
    Task<string> AddTaskDependencyAsync(string predecessorTaskId, string successorTaskId, int dependencyType, int lagDays);
    Task<bool> RemoveTaskDependencyAsync(string dependencyId);
    Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId);
    Task<List<string>> CalculateCriticalPathAsync(string projectId);
}

public interface ITaskStatisticsService
{
    Task<TaskStatistics> GetTaskStatisticsAsync(string? userId = null);
    Task<System.Linq.Dynamic.Core.PagedResult<TaskExecutionLogDto>> GetTaskExecutionLogsAsync(string taskId, Platform.ServiceDefaults.Models.PageParams request);
    Task<TaskExecutionLogDto> LogTaskExecutionAsync(string taskId, TaskExecutionResult status, string? message = null, int progressPercentage = 0);
}
