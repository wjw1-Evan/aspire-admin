namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 企业相关常量
/// </summary>
public static class CompanyConstants
{
    /// <summary>
    /// 默认最大用户数
    /// </summary>
    public const int DefaultMaxUsers = 100;

    /// <summary>
    /// 企业代码最小长度
    /// </summary>
    public const int MinCompanyCodeLength = 3;

    /// <summary>
    /// 企业代码最大长度
    /// </summary>
    public const int MaxCompanyCodeLength = 20;

    /// <summary>个人企业代码前缀</summary>
    public const string PersonalCompanyCodePrefix = "personal-";

    /// <summary>个人企业名称后缀</summary>
    public const string PersonalCompanyNameSuffix = " 的企业";

    /// <summary>个人企业默认最大用户数</summary>
    public const int DefaultPersonalCompanyMaxUsers = 50;
}