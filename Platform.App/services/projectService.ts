import api from './api';
import {
  ProjectDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatistics,
  AddProjectMemberRequest,
  ProjectMemberDto
} from '../types/project';

export const projectService = {
  /**
   * 获取项目列表
   */
  getProjects: async (params?: {
    page?: number;
    pageSize?: number;
    status?: number;
    priority?: number;
    keyword?: string;
  }) => {
    try {
      const response = await api.get<{ data: ProjectDto[]; total: number }>('/api/project/query', { params });
      return {
        success: true,
        data: response.data,
        total: response.total || 0
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取项目列表失败'
      };
    }
  },

  /**
   * 获取项目详情
   */
  getProjectDetail: async (projectId: string) => {
    try {
      const response = await api.get<ProjectDto>(`/api/project/${projectId}`);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取项目详情失败'
      };
    }
  },

  /**
   * 创建项目
   */
  createProject: async (data: CreateProjectRequest) => {
    try {
      const response = await api.post<ProjectDto>('/api/project', data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '创建项目失败'
      };
    }
  },

  /**
   * 更新项目
   */
  updateProject: async (data: UpdateProjectRequest) => {
    try {
      const response = await api.put<ProjectDto>(`/api/project/${data.projectId}`, data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '更新项目失败'
      };
    }
  },

  /**
   * 删除项目
   */
  deleteProject: async (projectId: string) => {
    try {
      await api.delete(`/api/project/${projectId}`);
      return {
        success: true,
        message: '删除成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '删除项目失败'
      };
    }
  },

  /**
   * 添加项目成员
   */
  addProjectMember: async (data: AddProjectMemberRequest) => {
    try {
      const response = await api.post<ProjectMemberDto>(`/api/project/${data.projectId}/members`, data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '添加成员失败'
      };
    }
  },

  /**
   * 移除项目成员
   */
  removeProjectMember: async (projectId: string, userId: string) => {
    try {
      await api.delete(`/api/project/${projectId}/members/${userId}`);
      return {
        success: true,
        message: '移除成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '移除成员失败'
      };
    }
  },

  /**
   * 更新项目成员角色
   */
  updateProjectMemberRole: async (projectId: string, userId: string, data: { role: number; allocation: number }) => {
    try {
      const response = await api.put<ProjectMemberDto>(`/api/project/${projectId}/members/${userId}`, data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '更新成员角色失败'
      };
    }
  },

  /**
   * 获取项目统计
   */
  getProjectStatistics: async () => {
    try {
      const response = await api.get<ProjectStatistics>('/api/project/statistics');
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取统计信息失败'
      };
    }
  },

  /**
   * 获取我的项目列表（快速访问）
   */
  getMyProjects: async () => {
    try {
      const response = await api.get<{ data: ProjectDto[]; total: number }>('/api/project/my-projects');
      return {
        success: true,
        data: response.data,
        total: response.total || 0
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取项目列表失败'
      };
    }
  }
};
