import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  Pending = 0,      // 待分配
  Assigned = 1,     // 已分配
  InProgress = 2,   // 执行中
  Completed = 3,    // 已完成
  Cancelled = 4,    // 已取消
  Failed = 5,       // 失败
  Paused = 6        // 暂停
}

/**
 * 任务优先级枚举
 */
export enum TaskPriority {
  Low = 0,      // 低
  Medium = 1,   // 中
  High = 2,     // 高
  Urgent = 3    // 紧急
}

/**
 * 执行结果枚举
 */
export enum TaskExecutionResult {
  NotExecuted = 0,  // 未执行
  Success = 1,      // 成功
  Failed = 2,       // 失败
  Timeout = 3,      // 超时
  Interrupted = 4   // 被中断
}

/**
 * 任务DTO
 */
export interface TaskDto {
  id?: string;
  taskName: string;
  description?: string;
  taskType: string;
  status: number;
  statusName: string;
  priority: number;
  priorityName: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  executionResult: number;
  executionResultName: string;
  completionPercentage: number;
  remarks?: string;
  participantIds: string[];
  participants: ParticipantInfo[];
  tags: string[];
  attachments: TaskAttachmentDto[];
  updatedAt: string;
  updatedBy?: string;
  sortOrder?: number;
  duration?: number;
  projectId?: string;
  projectName?: string;
  children?: TaskDto[];
}

/**
 * 参与者信息
 */
export interface ParticipantInfo {
  userId: string;
  username: string;
  email?: string;
}

/**
 * 任务附件DTO
 */
export interface TaskAttachmentDto {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * 创建任务请求
 */
export interface CreateTaskRequest {
  taskName: string;
  description?: string;
  taskType: string;
  priority?: number;
  assignedTo?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  estimatedDuration?: number;
  participantIds?: string[];
  tags?: string[];
  remarks?: string;
}

/**
 * 更新任务请求
 */
export interface UpdateTaskRequest {
  taskId: string;
  taskName?: string;
  description?: string;
  taskType?: string;
  priority?: number;
  status?: number;
  assignedTo?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  completionPercentage?: number;
  participantIds?: string[];
  tags?: string[];
  remarks?: string;
}

/**
 * 分配任务请求
 */
export interface AssignTaskRequest {
  taskId: string;
  assignedTo: string;
  remarks?: string;
}

/**
 * 执行任务请求
 */
export interface ExecuteTaskRequest {
  taskId: string;
  status?: number;
  message?: string;
  completionPercentage?: number;
}

/**
 * 完成任务请求
 */
export interface CompleteTaskRequest {
  taskId: string;
  executionResult?: number;
  remarks?: string;
  message?: string;
}

/**
 * 任务查询请求
 */
export interface TaskQueryRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  priority?: number;
  assignedTo?: string;
  createdBy?: string;
  taskType?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
  tags?: string[];
  projectId?: string;
}

/**
 * 任务列表响应
 */
export interface TaskListResponse {
  tasks: TaskDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 任务执行日志DTO
 */
export interface TaskExecutionLogDto {
  id?: string;
  taskId: string;
  executedBy: string;
  executedByName?: string;
  startTime: string;
  endTime?: string;
  status: number;
  statusName: string;
  message?: string;
  progressPercentage: number;
  createdAt: string;
}

/**
 * 任务统计信息
 */
export interface TaskStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageCompletionTime: number;
  completionRate: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
}

/**
 * 创建任务
 */
export async function createTask(data: CreateTaskRequest) {
  return request<ApiResponse<TaskDto>>('/api/task/create', {
    method: 'POST',
    data,
  });
}

/**
 * 获取任务详情
 */
export async function getTaskById(taskId: string) {
  return request<ApiResponse<TaskDto>>(`/api/task/${taskId}`, {
    method: 'GET',
  });
}

/**
 * 查询任务列表
 */
export async function queryTasks(data: TaskQueryRequest) {
  return request<ApiResponse<TaskListResponse>>('/api/task/query', {
    method: 'POST',
    data,
  });
}

/**
 * 更新任务
 */
export async function updateTask(data: UpdateTaskRequest) {
  return request<ApiResponse<TaskDto>>('/api/task/update', {
    method: 'PUT',
    data,
  });
}

/**
 * 分配任务
 */
export async function assignTask(data: AssignTaskRequest) {
  return request<ApiResponse<TaskDto>>('/api/task/assign', {
    method: 'POST',
    data,
  });
}

/**
 * 执行任务
 */
