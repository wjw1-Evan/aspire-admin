namespace Platform.ApiService.Constants;

/// <summary>
/// 错误码常量
/// </summary>
public static class ErrorCodes
{
    // 系统级
    public const string OK = "OK";
    public const string VALIDATION_ERROR = "VALIDATION_ERROR";
    public const string UNAUTHORIZED = "UNAUTHORIZED";
    public const string FORBIDDEN = "FORBIDDEN";
    public const string NOT_FOUND = "NOT_FOUND";
    public const string INTERNAL_ERROR = "INTERNAL_ERROR";
    public const string BUSINESS_ERROR = "BUSINESS_ERROR";
    public const string ALREADY_EXISTS = "ALREADY_EXISTS";

    // 认证授权
    public const string INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public const string CAPTCHA_REQUIRED = "CAPTCHA_REQUIRED";
    public const string CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN = "CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN";
    public const string CAPTCHA_INVALID = "CAPTCHA_INVALID";
    public const string REFRESH_TOKEN_EMPTY = "REFRESH_TOKEN_EMPTY";
    public const string REFRESH_TOKEN_INVALID = "REFRESH_TOKEN_INVALID";
    public const string REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED";
    public const string REFRESH_TOKEN_REVOKED = "REFRESH_TOKEN_REVOKED";
    public const string REFRESH_TOKEN_USER_NOT_FOUND = "REFRESH_TOKEN_USER_NOT_FOUND";
    public const string INVALID_OLD_PASSWORD = "INVALID_OLD_PASSWORD";
    public const string COMPANY_INACTIVE = "COMPANY_INACTIVE";
    public const string COMPANY_EXPIRED = "COMPANY_EXPIRED";

    // 用户
    public const string USER_NOT_FOUND = "USER_NOT_FOUND";
    public const string USER_NAME_EXISTS = "USER_NAME_EXISTS";
    public const string EMAIL_EXISTS = "EMAIL_EXISTS";
    public const string PHONE_NUMBER_EXISTS = "PHONE_NUMBER_EXISTS";
    public const string CHANGE_PASSWORD_FAILED = "CHANGE_PASSWORD_FAILED";
    public const string USER_NOT_AUTHENTICATED = "USER_NOT_AUTHENTICATED";

    // 企业
    public const string COMPANY_NOT_FOUND = "COMPANY_NOT_FOUND";
    public const string COMPANY_NOT_MEMBER = "COMPANY_NOT_MEMBER";
    public const string COMPANY_CREATOR_CANNOT_LEAVE = "COMPANY_CREATOR_CANNOT_LEAVE";
    public const string COMPANY_SOLE_ADMIN_CANNOT_LEAVE = "COMPANY_SOLE_ADMIN_CANNOT_LEAVE";

    // 文件存储
    public const string DELETE_FAILED = "DELETE_FAILED";
    public const string MOVE_FAILED = "MOVE_FAILED";
    public const string COPY_FAILED = "COPY_FAILED";
    public const string SET_QUOTA_FAILED = "SET_QUOTA_FAILED";
    public const string DELETE_QUOTA_FAILED = "DELETE_QUOTA_FAILED";
    public const string CLEANUP_FAILED = "CLEANUP_FAILED";
    public const string GENERATE_THUMBNAIL_FAILED = "GENERATE_THUMBNAIL_FAILED";
    public const string DELETE_SHARE_FAILED = "DELETE_SHARE_FAILED";

    // 工作流
    public const string VARIABLE_SANITIZATION_FAILED = "VARIABLE_SANITIZATION_FAILED";
    public const string START_FAILED = "START_FAILED";

    // 验证码邮件
    public const string SEND_EMAIL_FAILED = "SEND_EMAIL_FAILED";
    public const string CODE_EXPIRED = "CODE_EXPIRED";
    public const string INVALID_CODE = "INVALID_CODE";

    // 其他
    public const string SAVE_FAILED = "SAVE_FAILED";
    public const string UPDATE_FAILED = "UPDATE_FAILED";
    public const string SERVER_ERROR = "SERVER_ERROR";
}
