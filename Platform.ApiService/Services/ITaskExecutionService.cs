using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ITaskExecutionService
{
    Task<TaskDto> AssignTaskAsync(AssignTaskRequest request);
    Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request);
    Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request);
    Task<TaskDto> CancelTaskAsync(string taskId, string? remarks = null);
    Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress);
}
