import { apiClient } from './api';
import { ApiResponse, PagedResult } from '../types/api';
import {
  TaskDto,
  TaskStatistics,
  TaskExecutionLogDto,
  CreateTaskRequest,
  UpdateTaskRequest,
  ExecuteTaskRequest,
  CompleteTaskRequest,
  TaskQueryParams,
} from '../types/task';

export const taskService = {
  async getTaskList(params: TaskQueryParams): Promise<ApiResponse<PagedResult<TaskDto>>> {
    return await apiClient.get<any, ApiResponse<PagedResult<TaskDto>>>('/api/task/list', {
      params,
    });
  },

  async getTaskById(id: string): Promise<ApiResponse<TaskDto>> {
    return await apiClient.get<any, ApiResponse<TaskDto>>(`/api/task/${id}`);
  },

  async createTask(data: CreateTaskRequest): Promise<ApiResponse<TaskDto>> {
    return await apiClient.post<any, ApiResponse<TaskDto>>('/api/task/create', data);
  },

  async updateTask(data: UpdateTaskRequest): Promise<ApiResponse<TaskDto>> {
    return await apiClient.put<any, ApiResponse<TaskDto>>('/api/task/update', data);
  },

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return await apiClient.delete<any, ApiResponse<void>>(`/api/task/${id}`);
  },

  async cancelTask(id: string): Promise<ApiResponse<void>> {
    return await apiClient.delete<any, ApiResponse<void>>(`/api/task/${id}/cancel`);
  },

  async executeTask(data: ExecuteTaskRequest): Promise<ApiResponse<void>> {
    return await apiClient.post<any, ApiResponse<void>>('/api/task/execute', data);
  },

  async completeTask(data: CompleteTaskRequest): Promise<ApiResponse<void>> {
    return await apiClient.post<any, ApiResponse<void>>('/api/task/complete', data);
  },

  async getTaskLogs(taskId: string): Promise<ApiResponse<TaskExecutionLogDto[]>> {
    return await apiClient.get<any, ApiResponse<TaskExecutionLogDto[]>>(
      `/api/task/${taskId}/logs`
    );
  },

  async getTaskStatistics(): Promise<ApiResponse<TaskStatistics>> {
    return await apiClient.get<any, ApiResponse<TaskStatistics>>('/api/task/statistics');
  },

  async getMyTodoTasks(): Promise<ApiResponse<TaskDto[]>> {
    return await apiClient.get<any, ApiResponse<TaskDto[]>>('/api/task/my/todo');
  },

  async getTasksByProject(projectId: string): Promise<ApiResponse<TaskDto[]>> {
    return await apiClient.get<any, ApiResponse<TaskDto[]>>(
      `/api/task/project/${projectId}`
    );
  },

  async getTaskTree(projectId?: string): Promise<ApiResponse<TaskDto[]>> {
    return await apiClient.get<any, ApiResponse<TaskDto[]>>('/api/task/tree', {
      params: { projectId },
    });
  },
};
