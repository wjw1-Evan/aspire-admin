using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IPermissionCheckService
{
    Task<bool> HasPermissionAsync(string userId, string permissionCode);
    Task<bool> HasAnyPermissionAsync(string userId, params string[] permissionCodes);
    Task<bool> HasAllPermissionsAsync(string userId, params string[] permissionCodes);
    Task<UserPermissionsResponse> GetUserPermissionsAsync(string userId);
    Task<List<string>> GetUserPermissionCodesAsync(string userId);
}

