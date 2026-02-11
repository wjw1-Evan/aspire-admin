using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Linq;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目管理服务实现
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IDataFactory<Project> _projectFactory;
    private readonly IDataFactory<ProjectMember> _projectMemberFactory;
    private readonly IDataFactory<WorkTask> _taskFactory;
    private readonly IDataFactory<Milestone> _milestoneFactory;
    private readonly IUserService _userService;

    /// <summary>
    /// 初始化 ProjectService 实例
    /// </summary>
    public ProjectService(
        IDataFactory<Project> projectFactory,
        IDataFactory<ProjectMember> projectMemberFactory,
        IDataFactory<WorkTask> taskFactory,
        IDataFactory<Milestone> milestoneFactory,
        IUserService userService)
    {
        _projectFactory = projectFactory;
        _projectMemberFactory = projectMemberFactory;
        _taskFactory = taskFactory;
        _milestoneFactory = milestoneFactory;
        _userService = userService;
    }

    /// <summary>
    /// 创建项目
    /// </summary>
    public async Task<ProjectDto> CreateProjectAsync(CreateProjectRequest request, string userId, string companyId)
    {
        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            Status = (ProjectStatus)request.Status,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            ManagerId = request.ManagerId,
            Budget = request.Budget,
            Priority = (ProjectPriority)request.Priority,
            CompanyId = companyId,
            Progress = 0
        };

        await _projectFactory.CreateAsync(project);

        // 如果指定了项目经理，自动添加为项目成员
        if (!string.IsNullOrEmpty(request.ManagerId))
        {
            var member = new ProjectMember
            {
                ProjectId = project.Id,
                UserId = request.ManagerId,
                Role = ProjectMemberRole.Manager,
                Allocation = 100,
                CompanyId = companyId
            };
            await _projectMemberFactory.CreateAsync(member);
        }

        return await ConvertToProjectDtoAsync(project);
    }

    /// <summary>
    /// 更新项目
    /// </summary>
    public async Task<ProjectDto> UpdateProjectAsync(UpdateProjectRequest request, string userId)
    {
        var updatedProject = await _projectFactory.UpdateAsync(request.ProjectId, p =>
        {
            if (!string.IsNullOrEmpty(request.Name))
                p.Name = request.Name;

            if (request.Description != null)
                p.Description = request.Description;

            if (request.Status.HasValue)
                p.Status = (ProjectStatus)request.Status.Value;

            if (request.StartDate.HasValue)
                p.StartDate = request.StartDate;

            if (request.EndDate.HasValue)
                p.EndDate = request.EndDate;

            if (request.ManagerId != null)
                p.ManagerId = request.ManagerId;

            if (request.Budget.HasValue)
                p.Budget = request.Budget;

            if (request.Priority.HasValue)
                p.Priority = (ProjectPriority)request.Priority.Value;
        });

        if (updatedProject == null)
            throw new KeyNotFoundException($"项目 {request.ProjectId} 不存在");

        return await ConvertToProjectDtoAsync(updatedProject);
    }

    /// <summary>
    /// 删除项目（软删除）
    /// </summary>
    public async Task<bool> DeleteProjectAsync(string projectId, string userId, string? reason = null)
    {
        var updated = await _projectFactory.UpdateAsync(projectId, p => p.IsDeleted = true);
        return updated != null;
    }

    /// <summary>
    /// 获取项目详情
    /// </summary>
    public async Task<ProjectDto?> GetProjectByIdAsync(string projectId)
    {
        var project = await _projectFactory.GetByIdAsync(projectId);
        if (project == null)
            return null;

        return await ConvertToProjectDtoAsync(project);
    }

    /// <summary>
    /// 分页获取项目列表
    /// </summary>
    public async Task<ProjectListResponse> GetProjectsListAsync(ProjectQueryRequest request, string companyId)
    {
        Expression<Func<Project, bool>> filter = p => p.CompanyId == companyId;

        // 搜索关键词
        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter = filter.And(p => (p.Name != null && p.Name.ToLower().Contains(search)) || (p.Description != null && p.Description.ToLower().Contains(search)));
        }

        // 状态过滤
        if (request.Status.HasValue)
        {
            var status = (ProjectStatus)request.Status.Value;
            filter = filter.And(p => p.Status == status);
        }

        // 优先级过滤
        if (request.Priority.HasValue)
        {
            var priority = (ProjectPriority)request.Priority.Value;
            filter = filter.And(p => p.Priority == priority);
        }

        // 项目经理过滤
        if (!string.IsNullOrEmpty(request.ManagerId))
        {
            filter = filter.And(p => p.ManagerId == request.ManagerId);
        }

        // 日期范围过滤
        if (request.StartDate.HasValue || request.EndDate.HasValue)
        {
            if (request.StartDate.HasValue)
            {
                var startDate = request.StartDate.Value.ToUniversalTime();
                filter = filter.And(p => p.CreatedAt >= startDate);
            }

            if (request.EndDate.HasValue)
            {
                var endDate = request.EndDate.Value.ToUniversalTime().Date.AddDays(1).AddMilliseconds(-1);
                filter = filter.And(p => p.CreatedAt <= endDate);
            }
        }

        // 排序
        Func<IQueryable<Project>, IOrderedQueryable<Project>> sortAction;
        var isAscending = (request.SortOrder ?? "desc").ToLower() == "asc";
        var sortBy = (request.SortBy ?? "CreatedAt").ToLower();

        sortAction = sortBy switch
        {
            "name" => isAscending ? (q => q.OrderBy(p => p.Name)) : (q => q.OrderByDescending(p => p.Name)),
            "status" => isAscending ? (q => q.OrderBy(p => p.Status)) : (q => q.OrderByDescending(p => p.Status)),
            "priority" => isAscending ? (q => q.OrderBy(p => p.Priority)) : (q => q.OrderByDescending(p => p.Priority)),
            "progress" => isAscending ? (q => q.OrderBy(p => p.Progress)) : (q => q.OrderByDescending(p => p.Progress)),
            "startdate" => isAscending ? (q => q.OrderBy(p => p.StartDate)) : (q => q.OrderByDescending(p => p.StartDate)),
            "enddate" => isAscending ? (q => q.OrderBy(p => p.EndDate)) : (q => q.OrderByDescending(p => p.EndDate)),
            _ => isAscending ? (q => q.OrderBy(p => p.CreatedAt)) : (q => q.OrderByDescending(p => p.CreatedAt)),
        };

        // 分页查询
        var (projects, total) = await _projectFactory.FindPagedAsync(
            filter,
            sortAction,
            request.Page,
            request.PageSize);

        var projectDtos = new List<ProjectDto>();
        foreach (var project in projects)
        {
            projectDtos.Add(await ConvertToProjectDtoAsync(project));
        }

        return new ProjectListResponse
        {
            Projects = projectDtos,
            Total = (int)total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    /// <summary>
    /// 获取项目统计信息
    /// </summary>
    public async Task<ProjectStatistics> GetProjectStatisticsAsync(string companyId)
    {
        var allProjects = await _projectFactory.FindAsync(p => p.CompanyId == companyId);

        var statistics = new ProjectStatistics
        {
            TotalProjects = allProjects.Count,
            InProgressProjects = allProjects.Count(p => p.Status == ProjectStatus.InProgress),
            CompletedProjects = allProjects.Count(p => p.Status == ProjectStatus.Completed),
            DelayedProjects = allProjects.Count(p =>
                p.Status == ProjectStatus.InProgress &&
                p.EndDate.HasValue &&
                p.EndDate.Value < DateTime.UtcNow)
        };

        // 按状态统计
        foreach (var status in Enum.GetValues<ProjectStatus>())
        {
            var count = allProjects.Count(p => p.Status == status);
            if (count > 0)
            {
                statistics.ProjectsByStatus[GetStatusName(status)] = count;
            }
        }

        // 按优先级统计
        foreach (var priority in Enum.GetValues<ProjectPriority>())
        {
            var count = allProjects.Count(p => p.Priority == priority);
            if (count > 0)
            {
                statistics.ProjectsByPriority[GetPriorityName(priority)] = count;
            }
        }

        return statistics;
    }

    /// <summary>
    /// 添加项目成员
    /// </summary>
    public async Task<ProjectMemberDto> AddProjectMemberAsync(AddProjectMemberRequest request, string userId, string companyId)
    {
        // 检查项目是否存在
        var project = await _projectFactory.GetByIdAsync(request.ProjectId);
        if (project == null)
            throw new KeyNotFoundException($"项目 {request.ProjectId} 不存在");

        // 检查成员是否已存在
        var exists = await _projectMemberFactory.ExistsAsync(m =>
            m.ProjectId == request.ProjectId && m.UserId == request.UserId);

        if (exists)
            throw new InvalidOperationException("该用户已经是项目成员");

        var member = new ProjectMember
        {
            ProjectId = request.ProjectId,
            UserId = request.UserId,
            Role = (ProjectMemberRole)request.Role,
            Allocation = request.Allocation,
            CompanyId = companyId
        };

        await _projectMemberFactory.CreateAsync(member);

        return await ConvertToProjectMemberDtoAsync(member);
    }

    /// <summary>
    /// 移除项目成员
    /// </summary>
    public async Task<bool> RemoveProjectMemberAsync(string projectId, string memberUserId, string userId)
    {
        var updated = await _projectMemberFactory.UpdateManyAsync(
            m => m.ProjectId == projectId && m.UserId == memberUserId,
            m => m.IsDeleted = true);
        return updated > 0;
    }

    /// <summary>
    /// 获取项目成员列表
    /// </summary>
    public async Task<List<ProjectMemberDto>> GetProjectMembersAsync(string projectId)
    {
        var members = await _projectMemberFactory.FindAsync(m => m.ProjectId == projectId);

        var memberDtos = new List<ProjectMemberDto>();
        foreach (var member in members)
        {
            memberDtos.Add(await ConvertToProjectMemberDtoAsync(member));
        }

        return memberDtos;
    }

    /// <summary>
    /// 自动计算项目进度（基于任务进度）
    /// </summary>
    public async Task<int> CalculateProjectProgressAsync(string projectId)
    {
        // 获取项目下的所有任务
        var tasks = await _taskFactory.FindAsync(t => t.ProjectId == projectId);

        if (tasks.Count == 0)
            return 0;

        // 只计算根任务（没有父任务的任务）的进度，避免重复计算
        var rootTasks = tasks.Where(t => string.IsNullOrEmpty(t.ParentTaskId)).ToList();

        int averageProgress;
        if (rootTasks.Count == 0)
        {
            // 如果没有根任务，计算所有任务的平均进度
            var totalProgress = tasks.Sum(t => t.CompletionPercentage);
            averageProgress = totalProgress / tasks.Count;
        }
        else
        {
            // 计算根任务的平均进度
            var rootTotalProgress = rootTasks.Sum(t => t.CompletionPercentage);
            averageProgress = rootTotalProgress / rootTasks.Count;
        }

        // 更新项目进度
        await _projectFactory.UpdateAsync(projectId, p => p.Progress = averageProgress);

        return averageProgress;
    }

    /// <summary>
    /// 转换项目实体为DTO
    /// </summary>
    private async Task<ProjectDto> ConvertToProjectDtoAsync(Project project)
    {
        var dto = new ProjectDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            Status = (int)project.Status,
            StatusName = GetStatusName(project.Status),
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            Progress = project.Progress,
            ManagerId = project.ManagerId,
            Budget = project.Budget,
            Priority = (int)project.Priority,
            PriorityName = GetPriorityName(project.Priority),
            CreatedAt = project.CreatedAt,
            CreatedBy = project.CreatedBy,
            UpdatedAt = project.UpdatedAt
        };

        // 获取项目经理信息
        // 注意：使用 GetUserByIdWithoutTenantFilterAsync 因为项目经理可能属于不同的企业
        if (!string.IsNullOrEmpty(project.ManagerId))
        {
            try
            {
                var manager = await _userService.GetUserByIdWithoutTenantFilterAsync(project.ManagerId);
                if (manager != null)
                {
                    // 显示格式：用户名 (昵称)，如果昵称为空则只显示用户名
                    dto.ManagerName = !string.IsNullOrWhiteSpace(manager.Name)
                        ? $"{manager.Username} ({manager.Name})"
                        : manager.Username;
                }
                else
                {
                    // 如果找不到用户，记录警告但不抛出异常
                    Console.WriteLine($"警告: 找不到项目经理，ManagerId={project.ManagerId}");
                    dto.ManagerName = null;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"获取项目经理信息失败，ManagerId={project.ManagerId}, 错误: {ex.Message}");
                dto.ManagerName = null;
            }
        }

        // 获取创建者信息
        // 注意：使用 GetUserByIdWithoutTenantFilterAsync 因为创建者可能属于不同的企业
        if (!string.IsNullOrEmpty(project.CreatedBy))
        {
            try
            {
                var creator = await _userService.GetUserByIdWithoutTenantFilterAsync(project.CreatedBy);
                if (creator != null)
                {
                    // 显示格式：用户名 (昵称)，如果昵称为空则只显示用户名
                    dto.CreatedByName = !string.IsNullOrWhiteSpace(creator.Name)
                        ? $"{creator.Username} ({creator.Name})"
                        : creator.Username;
                }
                else
                {
                    Console.WriteLine($"警告: 找不到创建者，CreatedBy={project.CreatedBy}");
                    dto.CreatedByName = null;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"获取创建者信息失败，CreatedBy={project.CreatedBy}, 错误: {ex.Message}");
                dto.CreatedByName = null;
            }
        }

        return dto;
    }

    /// <summary>
    /// 转换项目成员实体为DTO
    /// </summary>
    private async Task<ProjectMemberDto> ConvertToProjectMemberDtoAsync(ProjectMember member)
    {
        var dto = new ProjectMemberDto
        {
            Id = member.Id,
            ProjectId = member.ProjectId,
            UserId = member.UserId,
            Role = (int)member.Role,
            RoleName = GetRoleName(member.Role),
            Allocation = member.Allocation,
            CreatedAt = member.CreatedAt
        };

        // 获取用户信息
        try
        {
            var user = await _userService.GetUserByIdAsync(member.UserId);
            if (user != null)
            {
                dto.UserName = user.Username;
                dto.UserEmail = user.Email;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"获取用户信息失败: {ex.Message}");
        }

        return dto;
    }

    private static string GetStatusName(ProjectStatus status) => status switch
    {
        ProjectStatus.Planning => "规划中",
        ProjectStatus.InProgress => "进行中",
        ProjectStatus.OnHold => "暂停",
        ProjectStatus.Completed => "已完成",
        ProjectStatus.Cancelled => "已取消",
        _ => "未知"
    };

    private static string GetPriorityName(ProjectPriority priority) => priority switch
    {
        ProjectPriority.Low => "低",
        ProjectPriority.Medium => "中",
        ProjectPriority.High => "高",
        _ => "未知"
    };

    private static string GetRoleName(ProjectMemberRole role) => role switch
    {
        ProjectMemberRole.Manager => "项目经理",
        ProjectMemberRole.Member => "成员",
        ProjectMemberRole.Viewer => "查看者",
        _ => "未知"
    };
}
