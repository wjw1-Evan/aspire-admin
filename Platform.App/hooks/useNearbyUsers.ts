import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';

import { useChat } from '@/contexts/ChatContext';
import { getCurrentPosition, requestForegroundPermissions } from '@/services/location';
import type { NearbySearchRequest } from '@/types/chat';

export const useNearbyUsers = () => {
  const { nearbyUsers, nearbyLoading, refreshNearbyUsers, updateLocationBeacon } = useChat();
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const result = await requestForegroundPermissions();
    setPermissionStatus(result.status);
    return result.granted;
  }, []);

  const refresh = useCallback(
    async (request?: NearbySearchRequest) => {
      const granted =
        permissionStatus === Location.PermissionStatus.GRANTED || (await ensurePermission());
      if (!granted) {
        return;
      }

      const position = request?.center ?? (await getCurrentPosition());

      await updateLocationBeacon({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      });

      await refreshNearbyUsers({
        ...request,
        center: position,
      });
    },
    [ensurePermission, permissionStatus, refreshNearbyUsers, updateLocationBeacon]
  );

  useEffect(() => {
    if (nearbyUsers.length === 0 && !nearbyLoading) {
      refresh().catch(error => console.error('Failed to load nearby users:', error));
    }
  }, [nearbyLoading, nearbyUsers.length, refresh]);

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


