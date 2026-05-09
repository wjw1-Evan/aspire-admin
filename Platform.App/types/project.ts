export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export type ProjectPriority = 'low' | 'medium' | 'high';

export type ProjectMemberRole = 'manager' | 'member' | 'viewer';

export interface ProjectMemberDto {
  id?: string;
  projectId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: number;
  roleName: string;
  allocation: number;
}

export interface ProjectDto {
  id?: string;
  name: string;
  description?: string;
  status: number;
  statusName: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  memberIds?: string[];
  projectMembers?: ProjectMemberDto[];
  budget?: number;
  priority: number;
  priorityName: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
  budget?: number;
  priority?: number;
}

export interface UpdateProjectRequest {
  projectId: string;
  name?: string;
  description?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
  budget?: number;
  priority?: number;
}

export interface AddProjectMemberRequest {
  projectId: string;
  userId: string;
  role: number;
  allocation: number;
}

export interface ProjectStatistics {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  delayedProjects: number;
  projectsByStatus: Record<string, number>;
  projectsByPriority: Record<string, number>;
}

export interface CreateMilestoneRequest {
  projectId: string;
  name: string;
  targetDate: string;
  description?: string;
}

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
