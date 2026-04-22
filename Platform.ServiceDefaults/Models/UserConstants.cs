namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 用户相关常量
/// </summary>
public static class UserConstants
{
    /// <summary>
    /// 默认管理员角色名称
    /// </summary>
    public const string AdminRoleName = "admin";
    
    /// <summary>
    /// 默认用户角色名称
    /// </summary>
    public const string UserRoleName = "user";
    
    /// <summary>
    /// 默认访客角色名称
    /// </summary>
    public const string GuestRoleName = "guest";
    
    /// <summary>
    /// 系统管理员用户名
    /// </summary>
    public const string SystemAdminUsername = "admin";
}

/// <summary>
/// 排序方向枚举
/// </summary>
public enum SortOrder
{
    /// <summary>
    /// 升序
    /// </summary>
    Ascending,
    
    /// <summary>
    /// 降序
    /// </summary>
    Descending
}

/// <summary>
/// 批量操作类型
/// </summary>
public static class BulkActionTypes
{
    /// <summary>
    /// 激活用户
    /// </summary>
    public const string Activate = "activate";
    
    /// <summary>
    /// 停用用户
    /// </summary>
    public const string Deactivate = "deactivate";
    
    /// <summary>
    /// 删除用户
    /// </summary>
    public const string Delete = "delete";
}

/// <summary>
/// 格式化错误消息（支持 string.Format 占位符）
/// 仅用于需要动态参数的验证消息，固定文本错误消息请使用 ErrorCode 常量
/// </summary>
public static class ErrorMessages
{
    /// <summary>资源不存在（{0} = 资源名称）</summary>
    public const string ResourceNotFound = "{0}不存在";

    /// <summary>资源已存在（{0} = 资源名称）</summary>
    public const string ResourceAlreadyExists = "{0}已存在";

    /// <summary>参数必填（{0} = 参数名称）</summary>
    public const string ParameterRequired = "{0}不能为空";

    /// <summary>参数格式不正确（{0} = 参数名称）</summary>
    public const string ParameterInvalid = "{0}格式不正确";

    /// <summary>参数长度过长（{0} = 参数名称，{1} = 最大长度）</summary>
    public const string ParameterTooLong = "{0}长度不能超过{1}个字符";

    /// <summary>参数长度过短（{0} = 参数名称，{1} = 最小长度）</summary>
    public const string ParameterTooShort = "{0}长度不能少于{1}个字符";
}