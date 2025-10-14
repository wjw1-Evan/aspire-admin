using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IPermissionService
{
    // 基础 CRUD
    Task<List<Permission>> GetAllPermissionsAsync();
    Task<Permission?> GetPermissionByIdAsync(string id);
    Task<Permission?> GetPermissionByCodeAsync(string code);
    Task<Permission> CreatePermissionAsync(CreatePermissionRequest request, string createdBy);
    Task<bool> UpdatePermissionAsync(string id, UpdatePermissionRequest request, string updatedBy);
    Task<bool> DeletePermissionAsync(string id, string deletedBy, string? reason = null);
    
    // 权限查询
    Task<List<Permission>> GetPermissionsByResourceAsync(string resource);
    Task<List<Permission>> GetPermissionsByCodesAsync(List<string> codes);
    Task<List<PermissionGroup>> GetPermissionsGroupedByResourceAsync();
    
    // 用户权限查询
    Task<List<Permission>> GetUserAllPermissionsAsync(string userId);
    Task<UserPermissionsResponse> GetUserPermissionsAsync(string userId);
    
    // 初始化系统默认权限
    Task InitializeDefaultPermissionsAsync();
    
    // 获取默认权限定义（用于企业注册）
    List<(string ResourceName, string ResourceTitle, string Action, string ActionTitle, string? Description)> GetDefaultPermissions();
}

