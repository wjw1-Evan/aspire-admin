using Platform.ApiService.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class TaskService : ITaskService
{
    private readonly ITaskCrudService _crudService;
    private readonly ITaskExecutionService _executionService;
    private readonly ITaskRelationService _relationService;
    private readonly ITaskStatisticsService _statisticsService;

    public TaskService(
        ITaskCrudService crudService,
        ITaskExecutionService executionService,
        ITaskRelationService relationService,
        ITaskStatisticsService statisticsService)
    {
        _crudService = crudService;
        _executionService = executionService;
        _relationService = relationService;
        _statisticsService = statisticsService;
    }

    public Task<TaskDto> CreateTaskAsync(CreateTaskRequest request) => _crudService.CreateTaskAsync(request);
    public Task<TaskDto?> GetTaskByIdAsync(string taskId) => _crudService.GetTaskByIdAsync(taskId);
    public Task<System.Linq.Dynamic.Core.PagedResult<TaskDto>> QueryTasksAsync(ServiceDefaults.Models.ProTableRequest request) => _crudService.QueryTasksAsync(request);
    public Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId) => _crudService.UpdateTaskAsync(request, userId);
    public Task<bool> DeleteTaskAsync(string taskId, string userId) => _crudService.DeleteTaskAsync(taskId, userId);
    public Task<int> BatchUpdateTaskStatusAsync(List<string> taskIds, Models.TaskStatus status) => _crudService.BatchUpdateTaskStatusAsync(taskIds, status);
    public Task<List<TaskDto>> GetUserTodoTasksAsync(string userId) => _crudService.GetUserTodoTasksAsync(userId);
    public Task<System.Linq.Dynamic.Core.PagedResult<TaskDto>> GetUserCreatedTasksAsync(string userId, ServiceDefaults.Models.ProTableRequest request) => _crudService.GetUserCreatedTasksAsync(userId, request);

    public Task<TaskDto> AssignTaskAsync(AssignTaskRequest request) => _executionService.AssignTaskAsync(request);
    public Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request) => _executionService.ExecuteTaskAsync(request);
    public Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request) => _executionService.CompleteTaskAsync(request);
    public Task<TaskDto> CancelTaskAsync(string taskId, string? remarks = null) => _executionService.CancelTaskAsync(taskId, remarks);
    public Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress) => _executionService.UpdateTaskProgressAsync(taskId, progress);

    public Task<string> AddTaskDependencyAsync(string predecessorTaskId, string successorTaskId, int dependencyType, int lagDays) =>
        _relationService.AddTaskDependencyAsync(predecessorTaskId, successorTaskId, dependencyType, lagDays);
    public Task<bool> RemoveTaskDependencyAsync(string dependencyId) => _relationService.RemoveTaskDependencyAsync(dependencyId);
    public Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId) => _relationService.GetTaskDependenciesAsync(taskId);
    public Task<List<string>> CalculateCriticalPathAsync(string projectId) => _relationService.CalculateCriticalPathAsync(projectId);

    public Task<TaskStatistics> GetTaskStatisticsAsync(string? userId = null) => _statisticsService.GetTaskStatisticsAsync(userId);
    public Task<System.Linq.Dynamic.Core.PagedResult<TaskExecutionLogDto>> GetTaskExecutionLogsAsync(string taskId, ServiceDefaults.Models.ProTableRequest request) =>
        _statisticsService.GetTaskExecutionLogsAsync(taskId, request);
    public Task<TaskExecutionLogDto> LogTaskExecutionAsync(string taskId, TaskExecutionResult status, string? message = null, int progressPercentage = 0) =>
        _statisticsService.LogTaskExecutionAsync(taskId, status, message, progressPercentage);

    public async Task<List<TaskDto>> GetTasksByProjectIdAsync(string projectId)
    {
        var all = await _crudService.QueryTasksAsync(new ServiceDefaults.Models.ProTableRequest { Page = 1, PageSize = int.MaxValue });
        var projectTasks = all.Queryable.Where(t => t.ProjectId == projectId).ToList();
        return BuildTaskTree(projectTasks);
    }

    public async Task<List<TaskDto>> GetTaskTreeAsync(string? projectId = null)
    {
        var all = await _crudService.QueryTasksAsync(new ServiceDefaults.Models.ProTableRequest { Page = 1, PageSize = int.MaxValue });
        var tasks = string.IsNullOrEmpty(projectId)
            ? all.Queryable.ToList()
            : all.Queryable.Where(t => t.ProjectId == projectId).ToList();
        return BuildTaskTree(tasks);
    }

    private List<TaskDto> BuildTaskTree(List<TaskDto> all)
    {
        var map = all.ToDictionary(t => t.Id!);
        var roots = new List<TaskDto>();
        foreach (var t in all)
        {
            if (string.IsNullOrEmpty(t.ParentTaskId) || !map.ContainsKey(t.ParentTaskId))
                roots.Add(t);
            else
            {
                var p = map[t.ParentTaskId];
                p.Children ??= new List<TaskDto>();
                p.Children.Add(t);
            }
        }
        foreach (var t in all) if (t.Children != null) t.Children = t.Children.OrderBy(c => c.SortOrder).ToList();
        return roots.OrderBy(t => t.SortOrder).ToList();
    }
}
