/**
 * 前端错误码常量 - 与后端 ErrorCode.cs 完全一致
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

/** 原密码错误 */
export const INVALID_OLD_PASSWORD = 'INVALID_OLD_PASSWORD';

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

/** 用户未认证 */
export const USER_NOT_AUTHENTICATED = 'USER_NOT_AUTHENTICATED';

// ─────────────��────────────────────────────────
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

/** 企业不存在 */
export const COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND';

/** 企业未激活 */
export const COMPANY_INACTIVE = 'COMPANY_INACTIVE';

/** 企业已过期 */
export const COMPANY_EXPIRED = 'COMPANY_EXPIRED';

// ──────────────────────────────────────────────
// 文件相关 (File)
// ──────────────────────────────────────────────

/** 头像数据过大 */
export const AVATAR_TOO_LARGE = 'AVATAR_TOO_LARGE';

// ──────────────────────────────────────────────
// 角色/权限相关 (Role/Permission)
// ──────────────────────────────────────────────

/** 角色不存在 */
export const ROLE_NOT_FOUND = 'ROLE_NOT_FOUND';

/** 角色名称已存在 */
export const ROLE_NAME_EXISTS = 'ROLE_NAME_EXISTS';

/** 不能删除系统管理员角色 */
export const SYSTEM_ROLE_CANNOT_DELETE = 'SYSTEM_ROLE_CANNOT_DELETE';

/** 不能移除最后一个管理员的角色 */
export const CANNOT_REMOVE_LAST_ADMIN = 'CANNOT_REMOVE_LAST_ADMIN';

/** 权限不存在 */
export const PERMISSION_NOT_FOUND = 'PERMISSION_NOT_FOUND';

/** 权限代码已存在 */
export const PERMISSION_CODE_EXISTS = 'PERMISSION_CODE_EXISTS';

// ──────────────────────────────────────────────
// 菜单/通知相关 (Menu/Notice)
// ──────────────────────────────────────────────

/** 菜单不存在 */
export const MENU_NOT_FOUND = 'MENU_NOT_FOUND';

/** 菜单名称已存在 */
export const MENU_NAME_EXISTS = 'MENU_NAME_EXISTS';

/** 不能删除有子菜单的菜单 */
export const CANNOT_DELETE_MENU_WITH_CHILDREN = 'CANNOT_DELETE_MENU_WITH_CHILDREN';

/** 通知不存在 */
export const NOTICE_NOT_FOUND = 'NOTICE_NOT_FOUND';

// ──────────────────────────────────────────────
// 用户/企业扩展 (User/Company Extended)
// ──────────────────────────────────────────────

/** 用户已被禁用 */
export const USER_INACTIVE = 'USER_INACTIVE';

/** 不能删除自己的账户 */
export const CANNOT_DELETE_SELF = 'CANNOT_DELETE_SELF';

/** 不能修改自己的角色 */
export const CANNOT_MODIFY_OWN_ROLE = 'CANNOT_MODIFY_OWN_ROLE';

/** 已达到最大用户数限制 */
export const MAX_USERS_REACHED = 'MAX_USERS_REACHED';

/** 企业代码已存在 */
export const COMPANY_CODE_EXISTS = 'COMPANY_CODE_EXISTS';

/** 企业代码格式不正确 */
export const INVALID_COMPANY_CODE = 'INVALID_COMPANY_CODE';

/** 未找到企业信息 */
export const COMPANY_REQUIRED = 'COMPANY_REQUIRED';

// ──────────────────���───────────────────────────
// 组织架构相关 (Organization)
// ──────────────────────────────────────────────

/** 组织节点不存在 */
export const ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND';

/** 组织节点名称已存在 */
export const ORGANIZATION_NAME_EXISTS = 'ORGANIZATION_NAME_EXISTS';

/** 组织节点编码已存在 */
export const ORGANIZATION_CODE_EXISTS = 'ORGANIZATION_CODE_EXISTS';

/** 父级不能是当前节点 */
export const PARENT_CANNOT_BE_SELF = 'PARENT_CANNOT_BE_SELF';

/** 父级不能是当前节点的子节点 */
export const PARENT_CANNOT_BE_DESCENDANT = 'PARENT_CANNOT_BE_DESCENDANT';

