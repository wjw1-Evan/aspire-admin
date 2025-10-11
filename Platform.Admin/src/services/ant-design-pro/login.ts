// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取验证码 GET /api/login/captcha */
export async function getFakeCaptcha(
  params: {
    // query
    /** 手机号 */
    phone?: string;
  },
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: {
      captcha: string;
      expiresIn: number;
    };
    message?: string;
  }>('/api/login/captcha', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 验证验证码 POST /api/login/verify-captcha */
export async function verifyCaptcha(
  body: {
    phone: string;
    code: string;
  },
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
    data: {
      valid: boolean;
    };
    message?: string;
  }>('/api/login/verify-captcha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
