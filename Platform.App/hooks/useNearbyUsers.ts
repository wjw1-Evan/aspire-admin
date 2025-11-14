import { useCallback, useMemo, useState } from 'react';
import * as Location from 'expo-location';

import { useChat } from '@/contexts/ChatContext';
import { getCurrentPosition, requestForegroundPermissions } from '@/services/location';
import type { GeoPoint, NearbySearchRequest, NearbyUser } from '@/types/chat';

export const useNearbyUsers = () => {
  const { nearbyUsers, nearbyLoading, refreshNearbyUsers, updateLocationBeacon } = useChat();
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const result = await requestForegroundPermissions();
    setPermissionStatus(result.status);
    return result.granted;
  }, []);

  const refresh = useCallback(
    async (request?: Partial<NearbySearchRequest>): Promise<NearbyUser[] | undefined> => {
      try {
        const granted =
          permissionStatus === Location.PermissionStatus.GRANTED || (await ensurePermission());
        if (!granted) {
          console.warn('Location permission not granted');
          return undefined;
        }

        let position: GeoPoint;
        try {
          position = request?.center ?? (await getCurrentPosition());
        } catch (error) {
          console.error('Failed to get current position:', error);
          // 如果提供了 center，使用它；否则返回 undefined
          if (request?.center) {
            position = request.center;
          } else {
            return undefined;
          }
        }

        try {
          await updateLocationBeacon({
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
          });
        } catch (error) {
          // 位置信标更新失败不应该阻止搜索，只记录警告
          console.warn('Failed to update location beacon:', error);
        }

        const payload: NearbySearchRequest = {
          center: position,
          radiusMeters: request?.radiusMeters,
          limit: request?.limit,
          interests: request?.interests,
        };

        const items = await refreshNearbyUsers(payload);
        return items;
      } catch (error) {
        console.error('Failed to refresh nearby users:', error);
        return undefined;
      }
    },
    [ensurePermission, permissionStatus, refreshNearbyUsers, updateLocationBeacon]
  );

  return useMemo(
    () => ({
      nearbyUsers,
      loading: nearbyLoading,
      permissionStatus,
      ensurePermission,
      refresh,
    }),
    [ensurePermission, nearbyLoading, nearbyUsers, permissionStatus, refresh]
  );
};


