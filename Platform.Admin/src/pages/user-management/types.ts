// 用户相关类型定义

export interface AppUser {
  id?: string;
  username: string;
  email?: string;
  roleIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserListRequest {
  Page: number;
  PageSize: number;
  Search?: string;
  RoleIds?: string[]; // 按角色ID列表搜索
  IsActive?: boolean;
  SortBy?: string;
  SortOrder?: string;
  StartDate?: string; // 按创建时间范围搜索
  EndDate?: string;
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
  roleIds?: string[];
  isActive: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  roleIds?: string[];
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
  reason?: string; // 删除原因（仅用于 delete 操作）
}
