namespace Platform.ApiService.Constants;

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
/// 通用错误消息
/// </summary>
public static class ErrorMessages
{
    // 通用操作消息
    public const string OperationSuccess = "操作成功";
    public const string OperationFailed = "操作失败";
    public const string CreateSuccess = "创建成功";
    public const string UpdateSuccess = "更新成功";
    public const string DeleteSuccess = "删除成功";
    
    // 资源相关
    public const string ResourceNotFound = "{0}不存在";
    public const string ResourceAlreadyExists = "{0}已存在";
    
    // 参数验证
    public const string ParameterRequired = "{0}不能为空";
    public const string ParameterInvalid = "{0}格式不正确";
    public const string ParameterTooLong = "{0}长度不能超过{1}个字符";
    public const string ParameterTooShort = "{0}长度不能少于{1}个字符";
    
    // 权限相关
    public const string Unauthorized = "无权执行此操作";
    public const string PermissionDenied = "权限不足";
    public const string NotAuthenticated = "未找到用户信息";
    
    // 用户相关
    public const string UsernameExists = "用户名已存在";
    public const string EmailExists = "邮箱已存在";
    public const string PhoneExists = "手机号已存在";
    public const string UserNotFound = "用户不存在";
    public const string InvalidCredentials = "用户名或密码错误";
    public const string UserInactive = "用户已被禁用";
    public const string CannotDeleteSelf = "不能删除自己的账户";
    public const string CannotModifyOwnRole = "不能修改自己的角色";
    
    // 角色相关
    public const string RoleNotFound = "角色不存在";
    public const string RoleNameExists = "角色名称已存在";
    public const string SystemRoleCannotDelete = "不能删除系统管理员角色";
    public const string CannotRemoveLastAdmin = "不能移除最后一个管理员的角色";
    
    // 菜单相关
    public const string MenuNotFound = "菜单不存在";
    public const string MenuNameExists = "菜单名称已存在";
    public const string CannotDeleteMenuWithChildren = "不能删除有子菜单的菜单，请先删除子菜单";
    
    // 通知相关
    public const string NoticeNotFound = "通知不存在";
    
    // 权限相关
    public const string PermissionNotFound = "权限不存在";
    public const string PermissionCodeExists = "权限代码已存在";
    
    // 验证相关
    public const string InvalidEmailFormat = "邮箱格式不正确";
    public const string InvalidPhoneFormat = "手机号格式不正确";
    public const string InvalidUsernameFormat = "用户名格式不正确";
    public const string PasswordTooShort = "密码长度不能少于6个字符";
    public const string PasswordTooLong = "密码长度不能超过50个字符";
    
    // 企业相关
    public const string CompanyNotFound = "企业不存在";
    public const string CompanyCodeExists = "企业代码已存在";
    public const string CompanyExpired = "企业已过期，请联系管理员续费";
    public const string CompanyInactive = "企业未激活，请联系管理员";
    public const string MaxUsersReached = "已达到最大用户数限制";
    public const string InvalidCompanyCode = "企业代码格式不正确";
    public const string CompanyRequired = "未找到企业信息";
}


