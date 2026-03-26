using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单访问权限服务接口
/// 基于用户可访问的菜单判断API权限
/// </summary>
public interface IMenuAccessService
{
    /// <summary>
    /// 检查用户是否有访问指定菜单的权限
    /// </summary>
    /// <param name="menuName">菜单名称</param>
    /// <param name="userId">用户ID</param>
    Task<bool> HasMenuAccessAsync(string menuName, string userId);
    
    /// <summary>
    /// 获取用户可访问的所有菜单名称列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    Task<List<string>> GetUserMenuNamesAsync(string userId);
    
    /// <summary>
    /// 检查用户是否有访问任意一个菜单的权限
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="menuNames">菜单名称列表</param>
    Task<bool> HasAnyMenuAccessAsync(string userId, params string[] menuNames);
}
