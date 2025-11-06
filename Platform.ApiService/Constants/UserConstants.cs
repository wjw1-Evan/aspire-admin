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
    /// <summary>
    /// 操作成功消息
    /// </summary>
    public const string OperationSuccess = "操作成功";
    
    /// <summary>
    /// 操作失败消息
    /// </summary>
    public const string OperationFailed = "操作失败";
    
    /// <summary>
    /// 创建成功消息
    /// </summary>
    public const string CreateSuccess = "创建成功";
    
    /// <summary>
    /// 更新成功消息
    /// </summary>
    public const string UpdateSuccess = "更新成功";
    
    /// <summary>
    /// 删除成功消息
    /// </summary>
    public const string DeleteSuccess = "删除成功";
    
    /// <summary>
    /// 资源不存在错误消息（支持格式化，{0} 为资源名称）
    /// </summary>
    public const string ResourceNotFound = "{0}不存在";
    
    /// <summary>
    /// 资源已存在错误消息（支持格式化，{0} 为资源名称）
    /// </summary>
    public const string ResourceAlreadyExists = "{0}已存在";
    
    /// <summary>
    /// 参数必填错误消息（支持格式化，{0} 为参数名称）
    /// </summary>
    public const string ParameterRequired = "{0}不能为空";
    
    /// <summary>
    /// 参数格式不正确错误消息（支持格式化，{0} 为参数名称）
    /// </summary>
    public const string ParameterInvalid = "{0}格式不正确";
    
    /// <summary>
    /// 参数长度过长错误消息（支持格式化，{0} 为参数名称，{1} 为最大长度）
    /// </summary>
    public const string ParameterTooLong = "{0}长度不能超过{1}个字符";
    
    /// <summary>
    /// 参数长度过短错误消息（支持格式化，{0} 为参数名称，{1} 为最小长度）
    /// </summary>
    public const string ParameterTooShort = "{0}长度不能少于{1}个字符";
    
    /// <summary>
    /// 未授权错误消息
    /// </summary>
    public const string Unauthorized = "无权执行此操作";
    
    /// <summary>
    /// 权限不足错误消息
    /// </summary>
    public const string PermissionDenied = "权限不足";
    
    /// <summary>
    /// 未认证错误消息
    /// </summary>
    public const string NotAuthenticated = "未找到用户信息";
    
    /// <summary>
    /// 用户名已存在错误消息
    /// </summary>
    public const string UsernameExists = "用户名已存在";
    
    /// <summary>
    /// 邮箱已存在错误消息
    /// </summary>
    public const string EmailExists = "邮箱已存在";
    
    /// <summary>
    /// 手机号已存在错误消息
    /// </summary>
    public const string PhoneExists = "手机号已存在";
    
    /// <summary>
    /// 用户不存在错误消息
    /// </summary>
    public const string UserNotFound = "用户不存在";
    
    /// <summary>
    /// 用户名或密码错误消息
    /// </summary>
    public const string InvalidCredentials = "用户名或密码错误";
    
    /// <summary>
    /// 用户已被禁用错误消息
    /// </summary>
    public const string UserInactive = "用户已被禁用";
    
    /// <summary>
    /// 不能删除自己的账户错误消息
    /// </summary>
    public const string CannotDeleteSelf = "不能删除自己的账户";
    
    /// <summary>
    /// 不能修改自己的角色错误消息
    /// </summary>
    public const string CannotModifyOwnRole = "不能修改自己的角色";
    
    /// <summary>
    /// 角色不存在错误消息
    /// </summary>
    public const string RoleNotFound = "角色不存在";
    
    /// <summary>
    /// 角色名称已存在错误消息
    /// </summary>
    public const string RoleNameExists = "角色名称已存在";
    
    /// <summary>
    /// 不能删除系统管理员角色错误消息
    /// </summary>
    public const string SystemRoleCannotDelete = "不能删除系统管理员角色";
    
    /// <summary>
    /// 不能移除最后一个管理员的角色错误消息
    /// </summary>
    public const string CannotRemoveLastAdmin = "不能移除最后一个管理员的角色";
    
    /// <summary>
    /// 菜单不存在错误消息
    /// </summary>
    public const string MenuNotFound = "菜单不存在";
    
    /// <summary>
    /// 菜单名称已存在错误消息
    /// </summary>
    public const string MenuNameExists = "菜单名称已存在";
    
    /// <summary>
    /// 不能删除有子菜单的菜单错误消息
    /// </summary>
    public const string CannotDeleteMenuWithChildren = "不能删除有子菜单的菜单，请先删除子菜单";
    
    /// <summary>
    /// 通知不存在错误消息
    /// </summary>
    public const string NoticeNotFound = "通知不存在";
    
    /// <summary>
    /// 权限不存在错误消息
    /// </summary>
    public const string PermissionNotFound = "权限不存在";
    
    /// <summary>
    /// 权限代码已存在错误消息
    /// </summary>
    public const string PermissionCodeExists = "权限代码已存在";
    
    /// <summary>
    /// 邮箱格式不正确错误消息
    /// </summary>
    public const string InvalidEmailFormat = "邮箱格式不正确";
    
    /// <summary>
    /// 手机号格式不正确错误消息
    /// </summary>
    public const string InvalidPhoneFormat = "手机号格式不正确";
    
    /// <summary>
    /// 用户名格式不正确错误消息
    /// </summary>
    public const string InvalidUsernameFormat = "用户名格式不正确";
    
    /// <summary>
    /// 密码长度过短错误消息
    /// </summary>
    public const string PasswordTooShort = "密码长度不能少于6个字符";
    
    /// <summary>
    /// 密码长度过长错误消息
    /// </summary>
    public const string PasswordTooLong = "密码长度不能超过50个字符";
    
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


