using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单服务接口
/// </summary>
public interface IMenuService
{
    Task<List<Menu>> GetAllMenusAsync();
    Task<List<MenuTreeNode>> GetMenuTreeAsync();
    Task<List<MenuTreeNode>> GetUserMenusAsync(List<string> roleIds);
    Task<Menu?> GetMenuByIdAsync(string id);
    Task<Menu> CreateMenuAsync(CreateMenuRequest request);
    Task<bool> UpdateMenuAsync(string id, UpdateMenuRequest request);
    Task<bool> DeleteMenuAsync(string id, string? reason = null);
    Task<bool> ReorderMenusAsync(List<string> menuIds, string? parentId);
}

