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
  /** 其他字段（如级联过滤等） */
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
 * 将前端 camelCase 的 PageParams 转换为后端 PascalCase 的请求参数
 * 会自动处理 searchStart/searchEnd 等字段映射
 */
export function toBackendPageParams(params: PageParams): Record<string, any> {
  const result: Record<string, any> = {};
  
  // 处理基础分页参数的映射
  const mapping: Record<string, string> = {
    page: 'Page',
    pageSize: 'PageSize',
    sortBy: 'SortBy',
    sortOrder: 'SortOrder',
    search: 'Search',
  };

  for (const [key, value] of Object.entries(params)) {
    // 忽略 undefined 和 null
    if (value === undefined || value === null) continue;

    const backendKey = mapping[key] || (key.charAt(0).toUpperCase() + key.slice(1));
    
    // 特殊处理日期范围映射 (searchStart -> StartDate, searchEnd -> EndDate)
    if (backendKey === 'SearchStart') {
      result['StartDate'] = value;
    } else if (backendKey === 'SearchEnd') {
      result['EndDate'] = value;
    } else {
      result[backendKey] = value;
    }
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
