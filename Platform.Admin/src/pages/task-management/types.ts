/**
 * 任务管理页面的类型定义
 */

export interface TaskListRequest {
  Page: number;
  PageSize: number;
  Search?: string;
  Status?: number;
  Priority?: number;
  AssignedTo?: string;
  CreatedBy?: string;
  TaskType?: string;
  SortBy: string;
  SortOrder: string;
  StartDate?: string;
  EndDate?: string;
  Tags?: string[];
  ProjectId?: string;
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

/**
 * 项目相关类型（从 services/task/project.ts 导入）
 */
export type {
  ProjectDto,
  ProjectQueryRequest,
  ProjectListResponse,
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

