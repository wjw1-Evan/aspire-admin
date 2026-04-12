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
