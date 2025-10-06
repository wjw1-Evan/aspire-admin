// 用户相关类型定义

export interface AppUser {
  id?: string;
  username: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserListRequest {
  Page: number;
  PageSize: number;
  Search?: string;
  Role?: string;
  IsActive?: boolean;
  SortBy?: string;
  SortOrder?: string;
}

export interface UserListResponse {
  users: AppUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserStatisticsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  password: string;
  role: string;
  isActive: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserActivityLog {
  id?: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface BulkUserActionRequest {
  userIds: string[];
  action: string; // "activate", "deactivate", "delete"
}

export interface UpdateUserRoleRequest {
  role: string;
}
