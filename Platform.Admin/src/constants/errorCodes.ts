/**
 * 前端错误码常量 - 与后端 ErrorCode.cs 保持一致
 * errorCode 优先用于 i18n 翻译，message 作为 fallback
 */

// ──────────────────────────────────────────────
// 认证相关 (Authentication)
// ──────────────────────────────────────────────

/** 未认证（未登录或 Token 无效） */
export const UNAUTHENTICATED = 'UNAUTHENTICATED';

/** Token 无效或已过期 */
export const INVALID_TOKEN = 'INVALID_TOKEN';

/** Token 已过期 */
export const TOKEN_EXPIRED = 'TOKEN_EXPIRED';

/** 用户信息无效 */
export const USER_INFO_INVALID = 'USER_INFO_INVALID';

/** 用户名或密码错误 */
export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';

/** 需要验证码 */
export const CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED';

/** 登录失败后需要验证码 */
export const CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN = 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN';

/** 验证码无效 */
export const CAPTCHA_INVALID = 'CAPTCHA_INVALID';

// ──────────────────────────────────────────────
// 授权相关 (Authorization)
// ──────────────────────────────────────────────

/** 无权访问 */
export const UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS';

/** 禁止访问 (403) */
export const FORBIDDEN = 'FORBIDDEN';

/** 无权访问指定菜单 */
export const MENU_ACCESS_DENIED = 'MENU_ACCESS_DENIED';

/** 菜单访问服务未配置 */
export const MENU_SERVICE_NOT_CONFIGURED = 'MENU_SERVICE_NOT_CONFIGURED';

/** 无权查看其他用户信息 */
export const VIEW_PERMISSION_DENIED = 'VIEW_PERMISSION_DENIED';

// ──────────────────────────────────────────────
// 验证相关 (Validation)
// ──────────────────────────────────────────────

/** 请求参数验证失败 */
export const VALIDATION_ERROR = 'VALIDATION_ERROR';

// ──────────────────────────────────────────────
// 资源相关 (Resource)
// ──────────────────────────────────────────────

/** 资源不存在 */
export const RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND';

// ──────────────────────────────────────────────
// 业务操作相关 (Business Operation)
// ──────────────────────────────────────────────

/** 无效操作 */
export const INVALID_OPERATION = 'INVALID_OPERATION';

/** 不支持的操作 */
export const OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED';

/** 用户名已存在 */
export const USER_NAME_EXISTS = 'USER_NAME_EXISTS';

/** 邮箱已存在 */
export const EMAIL_EXISTS = 'EMAIL_EXISTS';

/** 手机号已存在 */
export const PHONE_NUMBER_EXISTS = 'PHONE_NUMBER_EXISTS';

/** 用户不存在 */
export const USER_NOT_FOUND = 'USER_NOT_FOUND';

// ──────────────────────────────────────────────
// 企业相关 (Company)
// ──────────────────────────────────────────────

/** 不是该企业的有效成员 */
export const COMPANY_NOT_MEMBER = 'COMPANY_NOT_MEMBER';

/** 企业创建者不允许退出 */
export const COMPANY_CREATOR_CANNOT_LEAVE = 'COMPANY_CREATOR_CANNOT_LEAVE';

/** 企业唯一管理员不允许退出 */
export const COMPANY_SOLE_ADMIN_CANNOT_LEAVE = 'COMPANY_SOLE_ADMIN_CANNOT_LEAVE';

/** 未找到当前企业信息 */
export const CURRENT_COMPANY_NOT_FOUND = 'CURRENT_COMPANY_NOT_FOUND';

// ──────────────────────────────────────────────
// 文件相关 (File)
// ──────────────────────────────────────────────

/** 头像数据过大 */
export const AVATAR_TOO_LARGE = 'AVATAR_TOO_LARGE';

// ──────────────────────────────────────────────
// 服务器错误 (Server)
// ──────────────────────────────────────────────

/** 服务器内部错误 */
export const SERVER_ERROR = 'SERVER_ERROR';

// ──────────────────────────────────────────────
// 分组
// ──────────────────────────────────────────────

/** 登录相关已知错误码 */
export const LOGIN_KNOWN_ERRORS = [
  INVALID_CREDENTIALS,
  CAPTCHA_REQUIRED,
  CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN,
  CAPTCHA_INVALID,
] as const;

/** 注册相关已知错误码 */
export const REGISTER_KNOWN_ERRORS = [
  USER_NAME_EXISTS,
  EMAIL_EXISTS,
  CAPTCHA_INVALID,
  CAPTCHA_REQUIRED,
  SERVER_ERROR,
] as const;

/** 所有已知错误码 */
export const ALL_KNOWN_ERRORS = [
  ...LOGIN_KNOWN_ERRORS,
  ...REGISTER_KNOWN_ERRORS,
] as const;

/**
 * 检查是否是已知的 errorCode
 */
export const isKnownErrorCode = (code: string): boolean => {
  return ALL_KNOWN_ERRORS.includes(code as any);
};