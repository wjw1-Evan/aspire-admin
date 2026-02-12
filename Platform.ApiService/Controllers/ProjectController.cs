using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using System;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 项目管理控制器 - 处理项目创建、更新、成员管理等
/// </summary>
[ApiController]
[Route("api/project")]
public class ProjectController : BaseApiController
{
    private readonly IProjectService _projectService;
    private readonly IUserService _userService;

    /// <summary>
    /// 初始化项目管理控制器
    /// </summary>
    public ProjectController(IProjectService projectService, IUserService userService)
    {
        _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    }

    /// <summary>
    /// 创建项目
    /// </summary>
    [HttpPost]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null)
            return validationResult;

        if (string.IsNullOrEmpty(request.Name))
            return ValidationError("项目名称不能为空");

        try
        {
            var userId = GetRequiredUserId();
            var user = await _userService.GetUserByIdAsync(userId);
            if (user?.CurrentCompanyId == null)
                return ValidationError("无法获取企业信息");

            var project = await _projectService.CreateProjectAsync(request, userId, user.CurrentCompanyId);
            return Success(project);
        }
        catch (Exception ex)
        {
            return Error("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 更新项目
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> UpdateProject(string id, [FromBody] UpdateProjectRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null)
            return validationResult;

        request.ProjectId = id;

        try
        {
            var userId = GetRequiredUserId();
            var project = await _projectService.UpdateProjectAsync(request, userId);
            return Success(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFoundError("项目", id);
        }
        catch (Exception ex)
        {
            return Error("UPDATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 删除项目
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> DeleteProject(string id, [FromQuery] string? reason = null)
    {
        try
        {
            var userId = GetRequiredUserId();
            var deleted = await _projectService.DeleteProjectAsync(id, userId, reason);
            if (!deleted)
                return NotFoundError("项目", id);

            return Success("项目已删除");
        }
        catch (Exception ex)
        {
            return Error("DELETE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取项目详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> GetProject(string id)
    {
        try
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            if (project == null)
                return NotFoundError("项目", id);

            return Success(project);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 分页获取项目列表
    /// </summary>
    [HttpPost("list")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> GetProjectsList([FromBody] ProjectQueryRequest request)
    {
        try
        {
            var user = await _userService.GetUserByIdAsync(GetRequiredUserId());
            if (user?.CurrentCompanyId == null)
                return ValidationError("无法获取企业信息");

            var result = await _projectService.GetProjectsListAsync(request, user.CurrentCompanyId);
            return Success(result);
        }
        catch (Exception ex)
        {
            return Error("QUERY_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取项目统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> GetProjectStatistics()
    {
        try
        {
            var user = await _userService.GetUserByIdAsync(GetRequiredUserId());
            if (user?.CurrentCompanyId == null)
                return ValidationError("无法获取企业信息");

            var statistics = await _projectService.GetProjectStatisticsAsync(user.CurrentCompanyId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            return Error("GET_STATISTICS_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 添加项目成员
    /// </summary>
    [HttpPost("{projectId}/members")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> AddProjectMember(string projectId, [FromBody] AddProjectMemberRequest request)
    {
        var validationResult = ValidateModelState();
        if (validationResult != null)
            return validationResult;

        request.ProjectId = projectId;

        try
        {
            var userId = GetRequiredUserId();
            var user = await _userService.GetUserByIdAsync(userId);
            if (user?.CurrentCompanyId == null)
                return ValidationError("无法获取企业信息");

            var member = await _projectService.AddProjectMemberAsync(request, userId, user.CurrentCompanyId);
            return Success(member);
        }
        catch (KeyNotFoundException)
        {
            return NotFoundError("项目", projectId);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            return Error("ADD_MEMBER_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 移除项目成员
    /// </summary>
    [HttpDelete("{projectId}/members/{userId}")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> RemoveProjectMember(string projectId, string userId)
    {
        try
        {
            var currentUserId = GetRequiredUserId();
            var removed = await _projectService.RemoveProjectMemberAsync(projectId, userId, currentUserId);
            if (!removed)
                return NotFoundError("项目成员", userId);

            return Success("成员已移除");
        }
        catch (Exception ex)
        {
            return Error("REMOVE_MEMBER_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取项目成员列表
    /// </summary>
    [HttpGet("{projectId}/members")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> GetProjectMembers(string projectId)
    {
        try
        {
            var members = await _projectService.GetProjectMembersAsync(projectId);
            return Success(members);
        }
        catch (Exception ex)
        {
            return Error("GET_MEMBERS_FAILED", ex.Message);
        }
    }
}
