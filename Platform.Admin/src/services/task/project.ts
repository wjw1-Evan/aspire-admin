import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 项目状态枚举
 */
export enum ProjectStatus {
  Planning = 0,      // 规划中
  InProgress = 1,   // 进行中
  OnHold = 2,       // 暂停
  Completed = 3,    // 已完成
  Cancelled = 4     // 已取消
}

/**
 * 项目优先级枚举
 */
export enum ProjectPriority {
  Low = 0,      // 低
  Medium = 1,   // 中
  High = 2      // 高
}

/**
 * 项目成员角色枚举
 */
export enum ProjectMemberRole {
  Manager = 0,  // 项目经理
  Member = 1,    // 成员
  Viewer = 2     // 查看者
}

/**
 * 项目DTO
 */
export interface ProjectDto {
  id?: string;
  name: string;
  description?: string;
  status: number;
  statusName: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  managerId?: string;
  managerName?: string;
  budget?: number;
  priority: number;
  priorityName: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  updatedAt: string;
}

/**
 * 项目查询请求
 */
export interface ProjectQueryRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  priority?: number;
  managerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * 项目列表响应
 */
export interface ProjectListResponse {
  projects: ProjectDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 创建项目请求
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
  managerId?: string;
  budget?: number;
  priority?: number;
}

/**
 * 更新项目请求
 */
export interface UpdateProjectRequest {
  projectId: string;
  name?: string;
  description?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
  managerId?: string;
  budget?: number;
  priority?: number;
}

/**
 * 项目统计信息
 */
export interface ProjectStatistics {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  delayedProjects: number;
  projectsByStatus: Record<string, number>;
  projectsByPriority: Record<string, number>;
}

/**
 * 项目成员DTO
 */
export interface ProjectMemberDto {
  id?: string;
  projectId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: number;
  roleName: string;
  allocation: number;
  createdAt: string;
}

/**
 * 添加项目成员请求
 */
export interface AddProjectMemberRequest {
  projectId: string;
  userId: string;
  role?: number;
  allocation?: number;
}

/**
 * 获取项目列表
 */
export async function getProjectList(data: ProjectQueryRequest) {
  return request<ApiResponse<ProjectListResponse>>('/api/project/list', {
    method: 'POST',
    data,
  });
}

/**
 * 获取项目详情
 */
export async function getProjectById(projectId: string) {
  return request<ApiResponse<ProjectDto>>(`/api/project/${projectId}`, {
    method: 'GET',
  });
}

/**
 * 创建项目
 */
export async function createProject(data: CreateProjectRequest) {
  return request<ApiResponse<ProjectDto>>('/api/project', {
    method: 'POST',
    data,
  });
}

/**
 * 更新项目
 */
export async function updateProject(projectId: string, data: UpdateProjectRequest) {
  return request<ApiResponse<ProjectDto>>(`/api/project/${projectId}`, {
    method: 'PUT',
    data: { ...data, projectId },
  });
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string, reason?: string) {
  return request<ApiResponse<{ message: string }>>(`/api/project/${projectId}`, {
    method: 'DELETE',
    params: reason ? { reason } : undefined,
  });
}

/**
 * 获取项目统计信息
 */
export async function getProjectStatistics() {
  return request<ApiResponse<ProjectStatistics>>('/api/project/statistics', {
    method: 'GET',
  });
}

/**
 * 添加项目成员
 */
export async function addProjectMember(projectId: string, data: AddProjectMemberRequest) {
  return request<ApiResponse<ProjectMemberDto>>(`/api/project/${projectId}/members`, {
    method: 'POST',
    data: { ...data, projectId },
  });
}

/**
 * 移除项目成员
 */
export async function removeProjectMember(projectId: string, userId: string) {
  return request<ApiResponse<{ message: string }>>(`/api/project/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * 获取项目成员列表
 */
export async function getProjectMembers(projectId: string) {
  return request<ApiResponse<ProjectMemberDto[]>>(`/api/project/${projectId}/members`, {
    method: 'GET',
  });
}
