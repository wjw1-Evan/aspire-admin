namespace Platform.ApiService.Constants;

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
}

/// <summary>
/// 企业相关错误消息
/// </summary>
public static class CompanyErrorMessages
{
    /// <summary>
    /// 企业不存在错误消息
    /// </summary>
    public const string CompanyNotFound = "企业不存在";
    
    /// <summary>
    /// 企业代码已存在错误消息
    /// </summary>
    public const string CompanyCodeExists = "企业代码已存在";
    
    /// <summary>
    /// 企业已过期错误消息
    /// </summary>
    public const string CompanyExpired = "企业已过期，请联系管理员续费";
    
    /// <summary>
    /// 企业未激活错误消息
    /// </summary>
    public const string CompanyInactive = "企业未激活，请联系管理员";
    
    /// <summary>
    /// 达到最大用户数限制错误消息
    /// </summary>
    public const string MaxUsersReached = "已达到最大用户数限制";
    
    /// <summary>
    /// 企业代码格式不正确错误消息
    /// </summary>
    public const string InvalidCompanyCode = "企业代码格式不正确";
    
    /// <summary>
    /// 未找到企业信息错误消息
    /// </summary>
    public const string CompanyRequired = "未找到企业信息";
}

