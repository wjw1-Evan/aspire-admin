using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户角色服务接口
/// 负责处理用户与角色的关联、权限查询等
/// </summary>
public interface IUserRoleService
{
    /// <summary>
    /// 获取用户可访问的菜单ID列表（用于权限判断）
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>菜单权限信息</returns>
    Task<object> GetUserPermissionsAsync(string userId);

    /// <summary>
    /// 验证角色是否属于当前企业
    /// </summary>
    /// <param name="roleIds">要验证的角色ID列表</param>
    /// <returns>验证通过的角色ID列表</returns>
    Task<List<string>> ValidateRoleOwnershipAsync(List<string> roleIds);

    /// <summary>
    /// 获取角色名称映射
    /// </summary>
    Task<Dictionary<string, string>> GetRoleNameMapAsync(List<string> roleIds, string companyId);

    /// <summary>
    /// 根据角色ID获取用户ID列表
    /// </summary>
    Task<List<string>> GetUserIdsByRolesAsync(List<string> roleIds, string companyId);

    /// <summary>
    /// 统计当前企业的角色总数
    /// </summary>
    Task<int> CountAsync();
}
