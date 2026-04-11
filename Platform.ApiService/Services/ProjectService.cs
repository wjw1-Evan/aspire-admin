using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目管理服务实现
/// </summary>
public class ProjectService : IProjectService
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly ILogger<ProjectService> _logger;

    public ProjectService(DbContext context, IUserService userService, ILogger<ProjectService> logger)
    {
        _context = context;
        _userService = userService;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<ProjectDto> CreateProjectAsync(CreateProjectRequest request)
    {
        var project = new Project
        {
            Name = request.Name, Description = request.Description, Status = (ProjectStatus)request.Status,
            StartDate = request.StartDate, EndDate = request.EndDate,
            MemberIds = request.MemberIds ?? [], Budget = request.Budget, Priority = (ProjectPriority)request.Priority, Progress = 0
        };
        await _context.Set<Project>().AddAsync(project);
        await _context.SaveChangesAsync();

        if (request.MemberIds != null && request.MemberIds.Count > 0)
        {
            foreach (var userId in request.MemberIds)
            {
                await _context.Set<ProjectMember>().AddAsync(new ProjectMember
                {
                    ProjectId = project.Id, UserId = userId, Role = ProjectMemberRole.Member, Allocation = 100
                });
            }
            await _context.SaveChangesAsync();
        }
        return await ConvertToProjectDtoAsync(project);
    }

    /// <inheritdoc/>
    public async Task<ProjectDto> UpdateProjectAsync(UpdateProjectRequest request, string userId)
    {
        var project = await _context.Set<Project>().FirstOrDefaultAsync(x => x.Id == request.ProjectId);
        if (project == null) throw new KeyNotFoundException($"项目 {request.ProjectId} 不存在");

        if (!string.IsNullOrEmpty(request.Name)) project.Name = request.Name;
        if (request.Description != null) project.Description = request.Description;
        if (request.Status.HasValue) project.Status = (ProjectStatus)request.Status.Value;
        if (request.StartDate.HasValue) project.StartDate = request.StartDate;
        if (request.EndDate.HasValue) project.EndDate = request.EndDate;
        if (request.MemberIds != null)
        {
            project.MemberIds = request.MemberIds;
            var existingMembers = await _context.Set<ProjectMember>().Where(pm => pm.ProjectId == request.ProjectId).ToListAsync();
            _context.Set<ProjectMember>().RemoveRange(existingMembers);
            foreach (var userId2 in request.MemberIds)
            {
                await _context.Set<ProjectMember>().AddAsync(new ProjectMember
                {
                    ProjectId = request.ProjectId, UserId = userId2, Role = ProjectMemberRole.Member, Allocation = 100
                });
            }
        }
        if (request.Budget.HasValue) project.Budget = request.Budget;
        if (request.Priority.HasValue) project.Priority = (ProjectPriority)request.Priority.Value;

        await _context.SaveChangesAsync();
        return await ConvertToProjectDtoAsync(project);
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteProjectAsync(string projectId, string userId, string? reason = null)
    {
        var project = await _context.Set<Project>().FirstOrDefaultAsync(x => x.Id == projectId);
        if (project == null) return false;
        if (project.CreatedBy != userId)
            throw new UnauthorizedAccessException("无权删除此项目");

        _context.Set<Project>().Remove(project);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<ProjectDto?> GetProjectByIdAsync(string projectId)
    {
        var project = await _context.Set<Project>().FirstOrDefaultAsync(x => x.Id == projectId);
        return project == null ? null : await ConvertToProjectDtoAsync(project);
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<ProjectDto>> GetProjectsListAsync(Platform.ServiceDefaults.Models.PageParams request, string currentUserId)
    {
        var q = _context.Set<Project>().AsQueryable();
        q = q.Where(p => p.CreatedBy == currentUserId || (p.MemberIds != null && p.MemberIds.Contains(currentUserId)));

        var pagedResult = q.ToPagedList(request);
        var projects = await pagedResult.Queryable.ToListAsync();
        var projectDtos = await ConvertToProjectDtosAsync(projects, currentUserId);
        return new System.Linq.Dynamic.Core.PagedResult<ProjectDto>
        {
            Queryable = projectDtos.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
        };
    }

    /// <inheritdoc/>
    public async Task<ProjectStatistics> GetProjectStatisticsAsync()
    {
        var all = await _context.Set<Project>().ToListAsync();
        var stats = new ProjectStatistics
        {
            TotalProjects = all.Count,
            InProgressProjects = all.Count(p => p.Status == ProjectStatus.InProgress),
            CompletedProjects = all.Count(p => p.Status == ProjectStatus.Completed),
            DelayedProjects = all.Count(p => p.Status == ProjectStatus.InProgress && p.EndDate.HasValue && p.EndDate.Value < DateTime.UtcNow)
        };
        foreach (var s in Enum.GetValues<ProjectStatus>()) { var count = all.Count(p => p.Status == s); if (count > 0) stats.ProjectsByStatus[GetStatusName(s)] = count; }
        foreach (var pr in Enum.GetValues<ProjectPriority>()) { var count = all.Count(p => p.Priority == pr); if (count > 0) stats.ProjectsByPriority[GetPriorityName(pr)] = count; }
        return stats;
    }

    /// <inheritdoc/>
    public async Task<ProjectMemberDto> AddProjectMemberAsync(AddProjectMemberRequest request)
    {
        if (!await _context.Set<Project>().AnyAsync(x => x.Id == request.ProjectId)) throw new KeyNotFoundException($"项目 {request.ProjectId} 不存在");
        if (await _context.Set<ProjectMember>().AnyAsync(m => m.ProjectId == request.ProjectId && m.UserId == request.UserId)) throw new InvalidOperationException("该用户已经是项目成员");

        var member = new ProjectMember { ProjectId = request.ProjectId, UserId = request.UserId, Role = (ProjectMemberRole)request.Role, Allocation = request.Allocation };
        await _context.Set<ProjectMember>().AddAsync(member);
        await _context.SaveChangesAsync();
        return await ConvertToProjectMemberDtoAsync(member);
    }

    /// <inheritdoc/>
    public async Task<bool> RemoveProjectMemberAsync(string projectId, string memberUserId)
    {
        var members = await _context.Set<ProjectMember>().Where(m => m.ProjectId == projectId && m.UserId == memberUserId).ToListAsync();
        if (!members.Any()) return false;
        foreach (var m in members) _context.Set<ProjectMember>().Remove(m);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<List<ProjectMemberDto>> GetProjectMembersAsync(string projectId) => await ConvertToProjectMemberDtosAsync(await _context.Set<ProjectMember>().Where(m => m.ProjectId == projectId).ToListAsync());

    /// <inheritdoc/>
    public async Task<int> CalculateProjectProgressAsync(string projectId)
    {
        var tasks = await _context.Set<WorkTask>().Where(t => t.ProjectId == projectId).ToListAsync();
        if (!tasks.Any()) return 0;

        var roots = tasks.Where(t => string.IsNullOrEmpty(t.ParentTaskId)).ToList();
        var avg = (roots.Any() ? roots.Sum(t => t.CompletionPercentage) / roots.Count : tasks.Sum(t => t.CompletionPercentage) / tasks.Count);

        var p = await _context.Set<Project>().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p != null) { p.Progress = avg; await _context.SaveChangesAsync(); }
        return avg;
    }

    private async Task<List<ProjectDto>> ConvertToProjectDtosAsync(IEnumerable<Project> projects, string currentUserId)
    {
        var list = projects.ToList();
        if (!list.Any()) return new List<ProjectDto>();
        var userIds = list.SelectMany(p => p.MemberIds ?? new List<string>()).Concat(list.Select(p => p.CreatedBy).Where(id => !string.IsNullOrEmpty(id))).OfType<string>().Distinct();
        var userMap = await _userService.GetUsersByIdsAsync(userIds);
        return list.Select(p => ConvertToProjectDtoWithCache(p, userMap, currentUserId)).ToList();
    }

    private ProjectDto ConvertToProjectDtoWithCache(Project p, Dictionary<string, AppUser> uMap, string currentUserId)
    {
        var dto = MapToDto(p);
        dto.CanEdit = p.CreatedBy == currentUserId;
        dto.CanDelete = p.CreatedBy == currentUserId;
        if (p.MemberIds != null && p.MemberIds.Count > 0)
        {
            dto.ProjectMembers = p.MemberIds.Select(uid => new ProjectMemberDto { UserId = uid, UserName = uMap.TryGetValue(uid, out var u) ? (string.IsNullOrWhiteSpace(u.Name) ? u.Username : u.Name) : uid }).ToList();
        }
        if (!string.IsNullOrEmpty(p.CreatedBy) && uMap.TryGetValue(p.CreatedBy, out var c)) dto.CreatedByName = string.IsNullOrWhiteSpace(c.Name) ? c.Username : $"{c.Username} ({c.Name})";
        return dto;
    }

    private async Task<ProjectDto> ConvertToProjectDtoAsync(Project p)
    {
        var dto = MapToDto(p);
        if (p.MemberIds != null && p.MemberIds.Count > 0)
        {
            var members = new List<ProjectMemberDto>();
            foreach (var uid in p.MemberIds)
            {
                try { var u = await _userService.GetUserByIdWithoutTenantFilterAsync(uid); if (u != null) members.Add(new ProjectMemberDto { UserId = uid, UserName = string.IsNullOrWhiteSpace(u.Name) ? u.Username : u.Name }); } catch { }
            }
            dto.ProjectMembers = members;
        }
        if (!string.IsNullOrEmpty(p.CreatedBy))
        {
            try { var c = await _userService.GetUserByIdWithoutTenantFilterAsync(p.CreatedBy); if (c != null) dto.CreatedByName = string.IsNullOrWhiteSpace(c.Name) ? c.Username : $"{c.Username} ({c.Name})"; } catch { }
        }
        return dto;
    }

    private ProjectDto MapToDto(Project p) => new ProjectDto
    {
        Id = p.Id, Name = p.Name, Description = p.Description, Status = (int)p.Status, StatusName = GetStatusName(p.Status),
        StartDate = p.StartDate, EndDate = p.EndDate, Progress = p.Progress, MemberIds = p.MemberIds, Budget = p.Budget,
        Priority = (int)p.Priority, PriorityName = GetPriorityName(p.Priority), CreatedBy = p.CreatedBy,
        CreatedAt = p.CreatedAt, UpdatedAt = p.UpdatedAt
    };

    private async Task<List<ProjectMemberDto>> ConvertToProjectMemberDtosAsync(IEnumerable<ProjectMember> members)
    {
        var list = members.ToList();
        if (!list.Any()) return new List<ProjectMemberDto>();
        var userIds = list.Select(m => m.UserId).Distinct();
        var userMap = await _userService.GetUsersByIdsAsync(userIds);
        return list.Select(m => ConvertToProjectMemberDtoWithCache(m, userMap)).ToList();
    }

    private ProjectMemberDto ConvertToProjectMemberDtoWithCache(ProjectMember m, Dictionary<string, AppUser> uMap)
    {
        var dto = new ProjectMemberDto { Id = m.Id, ProjectId = m.ProjectId, UserId = m.UserId, Role = (int)m.Role, RoleName = GetRoleName(m.Role), Allocation = m.Allocation };
        if (uMap.TryGetValue(m.UserId, out var u)) { dto.UserName = u.Username; dto.UserEmail = u.Email; }
        return dto;
    }

    private async Task<ProjectMemberDto> ConvertToProjectMemberDtoAsync(ProjectMember m)
    {
        var dto = new ProjectMemberDto { Id = m.Id, ProjectId = m.ProjectId, UserId = m.UserId, Role = (int)m.Role, RoleName = GetRoleName(m.Role), Allocation = m.Allocation };
        try { var u = await _userService.GetUserByIdAsync(m.UserId); if (u != null) { dto.UserName = u.Username; dto.UserEmail = u.Email; } } catch { }
        return dto;
    }

    private static string GetStatusName(ProjectStatus s) => s switch { ProjectStatus.Planning => "规划中", ProjectStatus.InProgress => "进行中", ProjectStatus.OnHold => "暂停", ProjectStatus.Completed => "已完成", ProjectStatus.Cancelled => "已取消", _ => "未知" };
    private static string GetPriorityName(ProjectPriority p) => p switch { ProjectPriority.Low => "低", ProjectPriority.Medium => "中", ProjectPriority.High => "高", _ => "未知" };
    private static string GetRoleName(ProjectMemberRole r) => r switch { ProjectMemberRole.Manager => "项目经理", ProjectMemberRole.Member => "成员", ProjectMemberRole.Viewer => "查看者", _ => "未知" };
}
