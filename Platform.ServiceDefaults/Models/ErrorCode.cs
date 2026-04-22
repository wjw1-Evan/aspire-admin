namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一错误码常量字典
/// 前端通过 errorCode 优先查找 i18n 翻译，message 作为 fallback 显示
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

    // ──────────────────────────────────────────────
    // 文件相关 (File)
    // ──────────────────────────────────────────────

    /// <summary>头像数据过大</summary>
    public const string AvatarTooLarge = "AVATAR_TOO_LARGE";

    // ──────────────────────────────────────────────
    // 服务器错误 (Server)
    // ──────────────────────────────────────────────

    /// <summary>服务器内部错误</summary>
    public const string ServerError = "SERVER_ERROR";
}