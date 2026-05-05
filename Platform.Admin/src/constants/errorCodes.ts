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

/** 文件不存在 */
export const FILE_NOT_FOUND = 'FILE_NOT_FOUND';

/** 文件类型不支持生成缩略图 */
export const FILE_THUMBNAIL_NOT_SUPPORTED = 'FILE_THUMBNAIL_NOT_SUPPORTED';

/** 生成缩略图失败 */
export const FILE_THUMBNAIL_GENERATION_FAILED = 'FILE_THUMBNAIL_GENERATION_FAILED';

/** 缩略图不存在且无法生成 */
export const FILE_THUMBNAIL_NOT_AVAILABLE = 'FILE_THUMBNAIL_NOT_AVAILABLE';

/** 缩略图文件不存在或已被删除 */
export const FILE_THUMBNAIL_DELETED = 'FILE_THUMBNAIL_DELETED';

/** 文件类型不支持预览 */
export const FILE_PREVIEW_NOT_SUPPORTED = 'FILE_PREVIEW_NOT_SUPPORTED';

/** 不支持的预览类型 */
export const FILE_PREVIEW_TYPE_NOT_SUPPORTED = 'FILE_PREVIEW_TYPE_NOT_SUPPORTED';

/** 生成预览失败 */
export const FILE_PREVIEW_GENERATION_FAILED = 'FILE_PREVIEW_GENERATION_FAILED';

/** 模块不能为空 */
export const MODULE_REQUIRED = 'MODULE_REQUIRED';

/** 数据类型不能为空 */
export const DATA_TYPE_REQUIRED = 'DATA_TYPE_REQUIRED';

/** 不支持的模块 */
export const UNSUPPORTED_MODULE = 'UNSUPPORTED_MODULE';

