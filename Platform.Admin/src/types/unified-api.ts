/**
 * API 响应处理工具文件（统一来源，匹配后端新格式）
 */

// 统一 API 响应格式
/**
 * 统一 API 响应格式（与后端 Platform.ServiceDefaults.Models.ApiResponse 完全一致）
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  details?: any;
  timestamp?: string;
  traceId?: string;
}


/**
 * 分页响应格式(PagedResult<T>)
 * 统一分页结构，所有分页接口均使用，完全对齐后端：
 */

export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}

/**
 * 检查 API 响应是否成功
 * @param response API 响应对象
 * @returns 是否成功
 */
export function isResponseSuccess<T>(response: ApiResponse<T>): boolean {
  return response?.success === true;
}

/**
 * 获取 API 响应的成功消息
 * @param response API 响应对象
 * @returns 成功消息
 */
export function getSuccessMessage<T>(response: ApiResponse<T>): string {
  return response?.message ?? '';
}

/**
 * 检查 API 响应中的数据是否有效
 * @param response API 响应对象
 */
export function isDataValid<T extends { isLogin?: boolean }>(response: ApiResponse<T>): boolean {
  if (!isResponseSuccess(response)) {
    return false;
  }
  if (response.data && 'isLogin' in (response.data as any)) {
    return (response.data as any).isLogin !== false;
  }
  return true;
}

/**
 * 获取 API 响应的错误消息
 * @param response API 响应对象
 * @param defaultMessage 默认错误消息
 */
export function getErrorMessage<T>(response: ApiResponse<T>, defaultMessage = '操作失败，请稍后重试'): string {
  return response?.message ?? defaultMessage;
}

/**
 * 提取 API 响应中的数据
 * @param response API 响应对象
 * @param defaultValue 默认值
 */
export function extractData<T>(response: ApiResponse<T>, defaultValue: T | null = null): T | null {
  if (isResponseSuccess(response)) {
    return response?.data as T;
  }
  return defaultValue;
}

/**
 * 处理认证相关的 API 响应
 */
export function isAuthResponseValid<T extends { isLogin?: boolean }>(response: ApiResponse<T>): boolean {
  return isResponseSuccess(response) && isDataValid(response);
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

// 用户信息（统一模型）
export interface CurrentUser {
  id?: string;
  username?: string; // 用户名（对应后端 Username）
  displayName?: string; // 显示名称（对应后端 Name）
  avatar?: string;
  email?: string;
  tags?: UserTag[];
  roles?: string[]; // 角色列表（简化权限系统）
  permissions?: string[]; // 权限列表（简化权限系统）
  phone?: string;
  isLogin?: boolean;
  currentCompanyId?: string; // 当前企业ID
  createdAt?: string;
  updatedAt?: string;
}

export interface UserTag {
  key?: string;
  label?: string;
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


// UpdateProfileParams 已废弃，请统一使用 UpdateProfileRequest

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
  message?: string;
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

// 兼容类型已移除，如需兼容旧接口请单独引入 legacy-types.ts

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

// 用户列表响应（推荐直接使用 PagedResult<AppUser>）

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

// UpdateProfileParams 已废弃，请统一使用 UpdateProfileRequest

// 更新用户资料请求（个人中心）
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  age?: number;
}


// CreateUserRequest、UpdateUserRequest 已废弃，请统一使用 CreateUserManagementRequest/UpdateUserManagementRequest
// 如需兼容旧接口请单独引入 legacy-types.ts

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
