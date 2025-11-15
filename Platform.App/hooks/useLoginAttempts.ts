/**
 * 登录尝试跟踪 Hook
 * 防止暴力破解，限制登录尝试次数
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginAttempt {
  readonly timestamp: number;
  readonly username: string;
  readonly success: boolean;
}

interface LoginAttemptsConfig {
  readonly maxAttempts: number;
  readonly lockDuration: number; // 毫秒
  readonly attemptWindow: number; // 毫秒
}

interface LoginAttemptsState {
  readonly attempts: LoginAttempt[];
  readonly isLocked: boolean;
  readonly lockTimeRemaining: number;
}

const STORAGE_KEY = 'login_attempts';

const DEFAULT_CONFIG: LoginAttemptsConfig = {
  maxAttempts: 5,
  lockDuration: 15 * 60 * 1000, // 15分钟
  attemptWindow: 5 * 60 * 1000, // 5分钟
};

export function useLoginAttempts(config: Partial<LoginAttemptsConfig> = {}) {
  // 使用 useMemo 确保 finalConfig 引用稳定，避免无限循环
  // 注意：config 对象本身可能每次都是新的引用，所以我们需要比较其属性值
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [
    // 使用 JSON.stringify 来比较对象，但只在值变化时更新
    JSON.stringify({
      maxAttempts: config.maxAttempts,
      lockDuration: config.lockDuration,
      attemptWindow: config.attemptWindow,
    }),
  ]);
  
  const [state, setState] = useState<LoginAttemptsState>({
    attempts: [],
    isLocked: false,
    lockTimeRemaining: 0,
  });

  // 从存储中加载登录尝试记录
  const loadAttempts = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const attempts: LoginAttempt[] = JSON.parse(stored);
      const now = Date.now();
      
      // 过滤掉过期的尝试记录
      const validAttempts = attempts.filter(
        attempt => now - attempt.timestamp < finalConfig.attemptWindow
      );
      
      // 检查是否被锁定
      const recentFailedAttempts = validAttempts.filter(
        attempt => !attempt.success && now - attempt.timestamp < finalConfig.lockDuration
      );
      
      const isLocked = recentFailedAttempts.length >= finalConfig.maxAttempts;
      const lockTimeRemaining = isLocked 
        ? finalConfig.lockDuration - (now - Math.min(...recentFailedAttempts.map(a => a.timestamp)))
        : 0;
      
      setState({
        attempts: validAttempts,
        isLocked,
        lockTimeRemaining: Math.max(0, lockTimeRemaining),
      });
      
      // 如果数据有变化，更新存储
      if (validAttempts.length !== attempts.length) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validAttempts));
      }
    } catch (error) {
      console.error('Failed to load login attempts:', error);
    }
  }, [finalConfig]);

  // 记录登录尝试
  const recordAttempt = useCallback(async (username: string, success: boolean) => {
    try {
      const now = Date.now();
      const newAttempt: LoginAttempt = {
        timestamp: now,
        username,
        success,
      };
      
      const updatedAttempts = [...state.attempts, newAttempt];
      
      // 过滤掉过期的尝试记录
      const validAttempts = updatedAttempts.filter(
        attempt => now - attempt.timestamp < finalConfig.attemptWindow
      );
      
      // 检查是否被锁定
      const recentFailedAttempts = validAttempts.filter(
        attempt => !attempt.success && now - attempt.timestamp < finalConfig.lockDuration
      );
      
      const isLocked = recentFailedAttempts.length >= finalConfig.maxAttempts;
      const lockTimeRemaining = isLocked 
        ? finalConfig.lockDuration - (now - Math.min(...recentFailedAttempts.map(a => a.timestamp)))
        : 0;
      
      setState({
        attempts: validAttempts,
        isLocked,
        lockTimeRemaining: Math.max(0, lockTimeRemaining),
      });
      
      // 保存到存储
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validAttempts));
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }, [state.attempts, finalConfig]);

  // 清除登录尝试记录
  const clearAttempts = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setState({
        attempts: [],
        isLocked: false,
        lockTimeRemaining: 0,
      });
    } catch (error) {
      console.error('Failed to clear login attempts:', error);
    }
  }, []);

  // 获取剩余尝试次数
  const getRemainingAttempts = useCallback((username?: string) => {
    const now = Date.now();
    const recentAttempts = state.attempts.filter(
      attempt => 
        now - attempt.timestamp < finalConfig.attemptWindow &&
        (!username || attempt.username === username)
    );
    
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    return Math.max(0, finalConfig.maxAttempts - failedAttempts.length);
  }, [state.attempts, finalConfig]);

  // 格式化锁定剩余时间
  const formatLockTime = useCallback((milliseconds: number) => {
    const minutes = Math.ceil(milliseconds / (60 * 1000));
    return `${minutes} 分钟`;
  }, []);

  // 检查是否可以尝试登录
  const canAttemptLogin = useCallback((username?: string) => {
    if (state.isLocked) {
      return false;
    }
    
    const remaining = getRemainingAttempts(username);
    return remaining > 0;
  }, [state.isLocked, getRemainingAttempts]);

  // 获取锁定状态信息
  const getLockInfo = useCallback(() => {
    if (!state.isLocked) {
      return null;
    }
    
    return {
      isLocked: true,
      timeRemaining: state.lockTimeRemaining,
      formattedTime: formatLockTime(state.lockTimeRemaining),
      reason: '登录尝试次数过多，账户已被临时锁定',
    };
  }, [state.isLocked, state.lockTimeRemaining, formatLockTime]);

  // 初始化时加载数据（只在组件挂载时执行一次）
  useEffect(() => {
    void loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次，避免无限循环

  // 定期更新锁定状态
  useEffect(() => {
    if (!state.isLocked || state.lockTimeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setState(prev => {
        const newTimeRemaining = Math.max(0, prev.lockTimeRemaining - 1000);
        return {
          ...prev,
          lockTimeRemaining: newTimeRemaining,
          isLocked: newTimeRemaining > 0,
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state.isLocked, state.lockTimeRemaining]);

  return {
    ...state,
    maxAttempts: finalConfig.maxAttempts,
    lockDuration: finalConfig.lockDuration,
    recordAttempt,
    clearAttempts,
    getRemainingAttempts,
    formatLockTime,
    canAttemptLogin,
    getLockInfo,
  };
}
