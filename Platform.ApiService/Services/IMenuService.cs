using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单服务接口（只读）
/// 菜单是全局系统资源，由系统初始化创建，用户不能修改
/// </summary>
public interface IMenuService
{
    Task<List<Menu>> GetAllMenusAsync();
    Task<List<MenuTreeNode>> GetMenuTreeAsync();
    Task<List<MenuTreeNode>> GetUserMenusAsync(List<string> roleIds);
    Task<Menu?> GetMenuByIdAsync(string id);
}

