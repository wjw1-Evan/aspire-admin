export type TaskStatus = 'todo' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'failed' | 'paused';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ParticipantInfo {
  userId: string;
  username: string;
  email?: string;
}

export interface TaskAttachmentDto {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

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
  projectId?: string;
  projectName?: string;
  parentId?: string;
  sortOrder: number;
  duration?: number;
  children?: TaskDto[];
}

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
  projectId?: string;
  parentId?: string;
  sortOrder?: number;
  duration?: number;
}

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
  projectId?: string;
  parentId?: string;
  sortOrder?: number;
  duration?: number;
}

export interface ExecuteTaskRequest {
  taskId: string;
  status: number;
  message?: string;
  completionPercentage?: number;
}

export interface CompleteTaskRequest {
  taskId: string;
  executionResult: number;
  remarks?: string;
  errorMessage?: string;
}

export interface TaskStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
  completionRate: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
}

export interface AssignTaskRequest {
  taskId: string;
  assignedTo: string;
  remarks?: string;
}

export interface BatchUpdateTaskStatusRequest {
  taskIds: string[];
  status: number;
}

export interface AddTaskDependencyRequest {
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: number;
  lagDays: number;
}

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
  errorMessage?: string;
  progressPercentage: number;
}
