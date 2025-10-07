// 认证相关的类型定义 - 与Admin端保持统一

export interface LoginRequest {
  username?: string;
  password?: string;
  autoLogin?: boolean;
  type?: string;
}

export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
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

// Admin端兼容的额外类型定义
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  name?: string;
  age?: number;
}

// 刷新token相关类型
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResult {
  status?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  errorMessage?: string;
}

// AppUser类型 - 与Admin端AppUser保持一致
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