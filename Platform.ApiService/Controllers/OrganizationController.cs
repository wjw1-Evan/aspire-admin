using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 组织架构管理控制器
/// 部门、岗位、人员关系等组织架构管理
/// </summary>
[ApiController]
[Route("api/organization")]

public class OrganizationController : BaseApiController
{
    private readonly IOrganizationService _organizationService;
    private readonly IUserService _userService;

    /// <summary>
    /// 初始化组织架构控制器
    /// </summary>
    /// <param name="organizationService">组织架构服务</param>
    /// <param name="userService">用户服务</param>
    public OrganizationController(IOrganizationService organizationService, IUserService userService)
    {
        _organizationService = organizationService;
        _userService = userService;
    }

    /// <summary>
    /// 获取组织架构树
    /// </summary>
    [HttpGet("tree")]
    [RequireMenu("organization")]
    public async Task<IActionResult> GetTree()
    {
        var tree = await _organizationService.GetTreeAsync().ConfigureAwait(false);
        return Success(tree);
    }

    /// <summary>
    /// 获取组织节点详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("organization")]
    public async Task<IActionResult> GetById(string id)
    {
        var node = await _organizationService.GetByIdAsync(id).ConfigureAwait(false);
        return Success(node);
    }

    /// <summary>
    /// 创建组织节点
    /// </summary>
    [HttpPost]
    [RequireMenu("organization")]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationUnitRequest request)
    {
        var node = await _organizationService.CreateAsync(request).ConfigureAwait(false);
        return Success(node, SuccessMessages.CreateSuccess);
    }

    /// <summary>
    /// 更新组织节点
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("organization")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateOrganizationUnitRequest request)
    {
        var updated = await _organizationService.UpdateAsync(id, request).ConfigureAwait(false);
        return Success(null, SuccessMessages.UpdateSuccess);
    }

    /// <summary>
    /// 删除组织节点
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("organization")]
    public async Task<IActionResult> Delete(string id)
    {
        var deleted = await _organizationService.DeleteAsync(id).ConfigureAwait(false);
        return Success(null, SuccessMessages.DeleteSuccess);
    }

    /// <summary>
    /// 批量重排（拖拽排序与父子调整）
    /// </summary>
    [HttpPost("reorder")]
    [RequireMenu("organization")]
    public async Task<IActionResult> Reorder([FromBody] List<OrganizationReorderItem> items)
    {
        var ok = await _organizationService.ReorderAsync(items).ConfigureAwait(false);
        return Success(null, SuccessMessages.UpdateSuccess);
    }

    /// <summary>
    /// 获取组织成员列表
    /// </summary>
    [HttpGet("{id}/members")]
    [RequireMenu("organization")]
    public async Task<IActionResult> GetMembers(string id)
    {
        var members = await _organizationService.GetMembersAsync(id).ConfigureAwait(false);
        return Success(members);
    }

    /// <summary>
    /// 获取可分配的用户列表（用于添加成员下拉选择）
    /// </summary>
    /// <param name="organizationUnitId">组织节点ID</param>
    /// <param name="query">搜索关键词（可选）</param>
    [HttpGet("available-users")]
    [RequireMenu("organization")]
    public async Task<IActionResult> GetAvailableUsers([FromQuery] string organizationUnitId, [FromQuery] string? query = null)
    {
        var existingMembers = await _organizationService.GetMembersAsync(organizationUnitId).ConfigureAwait(false);
        var existingUserIds = existingMembers.Select(m => m.UserId).ToHashSet();

        var allUsers = string.IsNullOrWhiteSpace(query)
            ? await _userService.GetAllUsersAsync().ConfigureAwait(false)
            : await _userService.SearchUsersByNameAsync(query).ConfigureAwait(false);

        var availableUsers = allUsers
            .Where(u => !existingUserIds.Contains(u.Id))
            .Select(u => new { value = u.Id, label = $"{u.Username}{(string.IsNullOrEmpty(u.Name) ? "" : $" ({u.Name})")}" })
            .ToList();

        return Success(availableUsers);
    }

    /// <summary>
    /// 设置用户所在组织
    /// </summary>
    [HttpPost("assign-user")]
    [RequireMenu("organization")]
    public async Task<IActionResult> AssignUser([FromBody] AssignUserOrganizationRequest request)
    {
        var ok = await _organizationService.AssignUserAsync(request).ConfigureAwait(false);
        return Success(null, SuccessMessages.OperationSuccess);
    }

    /// <summary>
    /// 从组织移除用户
    /// </summary>
    [HttpPost("remove-user")]
    [RequireMenu("organization")]
    public async Task<IActionResult> RemoveUser([FromBody] RemoveUserOrganizationRequest request)
    {
        var ok = await _organizationService.RemoveUserAsync(request).ConfigureAwait(false);
        return Success(null, SuccessMessages.DeleteSuccess);
    }
}