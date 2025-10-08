// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<ApiResponse<API.CurrentUser>>('/api/currentUser', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<ApiResponse<API.LoginData>>('/api/login/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 注册接口 POST /api/register */
export async function register(body: API.RegisterParams, options?: { [key: string]: any }) {
  return request<ApiResponse<API.AppUser>>('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 刷新token接口 POST /api/refresh-token */
export async function refreshToken(body: API.POST_API_REFRESH_TOKEN_PAYLOAD, options?: { [key: string]: any }) {
  return request<API.POST_API_REFRESH_TOKEN_RES>('/api/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改密码接口 POST /api/change-password */
export async function changePassword(body: API.ChangePasswordParams, options?: { [key: string]: any }) {
  return request<ApiResponse<boolean>>('/api/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前用户信息（个人中心） GET /api/user/profile */
export async function getCurrentUserProfile(options?: { [key: string]: any }) {
  return request<ApiResponse<API.CurrentUser>>('/api/user/profile', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新当前用户信息（个人中心） PUT /api/user/profile */
export async function updateUserProfile(body: API.UpdateProfileParams, options?: { [key: string]: any }) {
  return request<ApiResponse<API.CurrentUser>>('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改当前用户密码 PUT /api/user/profile/password */
export async function changeCurrentUserPassword(body: API.ChangePasswordParams, options?: { [key: string]: any }) {
  return request<ApiResponse<{ message: string }>>('/api/user/profile/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前用户活动日志 GET /api/user/profile/activity-logs */
export async function getUserActivityLogs(params?: { limit?: number }, options?: { [key: string]: any }) {
  return request<ApiResponse<API.UserActivityLog[]>>('/api/user/profile/activity-logs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}
