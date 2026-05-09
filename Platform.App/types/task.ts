export enum TaskStatus {
  Pending = 0,
  Assigned = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
  Failed = 5,
  Paused = 6,
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Urgent = 3,
}

export enum TaskExecutionResult {
  NotExecuted = 0,
  Success = 1,
  Failed = 2,
  Timeout = 3,
  Interrupted = 4,
}

export interface TaskDto {
  id: string;
  taskName: string;
  description?: string;
  taskType: string;
  status: TaskStatus;
  statusName: string;
  priority: TaskPriority;
  priorityName: string;
  completionPercentage: number;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  executionResult?: TaskExecutionResult;
  executionResultName?: string;
  remarks?: string;
  participantIds?: string[];
  participants?: ParticipantInfo[];
  tags?: string[];
  projectId?: string;
  projectName?: string;
  parentTaskId?: string;
  sortOrder?: number;
}

export interface ParticipantInfo {
  userId: string;
  username: string;
  email?: string;
}

export interface TaskExecutionLogDto {
  id?: string;
  taskId: string;
  executedBy: string;
  executedByName?: string;
  startTime?: string;
  endTime?: string;
  status: number;
  statusName: string;
  message?: string;
  errorMessage?: string;
  progressPercentage: number;
  createdAt: string;
}

export interface TaskStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageCompletionTime?: number;
  completionRate: number;
  overdueTasks?: number;
}

export interface CreateTaskRequest {
  taskName: string;
  taskType: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  estimatedDuration?: number;
  participantIds?: string[];
  tags?: string[];
  remarks?: string;
  projectId?: string;
  parentTaskId?: string;
  sortOrder?: number;
}

export interface UpdateTaskRequest {
  taskId: string;
  taskName?: string;
  description?: string;
  taskType?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  completionPercentage?: number;
  participantIds?: string[];
  tags?: string[];
  remarks?: string;
  projectId?: string;
  parentTaskId?: string;
  sortOrder?: number;
}

export interface ExecuteTaskRequest {
  taskId: string;
  status?: TaskStatus;
  message?: string;
  completionPercentage?: number;
}

export interface CompleteTaskRequest {
  taskId: string;
  executionResult: TaskExecutionResult;
  remarks?: string;
  message?: string;
  errorMessage?: string;
}

export interface TaskQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assignedTo?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}
