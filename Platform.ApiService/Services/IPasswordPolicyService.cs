namespace Platform.ApiService.Services;

/// <summary>
/// 密码策略服务 - 实施强密码要求
/// </summary>
public interface IPasswordPolicyService
{
    /// <summary>
    /// 验证密码是否符合安全策略
    /// </summary>
    void ValidatePassword(string password);
}