export async function executeTask(data: ExecuteTaskRequest) {
  return request<ApiResponse<TaskDto>>('/api/task/execute', {
    method: 'POST',
    data,
  });
}

/**
 * 完成任务
 */
export async function completeTask(data: CompleteTaskRequest) {
  return request<ApiResponse<TaskDto>>('/api/task/complete', {
    method: 'POST',
    data,
  });
}

/**
 * 取消任务
 */
export async function cancelTask(taskId: string, remarks?: string) {
  return request<ApiResponse<TaskDto>>(`/api/task/${taskId}/cancel`, {
    method: 'DELETE',
    params: remarks ? { remarks } : undefined,
  });
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string) {
  return request<ApiResponse<{ message: string }>>(`/api/task/${taskId}`, {
    method: 'DELETE',
  });
}

/**
 * 获取任务统计信息
 */
export async function getTaskStatistics(userId?: string) {
  return request<ApiResponse<TaskStatistics>>('/api/task/statistics', {
    method: 'GET',
    params: userId ? { userId } : undefined,
  });
}

/**
 * 获取任务执行日志
 */
export async function getTaskExecutionLogs(
  taskId: string,
  page: number = 1,
  pageSize: number = 10,
) {
  return request<
    ApiResponse<{
      logs: TaskExecutionLogDto[];
      total: number;
      page: number;
      pageSize: number;
    }>
  >(`/api/task/${taskId}/logs`, {
    method: 'GET',
    params: { page, pageSize },
  });
}

/**
 * 获取用户的待办任务
 */
export async function getMyTodoTasks() {
  return request<ApiResponse<TaskDto[]>>('/api/task/my/todo', {
    method: 'GET',
  });
}

/**
 * 获取用户创建的任务
 */
export async function getMyCreatedTasks(page: number = 1, pageSize: number = 10) {
  return request<
    ApiResponse<{
      tasks: TaskDto[];
      total: number;
      page: number;
      pageSize: number;
    }>
  >('/api/task/my/created', {
    method: 'GET',
    params: { page, pageSize },
  });
}

/**
 * 批量更新任务状态
 */
export async function batchUpdateTaskStatus(taskIds: string[], status: number) {
  return request<ApiResponse<{ message: string }>>('/api/task/batch-update-status', {
    method: 'POST',
    data: { taskIds, status },
  });
}

/**
 * 获取项目的任务树
 */
export async function getTasksByProjectId(projectId: string) {
  return request<ApiResponse<TaskDto[]>>(`/api/task/project/${projectId}`, {
    method: 'GET',
  });
}

/**
 * 获取任务树（支持按项目过滤）
 */
export async function getTaskTree(projectId?: string) {
  return request<ApiResponse<TaskDto[]>>('/api/task/tree', {
    method: 'GET',
    params: projectId ? { projectId } : undefined,
  });
}

/**
 * 更新任务进度
 */
export async function updateTaskProgress(taskId: string, progress: number) {
  return request<ApiResponse<TaskDto>>(`/api/task/${taskId}/progress`, {
    method: 'PUT',
    data: { progress },
  });
}

/**
 * 任务依赖DTO
 */
export interface TaskDependencyDto {
  id?: string;
  predecessorTaskId: string;
  predecessorTaskName?: string;
  successorTaskId: string;
  successorTaskName?: string;
  dependencyType: number;
  dependencyTypeName: string;
  lagDays: number;
}

/**
 * 添加任务依赖请求
 */
export interface AddTaskDependencyRequest {
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType?: number;
  lagDays?: number;
}

/**
 * 添加任务依赖
 */
export async function addTaskDependency(data: AddTaskDependencyRequest) {
  return request<ApiResponse<{ id: string }>>('/api/task/dependency', {
    method: 'POST',
    data,
  });
}

/**
 * 移除任务依赖
 */
export async function removeTaskDependency(dependencyId: string) {
  return request<ApiResponse<{ message: string }>>(`/api/task/dependency/${dependencyId}`, {
    method: 'DELETE',
  });
}

/**
 * 获取任务依赖关系
 */
export async function getTaskDependencies(taskId: string) {
  return request<ApiResponse<TaskDependencyDto[]>>(`/api/task/${taskId}/dependencies`, {
    method: 'GET',
  });
}

/**
 * 获取关键路径
 */
export async function getCriticalPath(projectId: string) {
  return request<ApiResponse<string[]>>(`/api/task/project/${projectId}/critical-path`, {
    method: 'GET',
  });
}

