/**
 * 社交服务
 * 提供附近的人、位置上报等社交功能 API
 */

import { apiClient, handleApiResponse } from './api';
import { ApiResponse } from '../types/api';

/**
 * 上报位置信标请求
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
 * 地理坐标点
 */
export interface GeoPoint {
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
 * 附近的人搜索请求
 */
export interface NearbyUsersRequest {
  /** 搜索中心点 */
  center: GeoPoint;
  /** 搜索半径（单位：米，默认 2000） */
  radiusMeters?: number;
  /** 返回数量上限（默认 20） */
  limit?: number;
  /** 兴趣标签过滤 */
  interests?: string[];
}

/**
 * 附近用户信息
 */
export interface NearbyUserDto {
  /** 用户标识 */
  userId: string;
  /** 显示名称 */
  displayName: string;
  /** 头像地址 */
  avatarUrl?: string;
  /** 与当前用户的距离（单位：米） */
  distanceMeters: number;
  /** 最近活跃时间（UTC） */
  lastActiveAt: string;
  /** 位置坐标 */
  location?: GeoPoint;
  /** 兴趣标签 */
  interests?: string[];
  /** 已存在的会话标识（如有） */
  sessionId?: string;
}

/**
 * 附近的人搜索响应
 */
export interface NearbyUsersResponse {
  /** 附近用户列表 */
  items: NearbyUserDto[];
  /** 匹配总数 */
  total: number;
  /** 建议下一次刷新间隔（秒） */
  nextRefreshAfter?: number;
}

/**
 * 用户位置信息
 */
export interface UserLocationInfo {
  /** 所在城市 */
  city?: string;
  /** 所在国家 */
  country?: string;
}

/**
 * 上报当前设备位置
 * @param request 定位信标信息
 * @returns Promise<ApiResponse<string>>
 */
export async function updateLocation(
  request: UpdateLocationBeaconRequest,
): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>(
    '/api/social/location/beacon',
    request,
  );
  return handleApiResponse<string>(response);
}

/**
 * 获取附近的用户列表
 * @param request 搜索参数
 * @returns Promise<ApiResponse<NearbyUsersResponse>>
 */
export async function getNearbyUsers(
  request: NearbyUsersRequest,
): Promise<ApiResponse<NearbyUsersResponse>> {
  const response = await apiClient.post<ApiResponse<NearbyUsersResponse>>(
    '/api/social/nearby-users',
    request,
  );
  return handleApiResponse<NearbyUsersResponse>(response);
}

/**
 * 获取当前用户的位置信息（仅包含城市和国家）
 * @returns Promise<ApiResponse<UserLocationInfo>>
 */
export async function getCurrentUserLocationInfo(): Promise<
  ApiResponse<UserLocationInfo>
> {
  const response = await apiClient.get<ApiResponse<UserLocationInfo>>(
    '/api/social/location/info',
  );
  return handleApiResponse<UserLocationInfo>(response);
}

