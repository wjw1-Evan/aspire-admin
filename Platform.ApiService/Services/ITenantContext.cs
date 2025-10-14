namespace Platform.ApiService.Services;

/// <summary>
/// 租户上下文接口
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// 获取当前企业ID（v3.1: 从 user.CurrentCompanyId）
    /// </summary>
    string? GetCurrentCompanyId();

    /// <summary>
    /// 获取当前用户ID
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// 获取当前用户名
    /// </summary>
    string? GetCurrentUsername();
    
    /// <summary>
    /// v3.1: 获取用户所属的所有企业ID列表
    /// </summary>
    Task<List<string>> GetUserCompanyIdsAsync(string userId);
    
    /// <summary>
    /// v3.1: 检查用户是否属于指定企业
    /// </summary>
    Task<bool> IsUserInCompanyAsync(string userId, string companyId);
}

