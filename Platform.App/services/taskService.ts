import api from './api';
import {
  TaskDto,
  CreateTaskRequest,
  UpdateTaskRequest,
  ExecuteTaskRequest,
  CompleteTaskRequest,
  TaskStatistics,
  AssignTaskRequest,
  BatchUpdateTaskStatusRequest,
  TaskExecutionLogDto
} from '../types/task';

export const taskService = {
  /**
   * 获取任务列表
   */
  getTasks: async (params?: {
    page?: number;
    pageSize?: number;
    status?: number;
    priority?: number;
    keyword?: string;
    projectId?: string;
  }) => {
    try {
      const response = await api.get<{ data: TaskDto[]; total: number }>('/api/task/query', { params });
      return {
        success: true,
        data: response.data,
        total: response.total || 0
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取任务列表失败'
      };
    }
  },

  /**
   * 获取任务详情
   */
  getTaskDetail: async (taskId: string) => {
    try {
      const response = await api.get<TaskDto>(`/api/task/${taskId}`);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取任务详情失败'
      };
    }
  },

  /**
   * 创建任务
   */
  createTask: async (data: CreateTaskRequest) => {
    try {
      const response = await api.post<TaskDto>('/api/task/create', data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '创建任务失败'
      };
    }
  },

  /**
   * 更新任务
   */
  updateTask: async (data: UpdateTaskRequest) => {
    try {
      const response = await api.put<TaskDto>(`/api/task/${data.taskId}`, data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '更新任务失败'
      };
    }
  },

  /**
   * 删除任务
   */
  deleteTask: async (taskId: string) => {
    try {
      await api.delete(`/api/task/${taskId}`);
      return {
        success: true,
        message: '删除成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '删除任务失败'
      };
    }
  },

  /**
   * 执行任务（更新状态）
   */
  executeTask: async (data: ExecuteTaskRequest) => {
    try {
      const response = await api.post<TaskDto>('/api/task/execute', data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '执行任务失败'
      };
    }
  },

  /**
   * 完成任务
   */
  completeTask: async (data: CompleteTaskRequest) => {
    try {
      const response = await api.post<TaskDto>('/api/task/complete', data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '完成任务失败'
      };
    }
  },

  /**
   * 分配任务
   */
  assignTask: async (data: AssignTaskRequest) => {
    try {
      const response = await api.post<TaskDto>('/api/task/assign', data);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '分配任务失败'
      };
    }
  },

  /**
   * 批量更新任务状态
   */
  batchUpdateStatus: async (data: BatchUpdateTaskStatusRequest) => {
    try {
      await api.post('/api/task/batch-update-status', data);
      return {
        success: true,
        message: '更新成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '批量更新失败'
      };
    }
  },

  /**
   * 获取任务统计
   */
  getTaskStatistics: async () => {
    try {
      const response = await api.get<TaskStatistics>('/api/task/statistics');
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
   * 获取任务执行日志
   */
  getExecutionLogs: async (taskId: string) => {
    try {
      const response = await api.get<TaskExecutionLogDto[]>(`/api/task/${taskId}/logs`);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取执行日志失败'
      };
    }
  }
};
