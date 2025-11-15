import * as Location from 'expo-location';

import { apiService } from './api';
import {
  API_ENDPOINTS,
  NEARBY_SEARCH_DEFAULT_LIMIT,
  NEARBY_SEARCH_DEFAULT_RADIUS,
} from './apiConfig';
import type { GeoPoint, NearbySearchRequest, NearbySearchResponse } from '@/types/chat';
import type { ApiResponse } from '@/types/unified-api';

export interface LocationPermissionResult {
  granted: boolean;
  status: Location.PermissionStatus;
  canAskAgain: boolean;
}

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export const requestForegroundPermissions = async (): Promise<LocationPermissionResult> => {
  const result = await Location.requestForegroundPermissionsAsync();
  return {
    granted: result.granted,
    status: result.status,
    canAskAgain: result.canAskAgain,
  };
};

export const getCurrentPosition = async (): Promise<GeoPoint> => {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? undefined,
    altitude: position.coords.altitude ?? undefined,
    heading: position.coords.heading ?? undefined,
    speed: position.coords.speed ?? undefined,
    timestamp: position.timestamp,
  };
};

export const updateLocationBeacon = async (payload: LocationUpdatePayload): Promise<void> => {
  await apiService.post<void>(API_ENDPOINTS.locationBeacon, payload, {
    timeout: 10000,
  });
};

export const fetchNearbyUsers = async (request: NearbySearchRequest): Promise<NearbySearchResponse> => {
  const radius = request.radiusMeters ?? NEARBY_SEARCH_DEFAULT_RADIUS;
  const limit = request.limit ?? NEARBY_SEARCH_DEFAULT_LIMIT;

  return apiService.post<NearbySearchResponse>(
    API_ENDPOINTS.nearbyUsers,
    {
      center: request.center,
      radiusMeters: radius,
      limit,
      interests: request.interests,
    },
    {
      timeout: 15000,
    }
  );
};

export interface UserLocationBeacon {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastSeenAt: string;
}

export interface UserLocationInfo {
  city?: string | null;
}

export const getCurrentUserLocation = async (): Promise<UserLocationBeacon | null> => {
  try {
    const response = await apiService.get<ApiResponse<UserLocationBeacon | null>>(
      API_ENDPOINTS.currentUserLocation,
      {
        timeout: 10000,
      }
    );
    
    // 调试日志：查看 API 返回的完整响应
    if (__DEV__) {
      console.log('getCurrentUserLocation API response:', JSON.stringify(response, null, 2));
    }
    
    // API 返回格式：{ success: true, data: UserLocationBeacon | null }
    if (response && response.success) {
      if (__DEV__) {
        console.log('getCurrentUserLocation data:', response.data);
      }
      // 即使 data 是 null，也返回 null（表示用户没有位置信标）
      return response.data ?? null;
    }
    
    if (__DEV__) {
      console.warn('getCurrentUserLocation: API returned unsuccessful response:', response);
    }
    return null;
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to get current user location:', error);
    }
    return null;
  }
};

/**
 * 获取当前用户的位置信息（仅包含城市，不包含详细坐标）
 */
export const getCurrentUserLocationInfo = async (): Promise<UserLocationInfo | null> => {
  try {
    const response = await apiService.get<ApiResponse<UserLocationInfo | null>>(
      '/social/location/info',
      {
        timeout: 10000,
      }
    );
    
    if (__DEV__) {
      console.log('getCurrentUserLocationInfo API response:', JSON.stringify(response, null, 2));
    }
    
    if (response && response.success) {
      if (__DEV__) {
        console.log('getCurrentUserLocationInfo data:', response.data);
      }
      return response.data ?? null;
    }
    
    if (__DEV__) {
      console.warn('getCurrentUserLocationInfo: API returned unsuccessful response:', response);
    }
    return null;
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to get current user location info:', error);
    }
    return null;
  }
};


