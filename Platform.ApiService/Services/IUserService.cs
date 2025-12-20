using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户服务接口
/// </summary>
public interface IUserService
{
    /// <summary>
    /// 获取所有用户
    /// </summary>
    /// <returns>用户列表</returns>
    Task<List<User>> GetAllUsersAsync();
    
    /// <summary>
    /// 根据ID获取用户（带租户过滤）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户信息，如果不存在则返回 null</returns>
    Task<User?> GetUserByIdAsync(string id);
    
    /// <summary>
    /// 根据ID获取用户（不带租户过滤，用于跨企业查询）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户信息，如果不存在则返回 null</returns>
    Task<User?> GetUserByIdWithoutTenantFilterAsync(string id);
    
    /// <summary>
    /// 创建用户
    /// </summary>
    /// <param name="request">创建用户请求</param>
    /// <returns>创建的用户信息</returns>
    Task<User> CreateUserAsync(CreateUserRequest request);
    
    /// <summary>
    /// 更新用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户请求</param>
    /// <returns>更新后的用户信息，如果不存在则返回 null</returns>
    Task<User?> UpdateUserAsync(string id, UpdateUserRequest request);
    
    /// <summary>
    /// 创建用户（用户管理）
    /// </summary>
    /// <param name="request">创建用户管理请求</param>
    /// <returns>创建的用户信息</returns>
    Task<User> CreateUserManagementAsync(CreateUserManagementRequest request);
    
    /// <summary>
    /// 更新用户（用户管理）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="request">更新用户管理请求</param>
    /// <returns>更新后的用户信息，如果不存在则返回 null</returns>
    Task<User?> UpdateUserManagementAsync(string id, UpdateUserManagementRequest request);
    
    /// <summary>
    /// 删除用户（软删除）
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="reason">删除原因（可选）</param>
    /// <returns>是否成功删除</returns>
    Task<bool> DeleteUserAsync(string id, string? reason = null);
    
    /// <summary>
    /// 按名称搜索用户
    /// </summary>
    /// <param name="name">用户名或姓名</param>
    /// <returns>匹配的用户列表</returns>
    Task<List<User>> SearchUsersByNameAsync(string name);
    
    /// <summary>
    /// 分页获取用户列表
    /// </summary>
    /// <param name="request">用户列表请求</param>
    /// <returns>用户列表响应</returns>
    Task<UserListResponse> GetUsersWithPaginationAsync(UserListRequest request);
    
    /// <summary>
    /// 分页获取用户列表（包含角色信息）
    /// </summary>
    /// <param name="request">用户列表请求</param>
    /// <returns>带角色信息的用户列表响应</returns>
    Task<UserListWithRolesResponse> GetUsersWithRolesAsync(UserListRequest request);
    
    /// <summary>
    /// 获取用户统计信息
    /// </summary>
    /// <returns>用户统计信息</returns>
    Task<UserStatisticsResponse> GetUserStatisticsAsync();
    
    /// <summary>
    /// 批量更新用户
    /// </summary>
    /// <param name="request">批量用户操作请求</param>
    /// <param name="reason">操作原因（可选）</param>
    /// <returns>是否成功更新</returns>
    Task<bool> BulkUpdateUsersAsync(BulkUserActionRequest request, string? reason = null);
    
    /// <summary>
    /// 激活用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>是否成功激活</returns>
    Task<bool> ActivateUserAsync(string id);
    
    /// <summary>
    /// 停用用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>是否成功停用</returns>
    Task<bool> DeactivateUserAsync(string id);
    
