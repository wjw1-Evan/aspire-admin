import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

export interface DashboardVersion {
  id: string;
  dashboardId: string;
  versionNumber: number;
  name: string;
  description?: string;
  layoutType: string;
  theme: string;
  isPublic: boolean;
  cardsSnapshot: string;
  comment?: string;
  isCurrentVersion: boolean;
  changedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardVersionComparison {
  version1Id: string;
  version2Id: string;
  version1?: DashboardVersion;
  version2?: DashboardVersion;
  hasDifferences: boolean;
  comparisonType: string;
  diffContent?: any;
}

export interface DashboardVersionStatistics {
  totalVersions: number;
  currentVersionNumber: number;
}

export interface CreateDashboardVersionRequest {
  comment?: string;
}

const api = {
  // 获取版本列表（分页）
  list: (dashboardId: string, params: any) =>
    request<ApiResponse<PagedResult<DashboardVersion>>>('/apiservice/api/dashboard-version/list', {
      params: { dashboardId, ...params },
    }),

  // 创建版本快照
  create: (dashboardId: string, data?: CreateDashboardVersionRequest) =>
    request<ApiResponse<DashboardVersion>>(`/apiservice/api/dashboard-version/${dashboardId}/versions`, {
      method: 'POST',
      data,
    }),

  // 获取版本历史
  getHistory: (dashboardId: string) =>
    request<ApiResponse<DashboardVersion[]>>(`/apiservice/api/dashboard-version/${dashboardId}/versions`),

  // 获取版本详情
  get: (versionId: string) =>
    request<ApiResponse<DashboardVersion>>(`/apiservice/api/dashboard-version/versions/${versionId}`),

  // 恢复版本
  restore: (dashboardId: string, versionNumber: number) =>
    request<ApiResponse<DashboardVersion>>(
      `/apiservice/api/dashboard-version/${dashboardId}/versions/${versionNumber}/restore`,
      { method: 'POST' },
    ),

  // 删除版本
  delete: (versionId: string) =>
    request<ApiResponse<void>>(`/apiservice/api/dashboard-version/versions/${versionId}`, {
      method: 'DELETE',
    }),

  // 比较版本
  compare: (versionId1: string, versionId2: string) =>
    request<ApiResponse<DashboardVersionComparison>>(
      `/apiservice/api/dashboard-version/versions/${versionId1}/compare/${versionId2}`,
    ),

  // 获取当前版本
  getCurrent: (dashboardId: string) =>
    request<ApiResponse<DashboardVersion>>(`/apiservice/api/dashboard-version/${dashboardId}/current-version`),

  // 设置为当前版本
  setCurrent: (versionId: string) =>
    request<ApiResponse<DashboardVersion>>(`/apiservice/api/dashboard-version/versions/${versionId}/set-current`, {
      method: 'POST',
    }),

  // 获取版本统计
  statistics: (dashboardId: string) =>
    request<ApiResponse<DashboardVersionStatistics>>(`/apiservice/api/dashboard-version/${dashboardId}/statistics`),
};

export default api;
