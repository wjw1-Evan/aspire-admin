// 用户相关类型定义

/**
 * 用户信息（包含角色信息）
 * 与后端 UserWithRolesResponse 对应
 */
export interface AppUser {
  id?: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  age?: number;
  roleIds: string[];
  roleNames?: string[];
  organizations?: UserOrganizationInfo[];
  isActive: boolean;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  remark?: string;
}

export interface UserOrganizationInfo {
  id?: string;
  name?: string;
  fullPath?: string;
  isPrimary?: boolean;
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

/**
 * 用户列表响应
 * 与后端 UserListWithRolesResponse 对应
 */
export interface UserListResponse {
  users: AppUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
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
  phoneNumber?: string;
  password: string;
  roleIds?: string[];
  isActive: boolean;
  remark?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phoneNumber?: string;
  roleIds?: string[];
  isActive?: boolean;
  remark?: string;
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

export interface JoinRequestDetail {
  id: string;
  userId: string;
  username: string;
  userEmail?: string;
  companyId: string;
  companyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

export interface ReviewJoinRequestRequest {
  defaultRoleIds?: string[];
  rejectReason?: string;
}
