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
            throw new ArgumentException("项目名称不能为空");

        try
        {
            var project = await _projectService.CreateProjectAsync(request);
            return Success(project);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
            var userId = RequiredUserId;
            var project = await _projectService.UpdateProjectAsync(request, userId);
            return Success(project);
        }
        catch (KeyNotFoundException)
        {
            throw new ArgumentException("项目 {id} 不存在");
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
            var userId = RequiredUserId;
            var deleted = await _projectService.DeleteProjectAsync(id, userId, reason);
            if (!deleted)
                throw new ArgumentException("项目 {id} 不存在");

            return Success(null, "项目已删除");
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
                throw new ArgumentException("项目 {id} 不存在");

            return Success(project);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 分页获取项目列表
    /// </summary>
    [HttpGet("list")]
    [RequireMenu("project-management-project")]
    public async Task<IActionResult> GetProjectsList([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        try
        {
            var userId = RequiredUserId;
            var result = await _projectService.GetProjectsListAsync(request, userId);
            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
            var statistics = await _projectService.GetProjectStatisticsAsync();
            return Success(statistics);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
            var member = await _projectService.AddProjectMemberAsync(request);
            return Success(member);
        }
        catch (KeyNotFoundException)
        {
            throw new ArgumentException("项目 {projectId} 不存在");
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
            var removed = await _projectService.RemoveProjectMemberAsync(projectId, userId);
            if (!removed)
                throw new ArgumentException("项目成员 {userId} 不存在");

            return Success(null, "成员已移除");
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
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
            throw new ArgumentException(ex.Message);
        }
    }
}