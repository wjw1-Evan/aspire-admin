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
  };

  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
    isLogin?: boolean;
    menus?: MenuTreeNode[];
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

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  type RegisterParams = {
    username?: string;
    password?: string;
    email?: string;
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
}
