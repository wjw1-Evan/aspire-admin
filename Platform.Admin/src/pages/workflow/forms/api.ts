import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';
import { FormDefinition, FormVersion, FormStatistics } from './types';

export const api = {
    list: (params: any) => request<ApiResponse<PagedResult<FormDefinition>>>('/apiservice/api/forms', { params }),
    get: (id: string) => request<ApiResponse<FormDefinition>>(`/apiservice/api/forms/${id}`),
    create: (data: Partial<FormDefinition>) => request<ApiResponse<FormDefinition>>('/apiservice/api/forms', { method: 'POST', data }),
    update: (id: string, data: Partial<FormDefinition>) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/forms/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<FormStatistics>>('/apiservice/api/forms/statistics'),
    getVersions: (formId: string) => request<ApiResponse<FormVersion[]>>(`/apiservice/api/forms/${formId}/versions`),
    getVersion: (versionId: string) => request<ApiResponse<FormVersion>>(`/apiservice/api/forms/version/${versionId}`),
};
