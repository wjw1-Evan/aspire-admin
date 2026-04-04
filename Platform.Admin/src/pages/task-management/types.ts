/**
 * 任务管理页面的类型定义
 */

export interface TaskListRequest {
  page: number;
  pageSize: number;
  search?: string;
  status?: number;
  priority?: number;
  assignedTo?: string;
  createdBy?: string;
  taskType?: string;
  sortBy?: string;
  sortOrder?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  projectId?: string;
}

export interface TaskStatisticsResponse {
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

export interface SearchFormValues {
  search?: string;
  status?: number;
  priority?: number;
  assignedTo?: string;
  createdBy?: string;
  taskType?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface TaskQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  priority?: number;
  assignedTo?: string;
  createdBy?: string;
  taskType?: string;
  sortBy?: string;
  sortOrder?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  projectId?: string;
}

export interface TableSort {
  [key: string]: 'ascend' | 'descend' | undefined;
}

/**
 * 项目相关类型（从 services/task/project.ts 导入）
 */
export type {
  ProjectDto,
  ProjectQueryRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatistics,
  ProjectMemberDto,
  AddProjectMemberRequest,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';

/**
 * 任务依赖类型
 */
export type {
  TaskDependencyDto,
  AddTaskDependencyRequest,
} from '@/services/task/api';

/**
 * 甘特图任务类型
 */
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'milestone';
  dependencies?: string[];
  isCritical?: boolean;
  projectId?: string;
  parentTaskId?: string;
}

