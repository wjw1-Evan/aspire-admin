namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一错误码常量与消息字典
/// 前端通过 errorCode 优先查找 i18n 翻译，message 作为 fallback 显示
/// 服务层抛异常时使用错误码字符串（如 throw new AuthenticationException(ErrorCode.Unauthenticated)），
/// BusinessExceptionFilter 自动检测已知错误码，将 message 替换为人类可读中文
/// </summary>
public static class ErrorCode
{
    // ──────────────────────────────────────────────
    // 认证相关 (Authentication)
    // ──────────────────────────────────────────────

    /// <summary>未认证（未登录或 Token 无效）</summary>
    public const string Unauthenticated = "UNAUTHENTICATED";

    /// <summary>Token 无效或已过期</summary>
    public const string InvalidToken = "INVALID_TOKEN";

    /// <summary>Token 已过期</summary>
    public const string TokenExpired = "TOKEN_EXPIRED";

    /// <summary>用户信息无效（无法从 Token 中获取用户标识）</summary>
    public const string UserInfoInvalid = "USER_INFO_INVALID";

    /// <summary>用户名或密码错误</summary>
    public const string InvalidCredentials = "INVALID_CREDENTIALS";

    /// <summary>需要验证码</summary>
    public const string CaptchaRequired = "CAPTCHA_REQUIRED";

    /// <summary>登录失败后需要验证码</summary>
    public const string CaptchaRequiredAfterFailedLogin = "CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN";

    /// <summary>验证码无效</summary>
    public const string CaptchaInvalid = "CAPTCHA_INVALID";

    // ──────────────────────────────────────────────
    // 授权相关 (Authorization)
    // ──────────────────────────────────────────────

    /// <summary>无权访问</summary>
    public const string UnauthorizedAccess = "UNAUTHORIZED_ACCESS";

    /// <summary>禁止访问 (403)</summary>
    public const string Forbidden = "FORBIDDEN";

    /// <summary>无权访问指定菜单</summary>
    public const string MenuAccessDenied = "MENU_ACCESS_DENIED";

    /// <summary>菜单访问服务未配置</summary>
    public const string MenuServiceNotConfigured = "MENU_SERVICE_NOT_CONFIGURED";

    /// <summary>无权查看其他用户信息</summary>
    public const string ViewPermissionDenied = "VIEW_PERMISSION_DENIED";

    // ──────────────────────────────────────────────
    // 验证相关 (Validation)
    // ──────────────────────────────────────────────

    /// <summary>请求参数验证失败</summary>
    public const string ValidationError = "VALIDATION_ERROR";

    /// <summary>原密码错误</summary>
    public const string InvalidOldPassword = "INVALID_OLD_PASSWORD";

    // ──────────────────────────────────────────────
    // 资源相关 (Resource)
    // ──────────────────────────────────────────────

    /// <summary>资源不存在</summary>
    public const string ResourceNotFound = "RESOURCE_NOT_FOUND";

    // ──────────────────────────────────────────────
    // 业务操作相关 (Business Operation)
    // ──────────────────────────────────────────────

    /// <summary>无效操作</summary>
    public const string InvalidOperation = "INVALID_OPERATION";

    /// <summary>不支持的操作</summary>
    public const string OperationNotSupported = "OPERATION_NOT_SUPPORTED";

    /// <summary>用户名已存在</summary>
    public const string UserNameExists = "USER_NAME_EXISTS";

    /// <summary>邮箱已存在</summary>
    public const string EmailExists = "EMAIL_EXISTS";

    /// <summary>手机号已存在</summary>
    public const string PhoneNumberExists = "PHONE_NUMBER_EXISTS";

    /// <summary>用户不存在</summary>
    public const string UserNotFound = "USER_NOT_FOUND";

    /// <summary>用户未认证</summary>
    public const string UserNotAuthenticated = "USER_NOT_AUTHENTICATED";

    // ──────────────────────────────────────────────
    // 企业相关 (Company)
    // ──────────────────────────────────────────────

    /// <summary>不是该企业的有效成员</summary>
    public const string CompanyNotMember = "COMPANY_NOT_MEMBER";

    /// <summary>企业创建者不允许退出</summary>
    public const string CompanyCreatorCannotLeave = "COMPANY_CREATOR_CANNOT_LEAVE";

    /// <summary>企业唯一管理员不允许退出</summary>
    public const string CompanySoleAdminCannotLeave = "COMPANY_SOLE_ADMIN_CANNOT_LEAVE";

    /// <summary>未找到当前企业信息</summary>
    public const string CurrentCompanyNotFound = "CURRENT_COMPANY_NOT_FOUND";

    /// <summary>企业不存在</summary>
    public const string CompanyNotFound = "COMPANY_NOT_FOUND";

    /// <summary>企业未激活</summary>
    public const string CompanyInactive = "COMPANY_INACTIVE";

