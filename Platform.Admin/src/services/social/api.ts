import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 上报位置信标请求参数
 */
export interface UpdateLocationBeaconRequest {
  /** 纬度（单位：度） */
  latitude: number;
  /** 经度（单位：度） */
  longitude: number;
  /** 定位精度（单位：米） */
  accuracy?: number;
  /** 海拔高度（单位：米） */
  altitude?: number;
  /** 航向角（单位：度） */
  heading?: number;
  /** 移动速度（单位：米/秒） */
  speed?: number;
  /** 原始时间戳（毫秒） */
  timestamp?: number;
}

/**
 * 用户位置信标信息
 */
export interface UserLocationBeacon {
  /** 用户标识 */
  userId: string;
  /** 纬度（单位：度） */
  latitude: number;
  /** 经度（单位：度） */
  longitude: number;
  /** 定位精度（单位：米） */
  accuracy?: number;
  /** 海拔高度（单位：米） */
  altitude?: number;
  /** 航向角（单位：度） */
  heading?: number;
  /** 移动速度（单位：米/秒） */
  speed?: number;
  /** 最近一次上报时间（UTC） */
  lastSeenAt: string;
  /** 所在城市（通过逆地理编码获取） */
  city?: string;
  /** 所在国家（通过逆地理编码获取） */
  country?: string;
}

/**
 * 上报当前设备位置
 * POST /api/social/location/beacon
 */
export async function updateLocation(
  body: UpdateLocationBeaconRequest,
  options?: { [key: string]: any },
) {
  return request<ApiResponse<string>>('/api/social/location/beacon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/**
 * 获取当前用户的位置信标
 * GET /api/social/location/beacon
 */
export async function getCurrentUserLocation(options?: { [key: string]: any }) {
  return request<ApiResponse<UserLocationBeacon>>('/api/social/location/beacon', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取当前用户的位置信息（仅包含城市和国家，不包含详细坐标）
 * GET /api/social/location/info
 */
export async function getCurrentUserLocationInfo(options?: { [key: string]: any }) {
  return request<ApiResponse<{ city?: string; country?: string }>>(
    '/api/social/location/info',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

