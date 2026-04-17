/**
 * API 响应类型定义
 *
 * 提供前后端 API 交互的统一类型定义
 * - ApiResponse: 通用 HTTP 响应包装
 * - PagedResult: 分页数据响应
 * - PageParams: 分页查询参数
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
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  details?: any;
  timestamp?: string;
  traceId?: string;
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
 * { page: 2, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' ，search: 'keyword'}
 */
export interface PageParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}
