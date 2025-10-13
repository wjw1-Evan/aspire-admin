using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionController : BaseApiController
{
    private readonly IPermissionService _permissionService;

    public PermissionController(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    /// <summary>
    /// 获取所有权限
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionResources.Permission, PermissionActions.Read)]
    public async Task<IActionResult> GetAll()
    {
        var permissions = await _permissionService.GetAllPermissionsAsync();
        return Success(permissions);
    }

    /// <summary>
    /// 按资源分组获取权限
    /// </summary>
    [HttpGet("grouped")]
    public async Task<IActionResult> GetGrouped()
    {
        var groups = await _permissionService.GetPermissionsGroupedByResourceAsync();
        return Success(groups);
    }

    /// <summary>
    /// 根据ID获取权限
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionResources.Permission, PermissionActions.Read)]
    public async Task<IActionResult> GetById(string id)
    {
        var permission = await _permissionService.GetPermissionByIdAsync(id);
        return Success(permission.EnsureFound("权限", id));
    }

    /// <summary>
    /// 按资源获取权限
    /// </summary>
    [HttpGet("by-resource/{resource}")]
    public async Task<IActionResult> GetByResource(string resource)
    {
        var permissions = await _permissionService.GetPermissionsByResourceAsync(resource);
        return Success(permissions);
    }

    /// <summary>
    /// 创建权限
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionResources.Permission, PermissionActions.Create)]
    public async Task<IActionResult> Create([FromBody] CreatePermissionRequest request)
    {
        var userId = GetRequiredUserId();
        var permission = await _permissionService.CreatePermissionAsync(request, userId);
        return Success(permission, ErrorMessages.CreateSuccess);
    }

    /// <summary>
    /// 更新权限
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionResources.Permission, PermissionActions.Update)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdatePermissionRequest request)
    {
        var userId = GetRequiredUserId();
        var result = await _permissionService.UpdatePermissionAsync(id, request, userId);
        result.EnsureSuccess("权限", id);
        return Success(ErrorMessages.UpdateSuccess);
    }

    /// <summary>
    /// 删除权限
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionResources.Permission, PermissionActions.Delete)]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetRequiredUserId();
        var result = await _permissionService.DeletePermissionAsync(id, userId);
        result.EnsureSuccess("权限", id);
        return Success(ErrorMessages.DeleteSuccess);
    }

    /// <summary>
    /// 初始化系统默认权限
    /// </summary>
    [HttpPost("initialize")]
    [RequirePermission(PermissionResources.Permission, PermissionActions.Create)]
    public async Task<IActionResult> Initialize()
    {
        await _permissionService.InitializeDefaultPermissionsAsync();
        return Success("初始化成功");
    }
}

