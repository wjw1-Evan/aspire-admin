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
  userId?: string;
  username?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  roles?: string[];
  permissions?: string[];
  menus?: MenuTreeNode[];
  isLogin?: boolean;
  currentCompanyId?: string;
  currentCompanyName?: string;
  currentCompanyDisplayName?: string;
  currentCompanyLogo?: string;
  access?: string;
  tags?: Array<{ key?: string; label?: string }>;
}

export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  code?: string;
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
  status?: string;
  isActive?: boolean;
  isExpired?: boolean;
  displayName?: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
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
  newUsersThisMonth: number;
  totalProjects: number;
  maxUsers?: number;
  totalRoles?: number;
  totalMenus?: number;
  isExpired?: boolean;
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
  permissions: string[];
  token?: string;
}

export interface CompanyMemberItem {
  userId: string;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
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
  id: string;
  userId: string;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  companyId: string;
  companyName: string;
  status: string;
  message?: string;
  reviewedBy?: string;
  reviewedAt?: string;
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
