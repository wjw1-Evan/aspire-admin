using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ITaskDependencyService
{
    Task<string> AddTaskDependencyAsync(string predecessorTaskId, string successorTaskId, int dependencyType, int lagDays);
    Task<bool> RemoveTaskDependencyAsync(string dependencyId);
    Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId);
    Task<List<string>> CalculateCriticalPathAsync(string projectId);
}
