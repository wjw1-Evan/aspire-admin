/**
 * Token 验证和自动刷新 Hook
 * 处理 token 的定期验证和应用状态监听
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './useAuth';

// 验证间隔（10分钟）
const VALIDATION_INTERVAL = 10 * 60 * 1000;

// 最小验证间隔（5分钟）
const MIN_VALIDATION_INTERVAL = 5 * 60 * 1000;

// 应用恢复验证间隔（2分钟）
const APP_RESUME_VALIDATION_INTERVAL = 2 * 60 * 1000;

export function useTokenValidation() {
  const { isAuthenticated, validateToken } = useAuth();
  const validationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const lastValidationTime = useRef<number>(0);

  // 开始定期验证
  const startTokenValidation = useCallback(() => {
    if (validationInterval.current) {
      clearInterval(validationInterval.current);
    }

    validationInterval.current = setInterval(async () => {
      if (isAuthenticated) {
        // 避免频繁验证
        const now = Date.now();
        if (now - lastValidationTime.current < MIN_VALIDATION_INTERVAL) {
          return;
        }

        try {
          const isValid = await validateToken();
          lastValidationTime.current = now;
          
          if (!isValid) {
            // Token 无效，执行登出（由 AuthContext 处理）
            console.log('Token validation failed');
          }
        } catch (error) {
          console.error('Token validation error:', error);
        }
      }
    }, VALIDATION_INTERVAL);
  }, [isAuthenticated, validateToken]);

  // 停止验证
  const stopTokenValidation = useCallback(() => {
    if (validationInterval.current) {
      clearInterval(validationInterval.current);
      validationInterval.current = null;
    }
  }, []);

  // 处理应用状态变化
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // 应用从后台回到前台时验证 token
      if (isAuthenticated) {
        const now = Date.now();
        if (now - lastValidationTime.current > APP_RESUME_VALIDATION_INTERVAL) {
          validateToken().then(() => {
            lastValidationTime.current = now;
          }).catch(error => {
            console.error('App state change token validation error:', error);
          });
        }
      }
    }
    
    appState.current = nextAppState;
  }, [isAuthenticated, validateToken]);

  useEffect(() => {
    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 如果用户已认证，开始定期验证
    if (isAuthenticated) {
      startTokenValidation();
    } else {
      stopTokenValidation();
    }

    return () => {
      subscription?.remove();
      stopTokenValidation();
    };
  }, [isAuthenticated, startTokenValidation, stopTokenValidation, handleAppStateChange]);

  return {
    startTokenValidation,
    stopTokenValidation,
  };
}

