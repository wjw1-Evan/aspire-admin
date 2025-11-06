using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单服务接口（只读）
/// 菜单是全局系统资源，由系统初始化创建，用户不能修改
/// </summary>
public interface IMenuService
{
    /// <summary>
    /// 获取所有菜单
    /// </summary>
    /// <returns>菜单列表</returns>
    Task<List<Menu>> GetAllMenusAsync();
    
    /// <summary>
    /// 获取菜单树
    /// </summary>
    /// <returns>菜单树节点列表</returns>
    Task<List<MenuTreeNode>> GetMenuTreeAsync();
    
    /// <summary>
    /// 根据角色ID列表获取用户可见菜单
    /// </summary>
    /// <param name="roleIds">角色ID列表</param>
    /// <returns>用户可见的菜单树</returns>
    Task<List<MenuTreeNode>> GetUserMenusAsync(List<string> roleIds);
    
    /// <summary>
    /// 根据ID获取菜单
    /// </summary>
    /// <param name="id">菜单ID</param>
    /// <returns>菜单信息，如果不存在则返回 null</returns>
    Task<Menu?> GetMenuByIdAsync(string id);
}

