using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户服务接口
/// </summary>
public interface IUserService
{
    Task<List<User>> GetAllUsersAsync();
    Task<User?> GetUserByIdAsync(string id);
    Task<User?> GetUserByIdWithoutTenantFilterAsync(string id);
    Task<User> CreateUserAsync(CreateUserRequest request);
    Task<User?> UpdateUserAsync(string id, UpdateUserRequest request);
    Task<User> CreateUserManagementAsync(CreateUserManagementRequest request);
    Task<User?> UpdateUserManagementAsync(string id, UpdateUserManagementRequest request);
    Task<bool> DeleteUserAsync(string id, string? reason = null);
    Task<List<User>> SearchUsersByNameAsync(string name);
    Task<UserListResponse> GetUsersWithPaginationAsync(UserListRequest request);
    Task<UserListWithRolesResponse> GetUsersWithRolesAsync(UserListRequest request);
    Task<UserStatisticsResponse> GetUserStatisticsAsync();
    Task<bool> BulkUpdateUsersAsync(BulkUserActionRequest request, string? reason = null);
    Task<bool> UpdateUserRoleAsync(string id, string role);
    Task<bool> ActivateUserAsync(string id);
    Task<bool> DeactivateUserAsync(string id);
    Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50);
    Task<(List<UserActivityLog> logs, long total)> GetCurrentUserActivityLogsAsync(int page = 1, int pageSize = 20, string? action = null, DateTime? startDate = null, DateTime? endDate = null);
    Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(int page = 1, int pageSize = 20, string? userId = null, string? action = null, DateTime? startDate = null, DateTime? endDate = null);
    Task<(List<UserActivityLog> logs, long total, Dictionary<string, string> userMap)> GetAllActivityLogsWithUsersAsync(int page = 1, int pageSize = 20, string? userId = null, string? action = null, DateTime? startDate = null, DateTime? endDate = null);
    Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null);
    Task<User?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request);
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null);
    Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null);
    Task<object> GetUserPermissionsAsync(string userId);
}

