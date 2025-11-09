// @ts-ignore
/* eslint-disable */

declare namespace API {
  // 统一的 API 响应格式
  type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    errorCode?: string;
    errorMessage?: string;
    timestamp: string;
    traceId?: string;
  };

  type MenuTreeNode = {
    id?: string;
    name: string;
    title: string;  // 菜单显示标题（中文）
    path: string;
    component?: string;
    icon?: string;
    sortOrder: number;
    isEnabled: boolean;
    isExternal: boolean;
    openInNewTab: boolean;
    hideInMenu: boolean;
    parentId?: string;
    children: MenuTreeNode[];
    createdAt?: string;
    updatedAt?: string;
  };

  type CurrentUser = {
    name?: string;          // 对应后端 DisplayName (通过 JsonPropertyName 映射)
    avatar?: string;
    userid?: string;
    email?: string;
    tags?: { key?: string; label?: string }[];
    access?: string;        // 已废弃，使用 roles
    roles?: string[];       // 角色列表
    phone?: string;
    isLogin?: boolean;
    menus?: MenuTreeNode[];
    currentCompanyId?: string;
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  type LoginData = {
    type?: string;
    currentAuthority?: string;
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type RuleListItem = {
    key?: number;
    disabled?: boolean;
    href?: string;
    avatar?: string;
    name?: string;
    owner?: string;
    desc?: string;
    callNo?: number;
    status?: number;
    updatedAt?: string;
    createdAt?: string;
    progress?: number;
  };

  type RuleList = {
    data?: RuleListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type FakeCaptcha = {
    code?: number;
    status?: string;
  };

  // 验证码响应
  type CaptchaResponse = {
    success: boolean;
    data: {
      captcha: string;
      expiresIn: number;
    };
    message?: string;
  };

  // 验证验证码请求
  type VerifyCaptchaRequest = {
    phone: string;
    code: string;
  };

  // 验证验证码响应
  type VerifyCaptchaResponse = {
    success: boolean;
    data: {
      valid: boolean;
    };
    message?: string;
  };

  // 图形验证码结果
  type ImageCaptchaResult = {
    captchaId: string;
    imageData: string;
    expiresIn: number;
  };

  // 验证图形验证码请求
  type VerifyImageCaptchaRequest = {
    captchaId: string;
    answer: string;
    type: 'login' | 'register';
  };

  // 验证图形验证码响应
  type VerifyImageCaptchaResponse = {
    success: boolean;
    data: {
      valid: boolean;
    };
    message?: string;
  };

  type LoginParams = {
    // v3.1: 移除 companyCode，用户名全局唯一
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
    // 图形验证码字段
    captchaId?: string;
    captchaAnswer?: string;
  };

  type RegisterParams = {
    username?: string;
    password?: string;
    email?: string;
    // 图形验证码字段
    captchaId?: string;
    captchaAnswer?: string;
  };

  type RegisterResult = {
    success?: boolean;
    data?: any;
    errorCode?: string;
    errorMessage?: string;
  };

  type AppUser = {
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
  };

  type ChangePasswordParams = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  type ChangePasswordResult = {
    success?: boolean;
    data?: boolean;
    errorCode?: string;
    errorMessage?: string;
  };

  type POST_API_REFRESH_TOKEN_PAYLOAD = {
    refreshToken: string;
  };

  type POST_API_REFRESH_TOKEN_RES = {
    status?: string;
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
    errorMessage?: string;
  };

  type ErrorResponse = {
    /** 业务约定的错误码 */
    errorCode: string;
    /** 业务上的错误信息 */
    errorMessage?: string;
    /** 业务上的请求是否成功 */
    success?: boolean;
  };

  type NoticeIconList = {
    data?: NoticeIconItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type NoticeIconItemType = 'notification' | 'message' | 'event';

  type NoticeIconItem = {
    id?: string;
    extra?: string;
    key?: string;
    read?: boolean;
    avatar?: string;
    title?: string;
    status?: string;
    datetime?: string;
    description?: string;
    type?: NoticeIconItemType;
  };

  // 个人中心相关类型
  type UpdateProfileParams = {
    name?: string;
    email?: string;
    age?: number;
    avatar?: string;
  };

  type UserActivityLog = {
    id?: string;
    userId?: string;
    action?: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: string;
  };

  // 企业相关类型 (v3.0 新增)
  type Company = {
    id?: string;
    name: string;
    code: string;
    logo?: string;
    description?: string;
    industry?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    isActive: boolean;
    maxUsers: number;
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type RegisterCompanyRequest = {
    companyName: string;
    companyCode: string;
    companyDescription?: string;
    industry?: string;
    adminUsername: string;
    adminPassword: string;
    adminEmail: string;
    contactName?: string;
    contactPhone?: string;
  };

  type CreateCompanyRequest = {
    name: string;
    code?: string;  // 可选，如果为空则由系统自动生成
    description?: string;
    industry?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    maxUsers?: number;
  };

  type RegisterCompanyResult = {
    company?: Company;
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
  };

  type UpdateCompanyRequest = {
    name?: string;
    description?: string;
    industry?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    logo?: string;
  };

  type CompanyStatistics = {
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    totalMenus: number;
    maxUsers: number;
    remainingUsers: number;
    isExpired: boolean;
    expiresAt?: string;
  };

  type RefreshTokenRequest = {
    refreshToken: string;
  };

  type RefreshTokenResult = {
    status?: string;
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
    errorMessage?: string;
  };

  // v3.1: 多企业隶属相关类型
  type UserCompany = {
    id?: string;
    userId: string;
    companyId: string;
    roleIds: string[];
    isAdmin: boolean;
    status: string;  // active, pending, rejected
    joinedAt: string;
    approvedBy?: string;
    approvedAt?: string;
  };

  type UserCompanyItem = {
    companyId: string;
    companyName: string;
    companyCode: string;
    isAdmin: boolean;
    isCurrent: boolean;
    isPersonal: boolean;
    joinedAt: string;
    roleNames: string[];
  };

  type CompanyJoinRequest = {
    id?: string;
    userId: string;
    companyId: string;
    status: string;  // pending, approved, rejected, cancelled
    reason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectReason?: string;
    createdAt?: string;
  };

  type JoinRequestDetail = {
    id: string;
    userId: string;
    username: string;
    userEmail?: string;
    companyId: string;
    companyName: string;
    status: string;
    reason?: string;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewedAt?: string;
    rejectReason?: string;
    createdAt: string;
  };

  type ApplyToJoinCompanyRequest = {
    companyId: string;
    reason?: string;
  };

  type CompanySearchResult = {
    company: Company;
    isMember: boolean;
    hasPendingRequest: boolean;
    memberStatus?: string;
    memberCount: number;
  };

  type SwitchCompanyRequest = {
    targetCompanyId: string;
  };

  type SwitchCompanyResult = {
    companyId: string;
    companyName: string;
    menus: MenuTreeNode[];
    token?: string;  // 可选的新token
  };

  type CompanyMemberItem = {
    userId: string;
    username: string;
    email?: string;
    isAdmin: boolean;
    roleIds: string[];
    roleNames: string[];
    joinedAt: string;
    isActive: boolean;
  };

  type UpdateMemberRolesRequest = {
    roleIds: string[];
  };

  type SetAdminRequest = {
    isAdmin: boolean;
  };

  type ReviewJoinRequestRequest = {
    defaultRoleIds?: string[];
    rejectReason?: string;
  };

  // 用户统计信息响应
  type UserStatisticsResponse = {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  };
}

