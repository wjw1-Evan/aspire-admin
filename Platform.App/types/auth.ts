// 认证相关的类型定义

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

export interface AuthState {
  isAuthenticated: boolean;
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;
}
