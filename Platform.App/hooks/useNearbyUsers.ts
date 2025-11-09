import { useCallback, useMemo, useState } from 'react';
import * as Location from 'expo-location';

import { useChat } from '@/contexts/ChatContext';
import { getCurrentPosition, requestForegroundPermissions } from '@/services/location';
import type { NearbySearchRequest, NearbyUser } from '@/types/chat';

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
      const granted =
        permissionStatus === Location.PermissionStatus.GRANTED || (await ensurePermission());
      if (!granted) {
        return undefined;
      }

      const position = request?.center ?? (await getCurrentPosition());

      await updateLocationBeacon({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      });

      const payload: NearbySearchRequest = {
        center: position,
        radiusMeters: request?.radiusMeters,
        limit: request?.limit,
        interests: request?.interests,
      };

      const items = await refreshNearbyUsers(payload);
      return items;
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


