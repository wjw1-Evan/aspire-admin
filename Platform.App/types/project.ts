export enum ProjectStatus {
  Planning = 0,
  InProgress = 1,
  OnHold = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum ProjectPriority {
  Low = 0,
  Medium = 1,
  High = 2,
}

export enum ProjectMemberRole {
  Manager = 0,
  Member = 1,
  Viewer = 2,
}

export interface ProjectDto {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  statusName: string;
  priority: ProjectPriority;
  priorityName: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  memberIds?: string[];
  projectMembers?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ProjectMemberDto {
  id?: string;
  projectId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: ProjectMemberRole;
  roleName: string;
  allocation?: number;
  createdAt: string;
}

export interface ProjectStatistics {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  delayedProjects: number;
}

export interface TaskOverview {
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface MemberStatistics {
  totalMembers: number;
  membersByRole: Record<string, number>;
}

export interface MilestoneStatistics {
  totalMilestones: number;
  pendingMilestones: number;
  achievedMilestones: number;
  delayedMilestones: number;
}

export interface ProjectDashboardStatistics {
  project: ProjectStatistics;
  task: TaskOverview;
  member: MemberStatistics;
  milestone: MilestoneStatistics;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
  budget?: number;
}

export interface UpdateProjectRequest {
  projectId: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
  budget?: number;
}

export interface ProjectQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}
