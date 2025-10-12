using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 角色服务接口
/// </summary>
public interface IRoleService
{
    Task<RoleListResponse> GetAllRolesAsync();
    Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync();
    Task<Role?> GetRoleByIdAsync(string id);
    Task<Role> CreateRoleAsync(CreateRoleRequest request);
    Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request);
    Task<bool> DeleteRoleAsync(string id, string? reason = null);
    Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds);
    Task<List<string>> GetRoleMenuIdsAsync(string roleId);
    Task<bool> AssignPermissionsToRoleAsync(string roleId, List<string> permissionIds);
    Task<List<Permission>> GetRolePermissionsAsync(string roleId);
}

