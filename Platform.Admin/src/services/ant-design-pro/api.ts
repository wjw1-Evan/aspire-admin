// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/** 获取当前的用户 GET /api/auth/current-user */
export async function currentUser(options?: { [key: string]: any }) {
  return request<ApiResponse<API.CurrentUser>>('/api/auth/current-user', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/auth/logout */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/auth/logout', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/auth/login */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<ApiResponse<API.LoginData>>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 注册接口 POST /api/auth/register */
export async function register(body: API.RegisterParams, options?: { [key: string]: any }) {
  return request<ApiResponse<API.AppUser>>('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 刷新token接口 POST /api/auth/refresh-token */
export async function refreshToken(body: API.POST_API_REFRESH_TOKEN_PAYLOAD, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.POST_API_REFRESH_TOKEN_RES>>('/api/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改密码接口 POST /api/auth/change-password */
export async function changePassword(body: API.ChangePasswordParams, options?: { [key: string]: any }) {
  return request<ApiResponse<boolean>>('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前用户信息（个人中心） GET /api/user/me */
export async function getCurrentUserProfile(options?: { [key: string]: any }) {
  return request<ApiResponse<API.CurrentUser>>('/api/user/me', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新当前用户信息（个人中心） PUT /api/user/me */
export async function updateUserProfile(body: API.UpdateProfileParams, options?: { [key: string]: any }) {
  return request<ApiResponse<API.CurrentUser>>('/api/user/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改当前用户密码 PUT /api/user/me/password */
export async function changeCurrentUserPassword(body: API.ChangePasswordParams, options?: { [key: string]: any }) {
  return request<ApiResponse<{ message: string }>>('/api/user/me/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前用户活动日志 GET /api/user/me/activity-logs */
export async function getUserActivityLogs(params?: { limit?: number }, options?: { [key: string]: any }) {
  return request<ApiResponse<API.UserActivityLog[]>>('/api/user/me/activity-logs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/notice */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notice', {
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

/** 获取用户统计信息 GET /api/user/statistics */
export async function getUserStatistics(options?: { [key: string]: any }) {
  return request<ApiResponse<API.UserStatisticsResponse>>('/api/user/statistics', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取图形验证码 GET /api/auth/captcha/image */
export async function getImageCaptcha(type: 'login' | 'register' = 'login', options?: { [key: string]: any }) {
  return request<ApiResponse<API.ImageCaptchaResult>>(`/api/auth/captcha/image?type=${type}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取 RSA 公钥 GET /api/auth/public-key */
export async function getPublicKey(options?: { [key: string]: any }) {
  return request<ApiResponse<string>>('/api/auth/public-key', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 验证图形验证码 POST /api/auth/captcha/verify-image */
export async function verifyImageCaptcha(body: API.VerifyImageCaptchaRequest, options?: { [key: string]: any }) {
  return request<ApiResponse<API.VerifyImageCaptchaResponse>>('/api/auth/captcha/verify-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 检查用户名是否存在 GET /api/user/check-username */
export async function checkUsernameExists(username: string, options?: { [key: string]: any }) {
  return request<ApiResponse<{ exists: boolean }>>(`/api/user/check-username?username=${encodeURIComponent(username)}`, {
    method: 'GET',
    ...(options || {}),
  });
}
