/**
 * 前端错误码常量 - 与后端 ErrorCodes.cs 保持一致
 */

/** 用户名或密码错误 */
export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';

/** 需要验证码 */
export const CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED';

/** 登录失败后需要验证码 */
export const CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN = 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN';

/** 验证码无效 */
export const CAPTCHA_INVALID = 'CAPTCHA_INVALID';

/** 用户名已存在 */
export const USER_NAME_EXISTS = 'USER_NAME_EXISTS';

/** 邮箱已存在 */
export const EMAIL_EXISTS = 'EMAIL_EXISTS';

/** 服务器错误 */
export const SERVER_ERROR = 'SERVER_ERROR';

/** 登录相关已知错误码 */
export const LOGIN_KNOWN_ERRORS = [
  INVALID_CREDENTIALS,
  CAPTCHA_INVALID,
  CAPTCHA_REQUIRED,
  CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN,
] as const;

/** 注册相关已知错误码 */
export const REGISTER_KNOWN_ERRORS = [
  USER_NAME_EXISTS,
  EMAIL_EXISTS,
  CAPTCHA_INVALID,
  CAPTCHA_REQUIRED,
  SERVER_ERROR,
] as const;
