using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
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
    [RequirePermission("permission", "read")]
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
    [RequirePermission("permission", "read")]
    public async Task<IActionResult> GetById(string id)
    {
        var permission = await _permissionService.GetPermissionByIdAsync(id);
        if (permission == null)
        {
            throw new KeyNotFoundException($"权限 {id} 不存在");
        }
        return Success(permission);
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
    [RequirePermission("permission", "create")]
    public async Task<IActionResult> Create([FromBody] CreatePermissionRequest request)
    {
        var userId = GetRequiredUserId();
        var permission = await _permissionService.CreatePermissionAsync(request, userId);
        return Success(permission, "创建成功");
    }

    /// <summary>
    /// 更新权限
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("permission", "update")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdatePermissionRequest request)
    {
        var userId = GetRequiredUserId();
        var result = await _permissionService.UpdatePermissionAsync(id, request, userId);
        if (!result)
        {
            throw new KeyNotFoundException($"权限 {id} 不存在");
        }
        return Success("更新成功");
    }

    /// <summary>
    /// 删除权限
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission("permission", "delete")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetRequiredUserId();
        var result = await _permissionService.DeletePermissionAsync(id, userId);
        if (!result)
        {
            throw new KeyNotFoundException($"权限 {id} 不存在");
        }
        return Success("删除成功");
    }

    /// <summary>
    /// 初始化系统默认权限
    /// </summary>
    [HttpPost("initialize")]
    [RequirePermission("permission", "create")]
    public async Task<IActionResult> Initialize()
    {
        await _permissionService.InitializeDefaultPermissionsAsync();
        return Success("初始化成功");
    }
}