    /// <summary>企业已过期</summary>
    public const string CompanyExpired = "COMPANY_EXPIRED";

    // ──────────────────────────────────────────────
    // 文件相关 (File)
    // ──────────────────────────────────────────────

    /// <summary>头像数据过大</summary>
    public const string AvatarTooLarge = "AVATAR_TOO_LARGE";

    // ──────────────────────────────────────────────
    // 角色/权限相关 (Role/Permission)
    // ──────────────────────────────────────────────

    /// <summary>角色不存在</summary>
    public const string RoleNotFound = "ROLE_NOT_FOUND";

    /// <summary>角色名称已存在</summary>
    public const string RoleNameExists = "ROLE_NAME_EXISTS";

    /// <summary>不能删除系统管理员角色</summary>
    public const string SystemRoleCannotDelete = "SYSTEM_ROLE_CANNOT_DELETE";

    /// <summary>不能移除最后一个管理员的角色</summary>
    public const string CannotRemoveLastAdmin = "CANNOT_REMOVE_LAST_ADMIN";

    /// <summary>权限不存在</summary>
    public const string PermissionNotFound = "PERMISSION_NOT_FOUND";

    /// <summary>权限代码已存在</summary>
    public const string PermissionCodeExists = "PERMISSION_CODE_EXISTS";

    // ──────────────────────────────────────────────
    // 菜单/通知相关 (Menu/Notice)
    // ──────────────────────────────────────────────

    /// <summary>菜单不存在</summary>
    public const string MenuNotFound = "MENU_NOT_FOUND";

    /// <summary>菜单名称已存在</summary>
    public const string MenuNameExists = "MENU_NAME_EXISTS";

    /// <summary>不能删除有子菜单的菜单</summary>
    public const string CannotDeleteMenuWithChildren = "CANNOT_DELETE_MENU_WITH_CHILDREN";

    /// <summary>通知不存在</summary>
    public const string NoticeNotFound = "NOTICE_NOT_FOUND";

    // ──────────────────────────────────────────────
    // 用户/企业扩展 (User/Company Extended)
    // ──────────────────────────────────────────────

    /// <summary>用户已被禁用</summary>
    public const string UserInactive = "USER_INACTIVE";

    /// <summary>不能删除自己的账户</summary>
    public const string CannotDeleteSelf = "CANNOT_DELETE_SELF";

    /// <summary>不能修改自己的角色</summary>
    public const string CannotModifyOwnRole = "CANNOT_MODIFY_OWN_ROLE";

    /// <summary>已达到最大用户数限制</summary>
    public const string MaxUsersReached = "MAX_USERS_REACHED";

    /// <summary>企业代码已存在</summary>
    public const string CompanyCodeExists = "COMPANY_CODE_EXISTS";

    /// <summary>企业代码格式不正确</summary>
    public const string InvalidCompanyCode = "INVALID_COMPANY_CODE";

    /// <summary>未找到企业信息</summary>
    public const string CompanyRequired = "COMPANY_REQUIRED";

    // ──────────────────────────────────────────────
    // 组织架构相关 (Organization)
    // ──────────────────────────────────────────────

    /// <summary>组织节点不存在</summary>
    public const string OrganizationNotFound = "ORGANIZATION_NOT_FOUND";

    /// <summary>组织节点名称已存在</summary>
    public const string OrganizationNameExists = "ORGANIZATION_NAME_EXISTS";

    /// <summary>组织节点编码已存在</summary>
    public const string OrganizationCodeExists = "ORGANIZATION_CODE_EXISTS";

    /// <summary>父级不能是当前节点</summary>
    public const string ParentCannotBeSelf = "PARENT_CANNOT_BE_SELF";

    /// <summary>父级不能是当前节点的子节点</summary>
    public const string ParentCannotBeDescendant = "PARENT_CANNOT_BE_DESCENDANT";

    /// <summary>请先删除下级节点后再删除当前节点</summary>
    public const string CannotDeleteWithChildren = "CANNOT_DELETE_WITH_CHILDREN";

    // ──────────────────────────────────────────────
    // 格式验证相关 (Format Validation)
    // ──────────────────────────────────────────────

    /// <summary>邮箱格式不正确</summary>
    public const string InvalidEmailFormat = "INVALID_EMAIL_FORMAT";

    /// <summary>手机号格式不正确</summary>
    public const string InvalidPhoneFormat = "INVALID_PHONE_FORMAT";

    /// <summary>用户名格式不正确</summary>
    public const string InvalidUsernameFormat = "INVALID_USERNAME_FORMAT";

    /// <summary>密码长度过短</summary>
    public const string PasswordTooShort = "PASSWORD_TOO_SHORT";

    /// <summary>密码长度过长</summary>
    public const string PasswordTooLong = "PASSWORD_TOO_LONG";

    // ──────────────────────────────────────────────
    // 通用操作 (General Operation)
    // ──────────────────────────────────────────────

