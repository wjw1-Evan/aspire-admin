using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 角色服务接口
/// </summary>
public interface IRoleService
{
    /// <summary>
    /// 获取所有角色
    /// </summary>
    /// <returns>角色列表响应</returns>
    Task<RoleListResponse> GetAllRolesAsync();
    
    /// <summary>
    /// 获取所有角色（包含统计信息）
    /// </summary>
    /// <returns>带统计信息的角色列表响应</returns>
    Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync();
    
    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    /// <param name="id">角色ID</param>
    /// <returns>角色信息，如果不存在则返回 null</returns>
    Task<Role?> GetRoleByIdAsync(string id);
    
    /// <summary>
    /// 创建角色
    /// </summary>
    /// <param name="request">创建角色请求</param>
    /// <returns>创建的角色信息</returns>
    Task<Role> CreateRoleAsync(CreateRoleRequest request);
    
    /// <summary>
    /// 更新角色
    /// </summary>
    /// <param name="id">角色ID</param>
    /// <param name="request">更新角色请求</param>
    /// <returns>是否成功更新</returns>
    Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request);
    
    /// <summary>
    /// 删除角色（软删除）
    /// </summary>
    /// <param name="id">角色ID</param>
    /// <param name="reason">删除原因（可选）</param>
    /// <returns>是否成功删除</returns>
    Task<bool> DeleteRoleAsync(string id, string? reason = null);
    
    /// <summary>
    /// 为角色分配菜单
    /// </summary>
    /// <param name="roleId">角色ID</param>
    /// <param name="menuIds">菜单ID列表</param>
    /// <returns>是否成功分配</returns>
    Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds);
    
    /// <summary>
    /// 获取角色的菜单ID列表
    /// </summary>
    /// <param name="roleId">角色ID</param>
    /// <returns>菜单ID列表</returns>
    Task<List<string>> GetRoleMenuIdsAsync(string roleId);
}

