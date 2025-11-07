import * as Location from 'expo-location';

import { apiService } from './api';
import {
  API_ENDPOINTS,
  NEARBY_SEARCH_DEFAULT_LIMIT,
  NEARBY_SEARCH_DEFAULT_RADIUS,
} from './apiConfig';
import type { GeoPoint, NearbySearchRequest, NearbySearchResponse } from '@/types/chat';

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


