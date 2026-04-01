namespace Platform.ApiService.Constants;

/// <summary>
/// 错误码常量定义 - 集中管理所有业务错误码
/// </summary>
public static class ErrorCodes
{
    // ========== 系统级 ==========
    
    /// <summary>操作成功</summary>
    public const string OK = "OK";
    
    /// <summary>参数验证错误</summary>
    public const string VALIDATION_ERROR = "VALIDATION_ERROR";
    
    /// <summary>未授权/未认证</summary>
    public const string UNAUTHORIZED = "UNAUTHORIZED";
    
    /// <summary>禁止访问/无权限</summary>
    public const string FORBIDDEN = "FORBIDDEN";
    
    /// <summary>资源不存在</summary>
    public const string NOT_FOUND = "NOT_FOUND";
    
    /// <summary>服务器内部错误</summary>
    public const string INTERNAL_ERROR = "INTERNAL_ERROR";
    
    /// <summary>通用业务错误</summary>
    public const string BUSINESS_ERROR = "BUSINESS_ERROR";
    
    /// <summary>资源已存在（冲突）</summary>
    public const string ALREADY_EXISTS = "ALREADY_EXISTS";

    // ========== 认证授权 ==========
    
    /// <summary>用户名或密码错误</summary>
    public const string INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    
    /// <summary>需要验证码</summary>
    public const string CAPTCHA_REQUIRED = "CAPTCHA_REQUIRED";
    
    /// <summary>登录失败后需要验证码</summary>
    public const string CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN = "CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN";
    
    /// <summary>验证码无效</summary>
    public const string CAPTCHA_INVALID = "CAPTCHA_INVALID";
    
    /// <summary>刷新Token为空</summary>
    public const string REFRESH_TOKEN_EMPTY = "REFRESH_TOKEN_EMPTY";
    
    /// <summary>刷新Token无效</summary>
    public const string REFRESH_TOKEN_INVALID = "REFRESH_TOKEN_INVALID";
    
    /// <summary>刷新Token已过期</summary>
    public const string REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED";
    
    /// <summary>刷新Token已被撤销</summary>
    public const string REFRESH_TOKEN_REVOKED = "REFRESH_TOKEN_REVOKED";
    
    /// <summary>无法从刷新Token获取用户信息</summary>
    public const string REFRESH_TOKEN_USER_NOT_FOUND = "REFRESH_TOKEN_USER_NOT_FOUND";
    
    /// <summary>旧密码不正确</summary>
    public const string INVALID_OLD_PASSWORD = "INVALID_OLD_PASSWORD";
    
    /// <summary>企业未激活</summary>
    public const string COMPANY_INACTIVE = "COMPANY_INACTIVE";
    
    /// <summary>企业已过期</summary>
    public const string COMPANY_EXPIRED = "COMPANY_EXPIRED";

    // ========== 用户 ==========
    
    /// <summary>用户不存在或已被禁用</summary>
    public const string USER_NOT_FOUND = "USER_NOT_FOUND";
    
    /// <summary>用户名已存在</summary>
    public const string USER_NAME_EXISTS = "USER_NAME_EXISTS";
    
    /// <summary>邮箱已存在</summary>
    public const string EMAIL_EXISTS = "EMAIL_EXISTS";
    
    /// <summary>手机号已存在</summary>
    public const string PHONE_NUMBER_EXISTS = "PHONE_NUMBER_EXISTS";
    
    /// <summary>修改密码失败</summary>
    public const string CHANGE_PASSWORD_FAILED = "CHANGE_PASSWORD_FAILED";
    
    /// <summary>用户未认证</summary>
    public const string USER_NOT_AUTHENTICATED = "USER_NOT_AUTHENTICATED";

    // ========== 企业 ==========
    
    /// <summary>企业不存在</summary>
    public const string COMPANY_NOT_FOUND = "COMPANY_NOT_FOUND";
    
    /// <summary>不是企业成员</summary>
    public const string COMPANY_NOT_MEMBER = "COMPANY_NOT_MEMBER";
    
    /// <summary>企业创建者不能离开企业</summary>
    public const string COMPANY_CREATOR_CANNOT_LEAVE = "COMPANY_CREATOR_CANNOT_LEAVE";
    
    /// <summary>不能移除最后一个管理员</summary>
    public const string COMPANY_SOLE_ADMIN_CANNOT_LEAVE = "COMPANY_SOLE_ADMIN_CANNOT_LEAVE";

    // ========== 文件存储 ==========
    
    /// <summary>删除失败</summary>
    public const string DELETE_FAILED = "DELETE_FAILED";
    
    /// <summary>移动失败</summary>
    public const string MOVE_FAILED = "MOVE_FAILED";
    
    /// <summary>复制失败</summary>
    public const string COPY_FAILED = "COPY_FAILED";
    
    /// <summary>设置配额失败</summary>
    public const string SET_QUOTA_FAILED = "SET_QUOTA_FAILED";
    
    /// <summary>删除配额失败</summary>
    public const string DELETE_QUOTA_FAILED = "DELETE_QUOTA_FAILED";
    
    /// <summary>清理失败</summary>
    public const string CLEANUP_FAILED = "CLEANUP_FAILED";
    
    /// <summary>生成缩略图失败</summary>
    public const string GENERATE_THUMBNAIL_FAILED = "GENERATE_THUMBNAIL_FAILED";
    
    /// <summary>删除分享失败</summary>
    public const string DELETE_SHARE_FAILED = "DELETE_SHARE_FAILED";

    // ========== 工作流 ==========
    
    /// <summary>流程变量处理失败</summary>
    public const string VARIABLE_SANITIZATION_FAILED = "VARIABLE_SANITIZATION_FAILED";
    
    /// <summary>启动流程失败</summary>
    public const string START_FAILED = "START_FAILED";

    // ========== 验证码邮件 ==========
    
    /// <summary>发送邮件失败</summary>
    public const string SEND_EMAIL_FAILED = "SEND_EMAIL_FAILED";
    
    /// <summary>验证码已过期</summary>
    public const string CODE_EXPIRED = "CODE_EXPIRED";
    
    /// <summary>验证码不正确</summary>
    public const string INVALID_CODE = "INVALID_CODE";

    // ========== 其他 ==========
    
    /// <summary>保存失败</summary>
    public const string SAVE_FAILED = "SAVE_FAILED";
    
    /// <summary>更新失败</summary>
    public const string UPDATE_FAILED = "UPDATE_FAILED";
    
    /// <summary>服务器错误</summary>
    public const string SERVER_ERROR = "SERVER_ERROR";
}
