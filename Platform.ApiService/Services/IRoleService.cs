using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 角色统计信息
/// </summary>
public class RoleStatistics
{
    public int TotalRoles { get; set; }
    public int ActiveRoles { get; set; }
    public int TotalUsers { get; set; }
    public int TotalMenus { get; set; }
}

/// <summary>
/// 角色服务接口
/// </summary>
public interface IRoleService
{
    /// <summary>
    /// 获取所有角色
    /// </summary>
    Task<PagedResult<Role>> GetAllRolesAsync();
    
    /// <summary>
    /// 获取所有角色（包含统计信息）
    /// </summary>
    Task<PagedResult<RoleWithStats>> GetAllRolesWithStatsAsync();

    /// <summary>
    /// 获取角色统计信息（基于全部数据）
    /// </summary>
    Task<RoleStatistics> GetRoleStatisticsAsync();
    
    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    Task<Role?> GetRoleByIdAsync(string id);
    
    /// <summary>
    /// 创建角色
    /// </summary>
    Task<Role> CreateRoleAsync(CreateRoleRequest request);
    
    /// <summary>
    /// 更新角色
    /// </summary>
    Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request);
    
    /// <summary>
    /// 删除角色（软删除）
    /// </summary>
    Task<bool> DeleteRoleAsync(string id, string? reason = null);
    
    /// <summary>
    /// 为角色分配菜单
    /// </summary>
    Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds);
    
    /// <summary>
    /// 获取角色的菜单ID列表
    /// </summary>
    Task<List<string>> GetRoleMenuIdsAsync(string roleId);
}