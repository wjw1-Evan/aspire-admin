import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';

import { useChat } from '@/contexts/ChatContext';
import {
  getCurrentPosition,
  requestForegroundPermissions,
  type LocationPermissionResult,
} from '@/services/location';

const LOCATION_DISTANCE_INTERVAL = 50; // meters
const LOCATION_TIME_INTERVAL = 2 * 60 * 1000; // 2 minutes
const LOCATION_MIN_UPDATE_INTERVAL = 60 * 1000; // 1 minute throttle

/**
 * 自动同步用户地理位置到后端。
 *
 * @param enabled 是否启用同步（通常取决于用户是否已登录）
 */
export function useAutoLocationSync(enabled: boolean): void {
  const { updateLocationBeacon } = useChat();

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const startingRef = useRef(false);
  const permissionStatusRef = useRef<Location.PermissionStatus | null>(null);

  const stopWatcher = useCallback(async () => {
    const watcher = watcherRef.current;
    if (!watcher) {
      return;
    }

    watcherRef.current = null;

    try {
      if (typeof watcher.remove === 'function') {
        await watcher.remove();
        return;
      }
    } catch (error) {
      console.warn('[LocationSync] 停止定位监听失败:', error);
    }

    try {
      // Web 端或部分平台可能提供 unsubscribe
      if (typeof (watcher as { unsubscribe?: () => void }).unsubscribe === 'function') {
        (watcher as { unsubscribe: () => void }).unsubscribe();
        return;
      }
    } catch (error) {
      console.warn('[LocationSync] 备用方式取消定位监听失败:', error);
    }

    try {
      if (typeof Location.removeWatchAsync === 'function') {
        await Location.removeWatchAsync(watcher);
      }
    } catch (error) {
      console.warn('[LocationSync] removeWatchAsync 取消定位监听失败:', error);
    }
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (permissionStatusRef.current === Location.PermissionStatus.GRANTED) {
      return true;
    }

    const existing = await Location.getForegroundPermissionsAsync();
    permissionStatusRef.current = existing.status;

    if (existing.granted) {
      return true;
    }

    if (!existing.canAskAgain) {
      return false;
    }

    const requested: LocationPermissionResult = await requestForegroundPermissions();
    permissionStatusRef.current = requested.status;
    return requested.granted;
  }, []);

  const pushLocationUpdate = useCallback(
    async (coords: Location.LocationObjectCoords) => {
      const now = Date.now();
      if (lastUpdateRef.current && now - lastUpdateRef.current < LOCATION_MIN_UPDATE_INTERVAL) {
        return;
      }

      lastUpdateRef.current = now;
      try {
        await updateLocationBeacon({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? undefined,
          altitude: coords.altitude ?? undefined,
          heading: coords.heading ?? undefined,
          speed: coords.speed ?? undefined,
        });
      } catch (error) {
        console.warn('[LocationSync] 上报定位失败:', error);
      }
    },
    [updateLocationBeacon]
  );

  const startWatcher = useCallback(async () => {
    if (startingRef.current) {
      return;
    }

    startingRef.current = true;
    try {
      const granted = await ensurePermission();
      if (!granted) {
        return;
      }

      // 立刻获取一次当前位置
      const current = await getCurrentPosition();
      await updateLocationBeacon({
        latitude: current.latitude,
        longitude: current.longitude,
        accuracy: current.accuracy,
        altitude: current.altitude ?? undefined,
        heading: current.heading ?? undefined,
        speed: current.speed ?? undefined,
      });
      lastUpdateRef.current = Date.now();

      // 启动持续监听
      await stopWatcher();
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: LOCATION_DISTANCE_INTERVAL,
          timeInterval: LOCATION_TIME_INTERVAL,
        },
        position => {
          void pushLocationUpdate(position.coords);
        }
      );
    } catch (error) {
      console.warn('[LocationSync] 启动定位监听失败:', error);
    } finally {
      startingRef.current = false;
    }
  }, [ensurePermission, pushLocationUpdate, stopWatcher, updateLocationBeacon]);

  useEffect(() => {
    if (!enabled) {
      void stopWatcher();
      return;
    }

    let isMounted = true;

    void startWatcher();

    const handleAppStateChange = (status: AppStateStatus) => {
      if (!isMounted) {
        return;
      }

      if (status === 'active') {
        void startWatcher();
      } else if (status === 'background' || status === 'inactive') {
        void stopWatcher();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMounted = false;
      subscription.remove();
      void stopWatcher();
    };
  }, [enabled, startWatcher, stopWatcher]);
}

