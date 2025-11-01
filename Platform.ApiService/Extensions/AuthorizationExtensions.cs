using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 权限验证扩展方法 - 提取常用的管理员权限验证逻辑
/// </summary>
public static class AuthorizationExtensions
{
    /// <summary>
    /// 验证指定用户是否为指定企业的管理员
    /// 这是最常用的权限验证模式，用于验证当前用户或其他用户
    /// </summary>
    /// <param name="userCompanyService">用户企业服务实例</param>
    /// <param name="userId">要验证的用户ID（通常从 _factory.GetRequiredUserId() 获取）</param>
    /// <param name="companyId">要验证的企业ID</param>
    /// <param name="message">错误消息（默认值）</param>
    /// <returns>如果是管理员返回 true，否则抛出异常</returns>
    /// <exception cref="UnauthorizedAccessException">当不是管理员时抛出</exception>
    /// <example>
    /// <code>
    /// // 在服务方法中使用
    /// var currentUserId = _factory.GetRequiredUserId();
    /// await _userCompanyService.RequireAdminAsync(currentUserId, companyId);
    /// // 继续执行管理员操作
    /// </code>
    /// </example>
    public static async Task<bool> RequireAdminAsync(
        this Services.IUserCompanyService userCompanyService,
        string userId,
        string companyId,
        string message = "只有企业管理员可以执行此操作")
    {
        var isAdmin = await userCompanyService.IsUserAdminInCompanyAsync(userId, companyId);
        
        if (!isAdmin)
        {
            throw new UnauthorizedAccessException(message);
        }
        
        return true;
    }
    
    /// <summary>
    /// 验证是否为管理员并提供自定义错误消息生成器
    /// </summary>
    /// <param name="userCompanyService">用户企业服务实例</param>
    /// <param name="userId">要验证的用户ID</param>
    /// <param name="companyId">要验证的企业ID</param>
    /// <param name="messageFactory">错误消息生成函数</param>
    /// <returns>如果是管理员返回 true，否则抛出异常</returns>
    public static async Task<bool> RequireAdminAsync(
        this Services.IUserCompanyService userCompanyService,
        string userId,
        string companyId,
        Func<string> messageFactory)
    {
        var isAdmin = await userCompanyService.IsUserAdminInCompanyAsync(userId, companyId);
        
        if (!isAdmin)
        {
            throw new UnauthorizedAccessException(messageFactory());
        }
        
        return true;
    }
}

