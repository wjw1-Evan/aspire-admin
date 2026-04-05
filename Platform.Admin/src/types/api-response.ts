/**
 * API 响应类型定义
 * 
 * 提供前后端 API 交互的统一类型定义
 * - ApiResponse: 通用 HTTP 响应包装
 * - PagedResult: 分页数据响应
 * - PageParams: 分页查询参数
 * - ApiErrorCode: 标准错误代码
 */

/**
 * 统一 API 响应格式
 * 
 * 与后端 Platform.ServiceDefaults.Models.ApiResponse 完全一致
 * 所有 HTTP 请求的响应数据都应包装在此类型中
 * 
 * @template T - 响应数据 data 的类型
 * 
 * @example
 * // 请求用户列表
 * const res = await request<ApiResponse<PagedResult<User>>>(...)
 * if (res.success) {
 *   const users = res.data.queryable;
 * }
 */
export interface ApiResponse<T = any> {
  /** 请求是否成功 */
  success: boolean;
  
  /** 响应消息（成功或错误信息） */
  message?: string;
  
  /** 响应数据（类型为泛型 T） */
  data?: T;
  
  /** 错误详情（验证失败时返回） */
  errors?: any;
  
  /** 附加详情（用于调试或额外信息） */
  details?: any;
  
  /** 服务器时间戳 */
  timestamp?: string;
  
  /** 请求追踪 ID（用于日志排查） */
  traceId?: string;
  
  /** 错误代码 */
  code?: string;
}

/**
 * 分页响应格式
 * 
 * 用于列表类请求的分页数据结构
 * 
 * @template T - 列表项的数据类型
 * 
 * @example
 * {
 *   queryable: [User, User, ...],
 *   currentPage: 1,
 *   pageSize: 20,
 *   rowCount: 100,
 *   pageCount: 5
 * }
 */
export interface PagedResult<T> {
  /** 当前页的数据列表 */
  queryable: T[];
  
  /** 当前页码（从 1 开始） */
  currentPage: number;
  
  /** 每页显示数量 */
  pageSize: number;
  
  /** 总记录数 */
  rowCount: number;
  
  /** 总页数 */
  pageCount: number;
}

/**
 * 分页查询参数
 * 
 * 用于列表请求的分页和排序参数
 * 
 * @example
 * // 查询第 2 页，每页 10 条，按创建时间降序
 * { page: 2, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' }
 */
export interface PageParams {
  /** 当前页码（从 1 开始，默认 1） */
  page?: number;
  
  /** 每页显示数量（默认 10） */
  pageSize?: number;
  
  /** 排序字段名 */
  sortBy?: string;
  
  /** 排序方向：asc（升序）或 desc（降序） */
  sortOrder?: string;
  
  /** 搜索关键词 */
  search?: string;
  
  /** 扩展字段（用于其他过滤条件） */
  [key: string]: any;
}

/**
 * 标准错误代码枚举
 * 
 * 定义系统级的错误代码，便于前端统一处理
 */
export enum ApiErrorCode {
  /** 参数验证失败 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  /** 未授权（未登录或 token 过期） */
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  /** 权限不足 */
  FORBIDDEN = 'FORBIDDEN',
  
  /** 资源不存在 */
  NOT_FOUND = 'NOT_FOUND',
  
  /** 登录失败 */
  LOGIN_FAILED = 'LOGIN_FAILED',
  
  /** Token 过期 */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  /** 服务器内部错误 */
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  /** 用户名已存在 */
  USER_EXISTS = 'USER_EXISTS',
  
  /** 邮箱已存在 */
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  
  /** 当前密码错误 */
  INVALID_CURRENT_PASSWORD = 'INVALID_CURRENT_PASSWORD',
  
  /** 更新操作失败 */
  UPDATE_FAILED = 'UPDATE_FAILED',
  
  /** 注册失败 */
  REGISTER_ERROR = 'REGISTER_ERROR',
  
  /** 修改密码失败 */
  CHANGE_PASSWORD_ERROR = 'CHANGE_PASSWORD_ERROR',
  
  /** 刷新 Token 失败 */
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR',
}