    /// <summary>操作失败</summary>
    public const string OperationFailed = "OPERATION_FAILED";

    // ──────────────────────────────────────────────
    // 服务器错误 (Server)
    // ──────────────────────────────────────────────

    /// <summary>服务器内部错误</summary>
    public const string ServerError = "SERVER_ERROR";

    // ──────────────────────────────────────────────
    // 错误码 → 人类可读消息字典
    // BusinessExceptionFilter 检测到异常消息为已知错误码时，
    // 自动将 errorCode 设为该错误码，message 设为字典中的中文消息
    // ──────────────────────────────────────────────

    /// <summary>
    /// 错误码对应的人类可读消息字典
    /// key = 错误码字符串，value = 中文 fallback 消息
    /// </summary>
    public static readonly Dictionary<string, string> ErrorMessages = new()
    {
        // 认证
        [Unauthenticated] = "未找到用户认证信息",
        [InvalidCredentials] = "用户名或密码错误",
        [CaptchaRequired] = "请输入验证码",
        [CaptchaRequiredAfterFailedLogin] = "登录失败后需要输入验证码",
        [CaptchaInvalid] = "验证码错误",
        [InvalidToken] = "令牌无效",
        [TokenExpired] = "令牌已过期",
        [UserInfoInvalid] = "用户信息无效",
        // 授权
        [UnauthorizedAccess] = "无权执行此操作",
        [ViewPermissionDenied] = "无权查看其他用户信息",
        [CurrentCompanyNotFound] = "未找到当前企业信息",
        [MenuAccessDenied] = "无权访问指定菜单",
        [MenuServiceNotConfigured] = "菜单访问服务未配置",
        [Forbidden] = "禁止访问",
        // 验证
        [ValidationError] = "请求参数验证失败",
        [InvalidOldPassword] = "原密码错误",
        // 资源
        [ResourceNotFound] = "资源不存在",
        [UserNotFound] = "用户不存在",
        [CompanyNotFound] = "企业不存在",
        // 业务
        [InvalidOperation] = "无效操作",
        [OperationNotSupported] = "不支持的操作",
        [UserNameExists] = "用户名已存在",
        [EmailExists] = "邮箱已存在",
        [PhoneNumberExists] = "手机号已存在",
        [UserNotAuthenticated] = "未找到用户认证信息",
        // 企业
        [CompanyNotMember] = "您不是该企业的有效成员",
        [CompanyCreatorCannotLeave] = "企业创建者不允许退出",
        [CompanySoleAdminCannotLeave] = "企业唯一管理员不允许退出",
        [CompanyInactive] = "企业未激活，请联系管理员",
        [CompanyExpired] = "企业已过期，请联系管理员续费",
        // 角色/权限
        [RoleNotFound] = "角色不存在",
        [RoleNameExists] = "角色名称已存在",
        [SystemRoleCannotDelete] = "不能删除系统管理员角色",
        [CannotRemoveLastAdmin] = "不能移除最后一个管理员的角色",
        [PermissionNotFound] = "权限不存在",
        [PermissionCodeExists] = "权限代码已存在",
        // 菜单/通知
        [MenuNotFound] = "菜单不存在",
        [MenuNameExists] = "菜单名称已存在",
        [CannotDeleteMenuWithChildren] = "不能删除有子菜单的菜单，请先删除子菜单",
        [NoticeNotFound] = "通知不存在",
        // 用户/企业扩展
        [UserInactive] = "用户已被禁用",
        [CannotDeleteSelf] = "不能删除自己的账户",
        [CannotModifyOwnRole] = "不能修改自己的角色",
        [MaxUsersReached] = "已达到最大用户数限制",
        [CompanyCodeExists] = "企业代码已存在",
        [InvalidCompanyCode] = "企业代码格式不正确",
        [CompanyRequired] = "未找到企业信息",
        // 组织架构
        [OrganizationNotFound] = "组织节点不存在",
        [OrganizationNameExists] = "组织节点名称已存在",
        [OrganizationCodeExists] = "组织节点编码已存在",
        [ParentCannotBeSelf] = "父级不能选择当前节点",
        [ParentCannotBeDescendant] = "父级不能选择当前节点的子节点",
        [CannotDeleteWithChildren] = "请先删除下级节点后再删除当前节点",
        // 格式验证
        [InvalidEmailFormat] = "邮箱格式不正确",
        [InvalidPhoneFormat] = "手机号格式不正确",
        [InvalidUsernameFormat] = "用户名格式不正确",
        [PasswordTooShort] = "密码长度不能少于6个字符",
        [PasswordTooLong] = "密码长度不能超过50个字符",
        // 通用操作
        [OperationFailed] = "操作失败",
        // 文件
        [AvatarTooLarge] = "头像数据过大，请选择小于 2MB 的图片",
        // 服务器
        [ServerError] = "服务器内部错误",
    };
}