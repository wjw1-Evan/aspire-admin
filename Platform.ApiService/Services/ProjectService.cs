using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目管理服务实现
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IDatabaseOperationFactory<Project> _projectFactory;
    private readonly IDatabaseOperationFactory<ProjectMember> _projectMemberFactory;
    private readonly IDatabaseOperationFactory<WorkTask> _taskFactory;
    private readonly IDatabaseOperationFactory<Milestone> _milestoneFactory;
    private readonly IUserService _userService;

    /// <summary>
    /// 初始化 ProjectService 实例
    /// </summary>
    public ProjectService(
        IDatabaseOperationFactory<Project> projectFactory,
        IDatabaseOperationFactory<ProjectMember> projectMemberFactory,
        IDatabaseOperationFactory<WorkTask> taskFactory,
        IDatabaseOperationFactory<Milestone> milestoneFactory,
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
        var project = await _projectFactory.GetByIdAsync(request.ProjectId);
        if (project == null)
            throw new KeyNotFoundException($"项目 {request.ProjectId} 不存在");

        var updateBuilder = _projectFactory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(p => p.Name, request.Name);

        if (request.Description != null)
            updateBuilder.Set(p => p.Description, request.Description);

        if (request.Status.HasValue)
            updateBuilder.Set(p => p.Status, (ProjectStatus)request.Status.Value);

        if (request.StartDate.HasValue)
            updateBuilder.Set(p => p.StartDate, request.StartDate);

        if (request.EndDate.HasValue)
            updateBuilder.Set(p => p.EndDate, request.EndDate);

        if (request.ManagerId != null)
            updateBuilder.Set(p => p.ManagerId, request.ManagerId);

        if (request.Budget.HasValue)
            updateBuilder.Set(p => p.Budget, request.Budget);

        if (request.Priority.HasValue)
            updateBuilder.Set(p => p.Priority, (ProjectPriority)request.Priority.Value);

        var filter = _projectFactory.CreateFilterBuilder()
            .Equal(p => p.Id, request.ProjectId)
            .Build();

        var updatedProject = await _projectFactory.FindOneAndUpdateAsync(
            filter,
            updateBuilder.Build(),
            new FindOneAndUpdateOptions<Project> { ReturnDocument = ReturnDocument.After });

        if (updatedProject == null)
            throw new KeyNotFoundException($"项目 {request.ProjectId} 不存在");

        return await ConvertToProjectDtoAsync(updatedProject);
    }

    /// <summary>
    /// 删除项目（软删除）
    /// </summary>
    public async Task<bool> DeleteProjectAsync(string projectId, string userId, string? reason = null)
    {
        var project = await _projectFactory.GetByIdAsync(projectId);
        if (project == null)
            return false;

        var result = await _projectFactory.FindOneAndSoftDeleteAsync(
            _projectFactory.CreateFilterBuilder().Equal(p => p.Id, projectId).Build());

        return result != null;
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
        var filterBuilder = _projectFactory.CreateFilterBuilder();

        // 搜索关键词
        if (!string.IsNullOrEmpty(request.Search))
        {
            var pattern = $".*{System.Text.RegularExpressions.Regex.Escape(request.Search)}.*";
            var regex = new BsonRegularExpression(pattern, "i");
            var searchFilter = Builders<Project>.Filter.Or(
                Builders<Project>.Filter.Regex("name", regex),
                Builders<Project>.Filter.Regex("description", regex)
            );
            filterBuilder.Custom(searchFilter);
        }

        // 状态过滤
        if (request.Status.HasValue)
        {
            filterBuilder.Equal(p => p.Status, (ProjectStatus)request.Status.Value);
        }

        // 优先级过滤
        if (request.Priority.HasValue)
        {
            filterBuilder.Equal(p => p.Priority, (ProjectPriority)request.Priority.Value);
        }

        // 项目经理过滤
        if (!string.IsNullOrEmpty(request.ManagerId))
        {
            // 验证 ManagerId 是否为有效的 ObjectId 格式
            if (MongoDB.Bson.ObjectId.TryParse(request.ManagerId, out var managerObjectId))
            {
                filterBuilder.Equal(p => p.ManagerId, request.ManagerId);
            }
            else
            {
                // 如果 ManagerId 格式无效，记录警告但不抛出异常
                Console.WriteLine($"警告: ManagerId 格式无效，将被忽略: {request.ManagerId}");
            }
        }

        // 日期范围过滤
        if (request.StartDate.HasValue || request.EndDate.HasValue)
        {
            DateTime? startDate = null;
            DateTime? endDate = null;

            if (request.StartDate.HasValue)
            {
                // 确保日期是 UTC 时间
                startDate = request.StartDate.Value.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(request.StartDate.Value, DateTimeKind.Utc) 
                    : request.StartDate.Value.ToUniversalTime();
            }

            if (request.EndDate.HasValue)
            {
                // 确保日期是 UTC 时间，并设置为当天的结束时间
                var endDateValue = request.EndDate.Value.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(request.EndDate.Value, DateTimeKind.Utc) 
                    : request.EndDate.Value.ToUniversalTime();
                // 设置为当天的 23:59:59.999
                endDate = endDateValue.Date.AddDays(1).AddMilliseconds(-1);
            }

            // 使用 CreatedBetween 方法，它专门用于日期范围查询
            filterBuilder.CreatedBetween(startDate, endDate);
        }

        var filter = filterBuilder.Build();

        // 排序
        var sortBuilder = _projectFactory.CreateSortBuilder();
        var sortByLower = (request.SortBy ?? "CreatedAt").ToLower();
        var isAscending = (request.SortOrder ?? "desc").ToLower() == "asc";
        
        switch (sortByLower)
        {
            case "name":
                if (isAscending)
                    sortBuilder.Ascending(p => p.Name);
                else
                    sortBuilder.Descending(p => p.Name);
                break;
            case "status":
                if (isAscending)
                    sortBuilder.Ascending(p => p.Status);
                else
                    sortBuilder.Descending(p => p.Status);
                break;
            case "priority":
                if (isAscending)
                    sortBuilder.Ascending(p => p.Priority);
                else
                    sortBuilder.Descending(p => p.Priority);
                break;
            case "progress":
                if (isAscending)
                    sortBuilder.Ascending(p => p.Progress);
                else
                    sortBuilder.Descending(p => p.Progress);
                break;
            case "startdate":
                if (isAscending)
                    sortBuilder.Ascending(p => p.StartDate);
                else
                    sortBuilder.Descending(p => p.StartDate);
                break;
            case "enddate":
                if (isAscending)
                    sortBuilder.Ascending(p => p.EndDate);
                else
                    sortBuilder.Descending(p => p.EndDate);
                break;
            case "createdat":
            default:
                if (isAscending)
                    sortBuilder.Ascending(p => p.CreatedAt);
                else
                    sortBuilder.Descending(p => p.CreatedAt);
                break;
        }

        // 分页查询
        var (projects, total) = await _projectFactory.FindPagedAsync(
            filter,
            sortBuilder.Build(),
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
        var allProjects = await _projectFactory.FindAsync(
            _projectFactory.CreateFilterBuilder().Build());

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
        var existingMember = await _projectMemberFactory.FindAsync(
            _projectMemberFactory.CreateFilterBuilder()
                .Equal(m => m.ProjectId, request.ProjectId)
                .Equal(m => m.UserId, request.UserId)
                .Build());

        if (existingMember.Any())
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
        var filter = _projectMemberFactory.CreateFilterBuilder()
            .Equal(m => m.ProjectId, projectId)
            .Equal(m => m.UserId, memberUserId)
            .Build();

        var member = await _projectMemberFactory.FindOneAndSoftDeleteAsync(filter);
        return member != null;
    }

    /// <summary>
    /// 获取项目成员列表
    /// </summary>
    public async Task<List<ProjectMemberDto>> GetProjectMembersAsync(string projectId)
    {
        var members = await _projectMemberFactory.FindAsync(
            _projectMemberFactory.CreateFilterBuilder()
                .Equal(m => m.ProjectId, projectId)
                .Build());

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
        var tasks = await _taskFactory.FindAsync(
            _taskFactory.CreateFilterBuilder()
                .Equal(t => t.ProjectId, projectId)
                .Build());

        if (tasks.Count == 0)
            return 0;

        // 只计算根任务（没有父任务的任务）的进度，避免重复计算
        var rootTasks = tasks.Where(t => string.IsNullOrEmpty(t.ParentTaskId)).ToList();
        
        if (rootTasks.Count == 0)
        {
            // 如果没有根任务，计算所有任务的平均进度
            var totalProgress = tasks.Sum(t => t.CompletionPercentage);
            var averageProgress = totalProgress / tasks.Count;
            
            // 更新项目进度
            var progressUpdateBuilder = _projectFactory.CreateUpdateBuilder()
                .Set(p => p.Progress, averageProgress);

            var progressFilter = _projectFactory.CreateFilterBuilder()
                .Equal(p => p.Id, projectId)
                .Build();

            await _projectFactory.FindOneAndUpdateAsync(
                progressFilter, 
                progressUpdateBuilder.Build(),
                new FindOneAndUpdateOptions<Project> { ReturnDocument = ReturnDocument.After });
            return averageProgress;
        }

        // 计算根任务的平均进度
        var rootTotalProgress = rootTasks.Sum(t => t.CompletionPercentage);
        var rootAverageProgress = rootTotalProgress / rootTasks.Count;

        // 更新项目进度
        var updateBuilder = _projectFactory.CreateUpdateBuilder()
            .Set(p => p.Progress, rootAverageProgress);

        var filter = _projectFactory.CreateFilterBuilder()
            .Equal(p => p.Id, projectId)
            .Build();

        await _projectFactory.FindOneAndUpdateAsync(
            filter, 
            updateBuilder.Build(),
            new FindOneAndUpdateOptions<Project> { ReturnDocument = ReturnDocument.After });

        return rootAverageProgress;
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
                    // 优先使用 Name（显示名称），如果为空则使用 Username
                    dto.ManagerName = !string.IsNullOrWhiteSpace(manager.Name) ? manager.Name : manager.Username;
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
                    // 优先使用 Name（显示名称），如果为空则使用 Username
                    dto.CreatedByName = !string.IsNullOrWhiteSpace(creator.Name) ? creator.Name : creator.Username;
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
