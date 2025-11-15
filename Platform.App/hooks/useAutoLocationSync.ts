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

    // 先清除引用，避免在移除过程中被重新使用
    watcherRef.current = null;

    // 尝试多种方式移除订阅，确保至少一种方式成功
    let removed = false;
    let lastError: unknown = null;

    // 方式 1: 使用 remove() 方法（标准方式，Expo Location API）
    if (!removed) {
      try {
        // 检查 remove 方法是否存在
        if (watcher && typeof watcher.remove === 'function') {
          // remove() 返回 void，不需要 await
          watcher.remove();
          removed = true;
          if (__DEV__) {
            console.log('[LocationSync] 成功移除位置订阅（remove()）');
          }
        }
      } catch (error) {
        // 捕获错误但不阻止继续尝试其他方式
        lastError = error;
        
        // Expo Location API 在某些平台/版本上存在已知问题：
        // remove() 方法存在但在内部调用时会失败（如 removeSubscription is not a function）
        // 这不会导致内存泄漏，因为引用已被清除，订阅对象会被垃圾回收
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isKnownIssue = errorMessage.includes('removeSubscription is not a function') ||
                            errorMessage.includes('LocationEventEmitter');
        
        if (__DEV__) {
          if (isKnownIssue) {
            // 已知问题，只记录调试信息，不警告
            console.debug('[LocationSync] remove() 方法失败（已知问题，不影响功能）:', error);
          } else {
            // 其他错误，记录警告
            console.warn('[LocationSync] remove() 方法失败:', error);
          }
        }
      }
    }

    // 方式 2: 尝试 unsubscribe（Web 端或部分平台的备选方式）
    if (!removed) {
      try {
        const watcherWithUnsubscribe = watcher as { unsubscribe?: () => void | Promise<void> };
        if (typeof watcherWithUnsubscribe.unsubscribe === 'function') {
          const result = watcherWithUnsubscribe.unsubscribe();
          // 如果是 Promise，等待完成
          if (result instanceof Promise) {
            await result;
          }
          removed = true;
          if (__DEV__) {
            console.log('[LocationSync] 成功移除位置订阅（unsubscribe()）');
          }
        }
      } catch (error) {
        lastError = error;
        if (__DEV__) {
          console.warn('[LocationSync] unsubscribe 失败:', error);
        }
      }
    }

    // 如果所有方式都失败，记录调试信息但不报错
    // 因为 watcherRef.current 已经被设置为 null，订阅对象会被垃圾回收，不会导致内存泄漏
    if (!removed && __DEV__) {
      const errorMessage = lastError instanceof Error ? lastError.message : String(lastError ?? '未知错误');
      const isKnownIssue = errorMessage.includes('removeSubscription is not a function') ||
                          errorMessage.includes('LocationEventEmitter');
      
      if (isKnownIssue) {
        // Expo Location API 的已知问题，不影响功能，只记录调试信息
        console.debug(
          '[LocationSync] 无法移除位置订阅（Expo Location API 已知问题，不影响功能）。引用已清除，订阅对象将被自动回收。'
        );
      } else {
        // 其他错误，记录详细信息帮助调试
        console.debug(
          '[LocationSync] 无法移除位置订阅，但已清除引用。订阅对象将被自动回收。',
          '最后错误:',
          lastError
        );
      }
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

