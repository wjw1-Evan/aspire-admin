// Token验证Hook

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export function useTokenValidation() {
  const { isAuthenticated, checkAuth } = useAuth();
  const appState = useRef(AppState.currentState);
  const validationInterval = useRef<NodeJS.Timeout | null>(null);

  // 定期验证token有效性
  const startTokenValidation = () => {
    if (validationInterval.current) {
      clearInterval(validationInterval.current);
    }

    // 每5分钟验证一次token
    validationInterval.current = setInterval(async () => {
      if (isAuthenticated) {
        const isValid = await apiService.validateToken();
        if (!isValid) {
          checkAuth();
        }
      }
    }, 5 * 60 * 1000); // 5分钟
  };

  // 停止token验证
  const stopTokenValidation = () => {
    if (validationInterval.current) {
      clearInterval(validationInterval.current);
      validationInterval.current = null;
    }
  };

  // 处理应用状态变化
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // 应用从后台回到前台时验证token
      if (isAuthenticated) {
        checkAuth();
      }
    }
    
    appState.current = nextAppState;
  };

  useEffect(() => {
    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 如果用户已认证，开始定期验证
    if (isAuthenticated) {
      startTokenValidation();
    } else {
      stopTokenValidation();
    }

    // 清理
    return () => {
      subscription?.remove();
      stopTokenValidation();
    };
  }, [isAuthenticated]);

  return {
    startTokenValidation,
    stopTokenValidation,
  };
}
