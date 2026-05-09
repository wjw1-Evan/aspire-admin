import { apiClient } from './api';
import { ApiResponse, PagedResult } from '../types/api';
import {
  ProjectDto,
  ProjectMemberDto,
  ProjectStatistics,
  ProjectDashboardStatistics,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectQueryParams,
} from '../types/project';

export const projectService = {
  async getProjectList(params: ProjectQueryParams): Promise<ApiResponse<PagedResult<ProjectDto>>> {
    return await apiClient.get<any, ApiResponse<PagedResult<ProjectDto>>>('/api/project/list', {
      params,
    });
  },

  async getProjectById(id: string): Promise<ApiResponse<ProjectDto>> {
    return await apiClient.get<any, ApiResponse<ProjectDto>>(`/api/project/${id}`);
  },

  async createProject(data: CreateProjectRequest): Promise<ApiResponse<ProjectDto>> {
    return await apiClient.post<any, ApiResponse<ProjectDto>>('/api/project', data);
  },

  async updateProject(id: string, data: UpdateProjectRequest): Promise<ApiResponse<ProjectDto>> {
    return await apiClient.put<any, ApiResponse<ProjectDto>>(`/api/project/${id}`, data);
  },

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return await apiClient.delete<any, ApiResponse<void>>(`/api/project/${id}`);
  },

  async getProjectStatistics(): Promise<ApiResponse<ProjectStatistics>> {
    return await apiClient.get<any, ApiResponse<ProjectStatistics>>('/api/project/statistics');
  },

  async getDashboardStatistics(
    period?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<ProjectDashboardStatistics>> {
    return await apiClient.get<any, ApiResponse<ProjectDashboardStatistics>>(
      '/api/project/statistics/dashboard',
      { params: { period, startDate, endDate } }
    );
  },

  async getProjectMembers(projectId: string): Promise<ApiResponse<ProjectMemberDto[]>> {
    return await apiClient.get<any, ApiResponse<ProjectMemberDto[]>>(
      `/api/project/${projectId}/members`
    );
  },

  async addProjectMember(
    projectId: string,
    userId: string,
    role?: number
  ): Promise<ApiResponse<void>> {
    return await apiClient.post<any, ApiResponse<void>>(
      `/api/project/${projectId}/members`,
      { userId, role }
    );
  },

  async removeProjectMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    return await apiClient.delete<any, ApiResponse<void>>(
      `/api/project/${projectId}/members/${userId}`
    );
  },
};
