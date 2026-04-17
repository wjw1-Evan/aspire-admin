export type { ApiResponse, PagedResult, PageParams } from './api-response';

export interface MenuTreeNode {
  id?: string;
  name: string;
  path: string;
  component?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  hideInMenu: boolean;
  parentId?: string;
  permissions: string[];
  children: MenuTreeNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentUser {
  id?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  tags?: Array<{ key?: string; label?: string }>;
  roles?: string[];
  permissions?: string[];
  menus?: MenuTreeNode[];
  phone?: string;
  isLogin?: boolean;
  currentCompanyId?: string;
  createdAt?: string;
  updatedAt?: string;
  currentCompanyDisplayName?: string;
  currentCompanyName?: string;
  currentCompanyLogo?: string;
}

export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  message?: string;
}

export interface CaptchaResult {
  captchaId?: string;
  imageData?: string;
  captchaImage?: string;
}

export interface Company {
  id?: string;
  name: string;
  code: string;
  description?: string;
  logo?: string;
  isActive?: boolean;
  displayName?: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  maxUsers?: number;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterCompanyRequest {
  name: string;
  code: string;
  password: string;
  email?: string;
  description?: string;
}

export interface RegisterCompanyResult {
  companyId: string;
  userId: string;
}

export interface CreateCompanyRequest {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  description?: string;
  logo?: string;
}

export interface CompanyStatistics {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalMenus: number;
  maxUsers: number;
  remainingUsers: number;
  isExpired: boolean;
  expiresAt?: string;
}

export interface CompanySearchResult {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo?: string;
  isMember?: boolean;
  hasPendingRequest?: boolean;
  isCreator?: boolean;
  memberCount?: number;
  creatorName?: string;
  requestId?: string;
  company?: Company;
}

export interface UserCompanyItem {
  companyId: string;
  companyName: string;
  companyCode: string;
  companyLogo?: string;
  role: string;
  isAdmin: boolean;
  joinedAt: string;
  isCurrent?: boolean;
  isPersonal?: boolean;
  roleNames?: string[];
}

export interface SwitchCompanyResult {
  companyId: string;
  companyName: string;
  menus?: MenuTreeNode[];
  token?: string;
}

export interface CompanyMemberItem {
  userId?: string;
  role: string;
  isAdmin: boolean;
  joinedAt: string;
}

export interface ApplyToJoinCompanyRequest {
  companyId: string;
  message?: string;
  reason?: string;
}

export interface ReviewJoinRequestRequest {
  message?: string;
}

export interface JoinRequestDetail {
  id?: string;
  userId?: string;
  username?: string;
  userEmail?: string;
  companyId?: string;
  companyName?: string;
  status: string;
  reason?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

export interface AppUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  age?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  roleIds?: string[];
  organizations?: Array<{ id?: string; name?: string; fullPath?: string; isPrimary?: boolean }>;
  remark?: string;
}

export interface UserActivityLog {
  id?: string;
  userId?: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  username?: string;
  createdBy?: string;
  queryString?: string;
  statusCode?: number;
  httpMethod?: string;
  duration?: number;
  path?: string;
}

export interface LayoutSettings {
  navTheme?: 'light' | 'dark' | 'realDark' | undefined;
  primaryColor?: string;
  colorPrimary?: string;
  layout?: 'side' | 'top' | 'mix';
  contentWidth?: 'Fluid' | 'Fixed';
  fixedHeader?: boolean;
  fixSiderbar?: boolean;
  colorWeak?: boolean;
  title?: string;
  pwa?: boolean;
  logo?: string;
  iconfontUrl?: string;
  token?: Record<string, any>;
  headerHeight?: number;
  splitMenus?: boolean;
  footerRender?: boolean | (() => React.ReactNode);
  rightContentRender?: boolean | ((props: any) => React.ReactNode);
}

export interface ChangePasswordResult {
  success?: boolean;
  message?: string;
  code?: string;
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ResetPasswordParams {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface LoginParams {
  username: string;
  password: string;
  type?: string;
  captchaId?: string;
  captchaAnswer?: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  email: string;
  captchaId?: string;
  captchaAnswer?: string;
}
