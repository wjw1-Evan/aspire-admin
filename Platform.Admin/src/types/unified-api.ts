/**
 * 统一的 API 响应格式 - 与后端完全匹配
 * 用于 Admin、API、App 三端统一对接
 */

// 统一 API 响应格式
export interface UnifiedApiResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
  traceId?: string;
}

// 登录请求参数
export interface LoginRequest {
  username?: string;
  password?: string;
  autoLogin?: boolean;
  type?: string;
}

// 登录响应数据
export interface LoginData {
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

// 用户信息
export interface CurrentUser {
  id?: string;
  name?: string;
  avatar?: string;
  userid?: string;
  email?: string;
  signature?: string;
  title?: string;
  group?: string;
  tags?: UserTag[];
  notifyCount?: number;
  unreadCount?: number;
  country?: string;
  access?: string;
  geographic?: GeographicInfo;
  address?: string;
  phone?: string;
  isLogin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions?: string[];
  roles?: string[];
}

export interface UserTag {
  key?: string;
  label?: string;
}

export interface GeographicInfo {
  province?: LocationInfo;
  city?: LocationInfo;
}

export interface LocationInfo {
  label?: string;
  key?: string;
}

// 注册请求
export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

// 应用用户（后端数据模型）
export interface AppUser {
  id?: string;
  username: string;
  name?: string;
  age?: number;
  passwordHash?: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// 修改密码请求
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 更新用户资料请求
export interface UpdateProfileParams {
  name?: string;
  email?: string;
  age?: number;
}

// 刷新令牌请求
export interface RefreshTokenRequest {
  refreshToken: string;
}

// 刷新令牌响应
export interface RefreshTokenResult {
  status?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  errorMessage?: string;
}

// 标准错误代码枚举
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  LOGIN_FAILED = 'LOGIN_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  USER_EXISTS = 'USER_EXISTS',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  INVALID_CURRENT_PASSWORD = 'INVALID_CURRENT_PASSWORD',
  UPDATE_FAILED = 'UPDATE_FAILED',
  REGISTER_ERROR = 'REGISTER_ERROR',
  CHANGE_PASSWORD_ERROR = 'CHANGE_PASSWORD_ERROR',
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR',
}

// 向后兼容的 API 响应格式（用于内部转换）
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}

// 登录结果（向后兼容）
export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

// 用户列表请求
export interface UserListRequest {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 用户列表响应
export interface UserListResponse {
  users: AppUser[];
  total: number;
  page: number;
  pageSize: number;
}

// 用户统计信息
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

// 用户活动日志
export interface UserActivityLog {
  id?: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// 批量操作请求
export interface BulkUserActionRequest {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'delete';
}

// 创建用户管理请求
export interface CreateUserManagementRequest {
  username: string;
  password: string;
  email?: string;
  role: string;
  isActive: boolean;
}

// 更新用户管理请求
export interface UpdateUserManagementRequest {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

// 更新用户资料请求（个人中心）
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  age?: number;
}

// 创建用户请求（旧版本）
export interface CreateUserRequest {
  name: string;
  email: string;
}

// 更新用户请求（旧版本）
export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// 增强的认证状态类型 - 与Admin端保持统一
export interface AuthState {
  isAuthenticated: boolean;
  user: CurrentUser | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  loading: boolean;
  error: AuthError | null;
  lastChecked: number | null;
}

// 认证错误类型
export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  LOGIN_FAILED = 'LOGIN_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  retryable?: boolean;
}

// Token 验证结果
export interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  expiresAt?: number;
  error?: AuthError;
}

// 权限检查类型 - 基于Admin端的access字段
export interface PermissionCheck {
  access?: string;
  role?: string;
}
