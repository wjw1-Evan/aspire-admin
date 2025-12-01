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