/** 请先删除下级节点后再删除当前节点 */
export const CANNOT_DELETE_WITH_CHILDREN = 'CANNOT_DELETE_WITH_CHILDREN';

// ──────────────────────────────────────────────
// 格式验证相关 (Format Validation)
// ──────────────────────────────────────────────

/** 邮箱格式不正确 */
export const INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT';

/** 手机号格式不正确 */
export const INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT';

/** 用户名格式不正确 */
export const INVALID_USERNAME_FORMAT = 'INVALID_USERNAME_FORMAT';

/** 密码长度过短 */
export const PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT';

/** 密码长度过长 */
export const PASSWORD_TOO_LONG = 'PASSWORD_TOO_LONG';

// ──────────────────────────────────────────────
// 通用操作 (General Operation)
// ──────────────────────────────────────────────

/** 操作失败 */
export const OPERATION_FAILED = 'OPERATION_FAILED';

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

/** 所有错误码常量（用于类型检查） */
export const ALL_ERROR_CODES = [
  // 认证
  UNAUTHENTICATED,
  INVALID_TOKEN,
  TOKEN_EXPIRED,
  USER_INFO_INVALID,
  INVALID_CREDENTIALS,
  CAPTCHA_REQUIRED,
  CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN,
  CAPTCHA_INVALID,
  // 授权
  UNAUTHORIZED_ACCESS,
  FORBIDDEN,
  MENU_ACCESS_DENIED,
  MENU_SERVICE_NOT_CONFIGURED,
  VIEW_PERMISSION_DENIED,
  // 验证
  VALIDATION_ERROR,
  INVALID_OLD_PASSWORD,
  // 资源
  RESOURCE_NOT_FOUND,
  // 业务
  INVALID_OPERATION,
  OPERATION_NOT_SUPPORTED,
  USER_NAME_EXISTS,
  EMAIL_EXISTS,
  PHONE_NUMBER_EXISTS,
  USER_NOT_FOUND,
  USER_NOT_AUTHENTICATED,
  // 企业
  COMPANY_NOT_MEMBER,
  COMPANY_CREATOR_CANNOT_LEAVE,
  COMPANY_SOLE_ADMIN_CANNOT_LEAVE,
  CURRENT_COMPANY_NOT_FOUND,
  COMPANY_NOT_FOUND,
  COMPANY_INACTIVE,
  COMPANY_EXPIRED,
  // 文件
  AVATAR_TOO_LARGE,
  // 角色/权限
  ROLE_NOT_FOUND,
  ROLE_NAME_EXISTS,
  SYSTEM_ROLE_CANNOT_DELETE,
  CANNOT_REMOVE_LAST_ADMIN,
  PERMISSION_NOT_FOUND,
  PERMISSION_CODE_EXISTS,
  // 菜单/通知
  MENU_NOT_FOUND,
  MENU_NAME_EXISTS,
  CANNOT_DELETE_MENU_WITH_CHILDREN,
  NOTICE_NOT_FOUND,
  // 用户/企业扩展
  USER_INACTIVE,
  CANNOT_DELETE_SELF,
  CANNOT_MODIFY_OWN_ROLE,
  MAX_USERS_REACHED,
  COMPANY_CODE_EXISTS,
  INVALID_COMPANY_CODE,
  COMPANY_REQUIRED,
  // 组织架构
  ORGANIZATION_NOT_FOUND,
  ORGANIZATION_NAME_EXISTS,
  ORGANIZATION_CODE_EXISTS,
  PARENT_CANNOT_BE_SELF,
  PARENT_CANNOT_BE_DESCENDANT,
  CANNOT_DELETE_WITH_CHILDREN,
  // 格式验证
  INVALID_EMAIL_FORMAT,
  INVALID_PHONE_FORMAT,
  INVALID_USERNAME_FORMAT,
  PASSWORD_TOO_SHORT,
  PASSWORD_TOO_LONG,
  // 通用操作
  OPERATION_FAILED,
  // 服务器
  SERVER_ERROR,
] as const;

/**
 * 检查是否是已知的 errorCode
 */
export const isKnownErrorCode = (code: string): boolean => {
  return ALL_ERROR_CODES.includes(code as (typeof ALL_ERROR_CODES)[number]);
};