/** 不支持的数据类型 */
export const UNSUPPORTED_DATA_TYPE = 'UNSUPPORTED_DATA_TYPE';

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
  // 公文相关 (Document)
  // ──────────────────────────────────────────────

  /** 公文不存在 */
  export const DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND';

  /** 流程实例不存在 */
  export const WORKFLOW_INSTANCE_NOT_FOUND = 'WORKFLOW_INSTANCE_NOT_FOUND';

  /** 流程定义不存在 */
  export const WORKFLOW_DEFINITION_NOT_FOUND = 'WORKFLOW_DEFINITION_NOT_FOUND';

  /** 表单定义不存在 */
  export const FORM_DEFINITION_NOT_FOUND = 'FORM_DEFINITION_NOT_FOUND';

  /** 公文标题不能为空 */
  export const DOCUMENT_TITLE_REQUIRED = 'DOCUMENT_TITLE_REQUIRED';

  /** 流程定义ID不能为空 */
  export const WORKFLOW_DEFINITION_ID_REQUIRED = 'WORKFLOW_DEFINITION_ID_REQUIRED';

  /** 文档ID不能为空 */
  export const DOCUMENT_ID_REQUIRED = 'DOCUMENT_ID_REQUIRED';

  /** 请求参数不能为空 */
  export const REQUEST_PARAM_REQUIRED = 'REQUEST_PARAM_REQUIRED';

  /** 拒绝原因不能为空 */
  export const REJECT_REASON_REQUIRED = 'REJECT_REASON_REQUIRED';

  /** 退回目标节点不能为空 */
  export const RETURN_TARGET_NODE_REQUIRED = 'RETURN_TARGET_NODE_REQUIRED';

  /** 退回原因不能为空 */
  export const RETURN_REASON_REQUIRED = 'RETURN_REASON_REQUIRED';

  /** 转办目标用户不能为空 */
  export const DELEGATE_TARGET_USER_REQUIRED = 'DELEGATE_TARGET_USER_REQUIRED';

  /** 流程节点未配置表单定义ID */
  export const WORKFLOW_NODE_NOT_CONFIGURED = 'WORKFLOW_NODE_NOT_CONFIGURED';

  /** 流程实例当前无待处理节点 */
  export const NO_PENDING_NODE = 'NO_PENDING_NODE';

  /** 流程图形定义不合法 */
  export const INVALID_WORKFLOW_GRAPH = 'INVALID_WORKFLOW_GRAPH';

  /** 审批节点缺少审批配置 */
  export const APPROVAL_NODE_MISSING_CONFIG = 'APPROVAL_NODE_MISSING_CONFIG';

  /** 审批节点审批人规则不能为空 */
  export const APPROVAL_NODE_EMPTY_APPROVERS = 'APPROVAL_NODE_EMPTY_APPROVERS';

  /** 流程节点不能为空 */
  export const WORKFLOW_NODES_EMPTY = 'WORKFLOW_NODES_EMPTY';

  /** 存在重复的节点ID */
  export const DUPLICATE_NODE_ID = 'DUPLICATE_NODE_ID';

  /** 流程必须包含开始节点 */
  export const MISSING_START_NODE = 'MISSING_START_NODE';

  /** 流程只能包含一个开始节点 */
  export const MULTIPLE_START_NODES = 'MULTIPLE_START_NODES';

  /** 流程必须包含结束节点 */
  export const MISSING_END_NODE = 'MISSING_END_NODE';

  /** 连接线源或目标节点为空 */
  export const EDGE_SOURCE_TARGET_EMPTY = 'EDGE_SOURCE_TARGET_EMPTY';

  /** 连接线源和目标不能相同（不支持自环） */
  export const EDGE_SELF_LOOP_NOT_ALLOWED = 'EDGE_SELF_LOOP_NOT_ALLOWED';

  /** 连接线源节点不存在 */
  export const EDGE_SOURCE_NOT_FOUND = 'EDGE_SOURCE_NOT_FOUND';

  /** 连接线目标节点不存在 */
  export const EDGE_TARGET_NOT_FOUND = 'EDGE_TARGET_NOT_FOUND';

  /** 存在重复的连接线 */
  export const DUPLICATE_EDGE = 'DUPLICATE_EDGE';

  /** 存在从开始节点不可达的节点 */
  export const UNREACHABLE_NODES = 'UNREACHABLE_NODES';

  /** 从开始节点无法到达任何结束节点 */
  export const NO_PATH_TO_END_NODE = 'NO_PATH_TO_END_NODE';

  /** 开始节点没有出边 */
  export const START_NODE_NO_OUTGOING = 'START_NODE_NO_OUTGOING';

  /** 结束节点没有入边 */
  export const END_NODE_NO_INCOMING = 'END_NODE_NO_INCOMING';

  /** 节点没有出边 */
  export const NODE_NO_OUTGOING = 'NODE_NO_OUTGOING';

  /** 节点没有入边 */
  export const NODE_NO_INCOMING = 'NODE_NO_INCOMING';

  /** 不支持的节点类型 */
  export const UNSUPPORTED_NODE_TYPE = 'UNSUPPORTED_NODE_TYPE';

  /** 审批节点超时时间必须为非负数 */
  export const APPROVAL_TIMEOUT_NEGATIVE = 'APPROVAL_TIMEOUT_NEGATIVE';

  /** 条件节点缺少出边 */
  export const CONDITION_NODE_NO_OUTGOING = 'CONDITION_NODE_NO_OUTGOING';

  /** 条件节点的出边需包含条件或默认路径 */
  export const CONDITION_NODE_INVALID_PATHS = 'CONDITION_NODE_INVALID_PATHS';

  // ──────────────────────────────────────────────
  // DataAnnotation 验证错误码 (Validation Attributes)
  // ──────────────────────────────────────────────

  /** 用户名必填 */
  export const VALIDATION_USERNAME_REQUIRED = 'VALIDATION_USERNAME_REQUIRED';

  /** 用户名长度超出限制 */
  export const VALIDATION_USERNAME_TOO_LONG = 'VALIDATION_USERNAME_TOO_LONG';

  /** 用户名长度不足 */
  export const VALIDATION_USERNAME_TOO_SHORT = 'VALIDATION_USERNAME_TOO_SHORT';

  /** 密码必填 */
  export const VALIDATION_PASSWORD_REQUIRED = 'VALIDATION_PASSWORD_REQUIRED';

  /** 密码长度不足 */
  export const VALIDATION_PASSWORD_TOO_SHORT = 'VALIDATION_PASSWORD_TOO_SHORT';

  /** 密码长度超限 */
  export const VALIDATION_PASSWORD_TOO_LONG = 'VALIDATION_PASSWORD_TOO_LONG';

  /** 邮箱必填 */
  export const VALIDATION_EMAIL_REQUIRED = 'VALIDATION_EMAIL_REQUIRED';

  /** 邮箱格式无效 */
  export const VALIDATION_EMAIL_INVALID = 'VALIDATION_EMAIL_INVALID';

  /** 验证码必填 */
  export const VALIDATION_CAPTCHA_REQUIRED = 'VALIDATION_CAPTCHA_REQUIRED';

  /** 验证码长度无效 */
  export const VALIDATION_CAPTCHA_INVALID = 'VALIDATION_CAPTCHA_INVALID';

  /** 当前密码必填 */
  export const VALIDATION_CURRENT_PASSWORD_REQUIRED = 'VALIDATION_CURRENT_PASSWORD_REQUIRED';

  /** 新密码必填 */
  export const VALIDATION_NEW_PASSWORD_REQUIRED = 'VALIDATION_NEW_PASSWORD_REQUIRED';

  /** 确认密码必填 */
  export const VALIDATION_CONFIRM_PASSWORD_REQUIRED = 'VALIDATION_CONFIRM_PASSWORD_REQUIRED';

  /** 刷新令牌必填 */
  export const VALIDATION_REFRESH_TOKEN_REQUIRED = 'VALIDATION_REFRESH_TOKEN_REQUIRED';

  /** 密码和确认密码不一致 */
  export const VALIDATION_PASSWORDS_NOT_MATCH = 'VALIDATION_PASSWORDS_NOT_MATCH';

  /** 角色名称必填 */
  export const VALIDATION_ROLE_NAME_REQUIRED = 'VALIDATION_ROLE_NAME_REQUIRED';

  /** 角色名称长度不足 */
  export const VALIDATION_ROLE_NAME_TOO_SHORT = 'VALIDATION_ROLE_NAME_TOO_SHORT';

  /** 角色名称长度超限 */
  export const VALIDATION_ROLE_NAME_TOO_LONG = 'VALIDATION_ROLE_NAME_TOO_LONG';

  /** 角色描述长度超限 */
  export const VALIDATION_ROLE_DESCRIPTION_TOO_LONG = 'VALIDATION_ROLE_DESCRIPTION_TOO_LONG';

  /** 验证码ID必填 */
  export const VALIDATION_CAPTCHA_ID_REQUIRED = 'VALIDATION_CAPTCHA_ID_REQUIRED';

  /** 验证码答案长度不足 */
  export const VALIDATION_CAPTCHA_ANSWER_TOO_SHORT = 'VALIDATION_CAPTCHA_ANSWER_TOO_SHORT';

  /** 验证码答案长度超限 */
  export const VALIDATION_CAPTCHA_ANSWER_TOO_LONG = 'VALIDATION_CAPTCHA_ANSWER_TOO_LONG';

  /** 验证码答案长度范围无效 */
  export const VALIDATION_CAPTCHA_ANSWER_LENGTH_RANGE = 'VALIDATION_CAPTCHA_ANSWER_LENGTH_RANGE';

  /** 年龄超出有效范围 */
  export const VALIDATION_AGE_RANGE = 'VALIDATION_AGE_RANGE';

  /** 姓名长度超限 */
  export const VALIDATION_NAME_TOO_LONG = 'VALIDATION_NAME_TOO_LONG';

  /** 角色定义必填 */
  export const VALIDATION_ROLE_DEFINITION_REQUIRED = 'VALIDATION_ROLE_DEFINITION_REQUIRED';

  /** 角色定义长度不足 */
  export const VALIDATION_ROLE_DEFINITION_TOO_SHORT = 'VALIDATION_ROLE_DEFINITION_TOO_SHORT';

  /** 角色定义长度超限 */
  export const VALIDATION_ROLE_DEFINITION_TOO_LONG = 'VALIDATION_ROLE_DEFINITION_TOO_LONG';

  /** AI角色无效 */
  export const VALIDATION_AI_ROLE_INVALID = 'VALIDATION_AI_ROLE_INVALID';

  /** 走访日期必填 */
  export const VALIDATION_VISIT_DATE_REQUIRED = 'VALIDATION_VISIT_DATE_REQUIRED';

  /** 头像数据过大 */
  export const VALIDATION_AVATAR_TOO_LARGE = 'VALIDATION_AVATAR_TOO_LARGE';

  /** 用户名长度范围无效 */
  export const VALIDATION_USERNAME_LENGTH_RANGE = 'VALIDATION_USERNAME_LENGTH_RANGE';

  /** 密码长度不符合要求 */
  export const VALIDATION_PASSWORD_INVALID_LENGTH = 'VALIDATION_PASSWORD_INVALID_LENGTH';

  /** 当前密码长度超限 */
  export const VALIDATION_CURRENT_PASSWORD_TOO_LONG = 'VALIDATION_CURRENT_PASSWORD_TOO_LONG';

  /** 角色名称长度范围无效 */
  export const VALIDATION_ROLE_NAME_LENGTH_RANGE = 'VALIDATION_ROLE_NAME_LENGTH_RANGE';

  /** 角色定义长度范围无效 */
  export const VALIDATION_ROLE_DEFINITION_LENGTH_RANGE = 'VALIDATION_ROLE_DEFINITION_LENGTH_RANGE';

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