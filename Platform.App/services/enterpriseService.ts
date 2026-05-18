import { apiClient } from './api';
import { ApiResponse, PagedResult } from '../types/api';
import {
  ServiceRequestDto,
  ServiceStatisticsResponse,
  CreateServiceRequestRequest,
  UpdateServiceRequestStatusRequest,
  RateServiceRequest,
  SuggestCategoryResult,
  ParkTenant,
} from '../types/enterprise-service';

export interface ServiceRequestListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  tenantId?: string;
}

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export const enterpriseService = {
  async getStatistics(): Promise<ApiResponse<ServiceStatisticsResponse>> {
    return await apiClient.get<any, ApiResponse<ServiceStatisticsResponse>>(
      '/api/park/services/statistics',
    );
  },

  async getRequestList(params: ServiceRequestListParams): Promise<ApiResponse<PagedResult<ServiceRequestDto>>> {
    return await apiClient.get<any, ApiResponse<PagedResult<ServiceRequestDto>>>(
      '/api/park/services/requests/list',
      { params },
    );
  },

  async getRequestById(id: string): Promise<ApiResponse<ServiceRequestDto>> {
    return await apiClient.get<any, ApiResponse<ServiceRequestDto>>(
      `/api/park/services/requests/${id}`,
    );
  },

  async createRequest(data: CreateServiceRequestRequest): Promise<ApiResponse<ServiceRequestDto>> {
    return await apiClient.post<any, ApiResponse<ServiceRequestDto>>(
      '/api/park/services/requests',
      data,
    );
  },

  async updateRequest(
    id: string,
    data: CreateServiceRequestRequest,
  ): Promise<ApiResponse<ServiceRequestDto>> {
    return await apiClient.put<any, ApiResponse<ServiceRequestDto>>(
      `/api/park/services/requests/${id}`,
      data,
    );
  },

  async updateRequestStatus(
    id: string,
    data: UpdateServiceRequestStatusRequest,
  ): Promise<ApiResponse<ServiceRequestDto>> {
    return await apiClient.put<any, ApiResponse<ServiceRequestDto>>(
      `/api/park/services/requests/${id}/status`,
      data,
    );
  },

  async deleteRequest(id: string): Promise<ApiResponse<boolean>> {
    return await apiClient.delete<any, ApiResponse<boolean>>(
      `/api/park/services/requests/${id}`,
    );
  },

  async deleteStatusHistory(id: string, index: number): Promise<ApiResponse<boolean>> {
    return await apiClient.delete<any, ApiResponse<boolean>>(
      `/api/park/services/requests/${id}/status-history/${index}`,
    );
  },

  async rateRequest(
    id: string,
    data: RateServiceRequest,
  ): Promise<ApiResponse<boolean>> {
    return await apiClient.post<any, ApiResponse<boolean>>(
      `/api/park/services/requests/${id}/rate`,
      data,
    );
  },

  async getTenantList(params?: TenantListParams): Promise<ApiResponse<PagedResult<ParkTenant>>> {
    return await apiClient.get<any, ApiResponse<PagedResult<ParkTenant>>>(
      '/api/park/tenants/list',
      { params },
    );
  },

  async suggestCategory(description: string): Promise<ApiResponse<SuggestCategoryResult>> {
    return await apiClient.post<any, ApiResponse<SuggestCategoryResult>>(
      '/api/park/services/categories/suggest',
      { description },
    );
  },

  async uploadFile(data: FormData): Promise<ApiResponse<{ id: string; name: string }>> {
    return await apiClient.post<any, ApiResponse<{ id: string; name: string }>>(
      '/api/cloud-storage/upload',
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
