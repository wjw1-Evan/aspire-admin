/**
 * 统一分页查询参数类型
 * 与后端 Platform.ServiceDefaults.Models.PageParams 完全一致
 */

export interface PageParams {
  /** 当前页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: string;
  /** 搜索关键词 */
  search?: string;
  [key: string]: any;
}

/**
 * 分页响应结果
 */
export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}

/**
 * 创建默认 PageParams
 */
export function createPageParams(overrides?: Partial<PageParams>): PageParams {
  return {
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: '',
    ...overrides,
  };
}

/**
 * 后端使用 PascalCase，转换为请求参数
 */
export function toRequestParams(params: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    result[pascalKey] = value;
  }
  return result;
}

/**
 * 从 ProTable 的 sort 参数转换
 */
export function parseProTableSort(
  sort: Record<string, 'ascend' | 'descend'> | undefined,
): { sortBy?: string; sortOrder?: string } {
  if (!sort || Object.keys(sort).length === 0) {
    return {};
  }
  const sortKey = Object.keys(sort)[0];
  const sortValue = sort[sortKey];
  return {
    sortBy: sortKey,
    sortOrder: sortValue === 'ascend' ? 'asc' : 'desc',
  };
}