    /// <summary>
    /// 获取用户活动日志
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="limit">返回数量限制（默认50）</param>
    /// <returns>活动日志列表</returns>
    Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50);
    
    /// <summary>
    /// 获取当前用户的活动日志（分页）
    /// </summary>
    /// <param name="page">页码（默认1）</param>
    /// <param name="pageSize">每页大小（默认20）</param>
    /// <param name="action">操作类型（可选，支持模糊搜索）</param>
    /// <param name="httpMethod">HTTP 请求方法（可选）</param>
    /// <param name="statusCode">HTTP 状态码（可选）</param>
    /// <param name="ipAddress">IP 地址（可选，支持模糊搜索）</param>
    /// <param name="startDate">开始日期（可选）</param>
    /// <param name="endDate">结束日期（可选）</param>
    /// <param name="sortBy">排序字段（可选）</param>
    /// <param name="sortOrder">排序方向（可选）</param>
    /// <returns>活动日志列表和总数</returns>
    Task<(List<UserActivityLog> logs, long total)> GetCurrentUserActivityLogsAsync(int page = 1, int pageSize = 20, string? action = null, string? httpMethod = null, int? statusCode = null, string? ipAddress = null, DateTime? startDate = null, DateTime? endDate = null, string? sortBy = null, string? sortOrder = null);
    
    /// <summary>
    /// 获取当前用户的活动日志详情（根据日志ID）
    /// ✅ 返回完整的日志数据，包括 ResponseBody 等所有字段
    /// </summary>
    /// <param name="logId">日志ID</param>
    /// <returns>活动日志详情，如果不存在或不属于当前用户则返回 null</returns>
    Task<UserActivityLog?> GetCurrentUserActivityLogByIdAsync(string logId);
    
    /// <summary>
    /// 获取所有活动日志（分页，管理员功能）
    /// </summary>
    /// <param name="page">页码（默认1）</param>
    /// <param name="pageSize">每页大小（默认20）</param>
    /// <param name="userId">用户ID（可选，按用户筛选）</param>
    /// <param name="action">操作类型（可选，按操作类型筛选）</param>
    /// <param name="startDate">开始日期（可选，按时间范围筛选）</param>
    /// <param name="endDate">结束日期（可选，按时间范围筛选）</param>
    /// <returns>活动日志列表和总数</returns>
    Task<(List<UserActivityLog> logs, long total)> GetAllActivityLogsAsync(int page = 1, int pageSize = 20, string? userId = null, string? action = null, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// 获取所有活动日志（包含用户信息，分页，管理员功能）
    /// </summary>
    /// <param name="page">页码（默认1）</param>
    /// <param name="pageSize">每页大小（默认20）</param>
    /// <param name="userId">用户ID（可选，按用户筛选）</param>
    /// <param name="action">操作类型（可选，按操作类型筛选）</param>
    /// <param name="startDate">开始日期（可选，按时间范围筛选）</param>
    /// <param name="endDate">结束日期（可选，按时间范围筛选）</param>
    /// <returns>活动日志列表、总数和用户映射</returns>
    Task<(List<UserActivityLog> logs, long total, Dictionary<string, string> userMap)> GetAllActivityLogsWithUsersAsync(int page = 1, int pageSize = 20, string? userId = null, string? action = null, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// 记录用户活动日志
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="action">操作类型</param>
    /// <param name="description">操作描述</param>
    /// <param name="ipAddress">IP地址（可选）</param>
    /// <param name="userAgent">用户代理（可选）</param>
    Task LogUserActivityAsync(string userId, string action, string description, string? ipAddress = null, string? userAgent = null);
    
    /// <summary>
    /// 更新用户个人资料
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="request">更新个人资料请求</param>
    /// <returns>更新后的用户信息，如果不存在则返回 null</returns>
    Task<User?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request);
    
    /// <summary>
    /// 修改用户密码
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="request">修改密码请求</param>
    /// <returns>是否成功修改</returns>
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    
    /// <summary>
    /// 检查邮箱是否已存在
    /// </summary>
    /// <param name="email">邮箱地址</param>
    /// <param name="excludeUserId">排除的用户ID（用于更新时排除自己）</param>
    /// <returns>是否存在</returns>
    Task<bool> CheckEmailExistsAsync(string email, string? excludeUserId = null);
    
    /// <summary>
    /// 检查用户名是否已存在
    /// </summary>
    /// <param name="username">用户名</param>
    /// <param name="excludeUserId">排除的用户ID（用于更新时排除自己）</param>
    /// <returns>是否存在</returns>
    Task<bool> CheckUsernameExistsAsync(string username, string? excludeUserId = null);
    
    /// <summary>
    /// 获取用户权限
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>用户权限信息</returns>
    Task<object> GetUserPermissionsAsync(string userId);

    /// <summary>
    /// 获取用户的 AI 角色定义
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>AI 角色定义，如果不存在则返回默认值</returns>
    Task<string> GetAiRoleDefinitionAsync(string userId);

    /// <summary>
    /// 更新用户的 AI 角色定义
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="roleDefinition">角色定义</param>
    /// <returns>是否成功更新</returns>
    Task<bool> UpdateAiRoleDefinitionAsync(string userId, string roleDefinition);
}

