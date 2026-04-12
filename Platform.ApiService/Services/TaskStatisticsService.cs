using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskExecutionResult = Platform.ApiService.Models.TaskExecutionResult;

namespace Platform.ApiService.Services;

public class TaskStatisticsService : ITaskStatisticsService
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly ILogger<TaskStatisticsService> _logger;

    public TaskStatisticsService(DbContext context, IUserService userService, ILogger<TaskStatisticsService> logger)
    {
        _context = context;
        _userService = userService;
        _logger = logger;
    }

    public async Task<TaskStatistics> GetTaskStatisticsAsync(string? userId = null)
    {
        var q = _context.Set<WorkTask>().AsQueryable();
        if (!string.IsNullOrEmpty(userId))
            q = q.Where(t => t.AssignedTo == userId || t.CreatedBy == userId);

        var tasks = await q.ToListAsync();

        var stats = new TaskStatistics
        {
            TotalTasks = tasks.Count,
            PendingTasks = tasks.Count(t => t.Status == Models.TaskStatus.Pending),
            InProgressTasks = tasks.Count(t => t.Status == Models.TaskStatus.InProgress),
            CompletedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Completed),
            FailedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Failed),
        };

        var completed = tasks.Where(t => t.Status == Models.TaskStatus.Completed && t.ActualDuration.HasValue).ToList();
        if (completed.Count > 0) stats.AverageCompletionTime = completed.Average(t => t.ActualDuration!.Value);
        if (stats.TotalTasks > 0) stats.CompletionRate = (double)stats.CompletedTasks / stats.TotalTasks * 100;

        stats.TasksByPriority = new Dictionary<string, int>
        {
            { "Low", tasks.Count(t => t.Priority == TaskPriority.Low) },
            { "Medium", tasks.Count(t => t.Priority == TaskPriority.Medium) },
            { "High", tasks.Count(t => t.Priority == TaskPriority.High) },
            { "Urgent", tasks.Count(t => t.Priority == TaskPriority.Urgent) }
        };

        stats.TasksByStatus = Enum.GetValues<Models.TaskStatus>().ToDictionary(s => s.ToString(), s => tasks.Count(t => t.Status == s));
        return stats;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<TaskExecutionLogDto>> GetTaskExecutionLogsAsync(string taskId, PageParams request)
    {
        var logs = await _context.Set<TaskExecutionLog>()
            .Where(log => log.TaskId == taskId)
            .OrderByDescending(log => log.CreatedAt)
            .ToListAsync();

        var dtos = logs.Select(log => new TaskExecutionLogDto
        {
            Id = log.Id,
            TaskId = log.TaskId,
            ExecutedBy = log.ExecutedBy,
            StartTime = log.StartTime,
            EndTime = log.EndTime,
            Status = (int)log.Status,
            Message = log.Message,
            ErrorMessage = log.ErrorMessage,
            ProgressPercentage = log.ProgressPercentage
        }).ToList();

        var total = dtos.Count;
        var skip = (request.Page - 1) * request.PageSize;
        var paged = dtos.Skip(skip).Take(request.PageSize).ToList();

        return new System.Linq.Dynamic.Core.PagedResult<TaskExecutionLogDto>
        {
            Queryable = paged.AsQueryable(),
            PageCount = (int)Math.Ceiling(total / (double)request.PageSize),
            CurrentPage = request.Page,
            PageSize = request.PageSize,
            RowCount = total
        };
    }

    public async Task<TaskExecutionLogDto> LogTaskExecutionAsync(string taskId, TaskExecutionResult status, string? message = null, int progressPercentage = 0)
    {
        var log = new TaskExecutionLog
        {
            TaskId = taskId,
            StartTime = DateTime.UtcNow,
            Status = status,
            Message = message,
            ProgressPercentage = progressPercentage
        };
        await _context.Set<TaskExecutionLog>().AddAsync(log);
        await _context.SaveChangesAsync();

        return new TaskExecutionLogDto
        {
            Id = log.Id,
            TaskId = log.TaskId,
            ExecutedBy = log.ExecutedBy,
            StartTime = log.StartTime,
            EndTime = log.EndTime,
            Status = (int)log.Status,
            Message = log.Message,
            ErrorMessage = log.ErrorMessage,
            ProgressPercentage = log.ProgressPercentage
        };
    }
}
