// 登录尝试跟踪 Hook - 防止暴力破解

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginAttempt {
  readonly timestamp: number;
  readonly username: string;
  readonly success: boolean;
}

interface LoginAttemptsState {
  readonly attempts: LoginAttempt[];
  readonly isLocked: boolean;
  readonly lockTimeRemaining: number;
  readonly maxAttempts: number;
  readonly lockDuration: number; // 锁定时间（毫秒）
}

const STORAGE_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5; // 最大尝试次数
const LOCK_DURATION = 15 * 60 * 1000; // 锁定15分钟
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5分钟内的尝试计入

export function useLoginAttempts() {
  const [state, setState] = useState<LoginAttemptsState>({
    attempts: [],
    isLocked: false,
    lockTimeRemaining: 0,
    maxAttempts: MAX_ATTEMPTS,
    lockDuration: LOCK_DURATION,
  });

  // 从存储中加载登录尝试记录
  const loadAttempts = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const attempts: LoginAttempt[] = JSON.parse(stored);
        const now = Date.now();
        
        // 过滤掉过期的尝试记录
        const validAttempts = attempts.filter(
          attempt => now - attempt.timestamp < ATTEMPT_WINDOW
        );
        
        // 检查是否被锁定
        const recentFailedAttempts = validAttempts.filter(
          attempt => !attempt.success && now - attempt.timestamp < LOCK_DURATION
        );
        
        const isLocked = recentFailedAttempts.length >= MAX_ATTEMPTS;
        const lockTimeRemaining = isLocked 
          ? LOCK_DURATION - (now - Math.min(...recentFailedAttempts.map(a => a.timestamp)))
          : 0;
        
        setState(prev => ({
          ...prev,
          attempts: validAttempts,
          isLocked,
          lockTimeRemaining: Math.max(0, lockTimeRemaining),
        }));
        
        // 如果数据有变化，更新存储
        if (validAttempts.length !== attempts.length) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validAttempts));
        }
      }
    } catch (error) {
      console.error('Failed to load login attempts:', error);
    }
  }, []);

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
        attempt => now - attempt.timestamp < ATTEMPT_WINDOW
      );
      
      // 检查是否被锁定
      const recentFailedAttempts = validAttempts.filter(
        attempt => !attempt.success && now - attempt.timestamp < LOCK_DURATION
      );
      
      const isLocked = recentFailedAttempts.length >= MAX_ATTEMPTS;
      const lockTimeRemaining = isLocked 
        ? LOCK_DURATION - (now - Math.min(...recentFailedAttempts.map(a => a.timestamp)))
        : 0;
      
      setState(prev => ({
        ...prev,
        attempts: validAttempts,
        isLocked,
        lockTimeRemaining: Math.max(0, lockTimeRemaining),
      }));
      
      // 保存到存储
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validAttempts));
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }, [state.attempts]);

  // 清除登录尝试记录
  const clearAttempts = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setState(prev => ({
        ...prev,
        attempts: [],
        isLocked: false,
        lockTimeRemaining: 0,
      }));
    } catch (error) {
      console.error('Failed to clear login attempts:', error);
    }
  }, []);

  // 获取剩余尝试次数
  const getRemainingAttempts = useCallback((username?: string) => {
    const now = Date.now();
    const recentAttempts = state.attempts.filter(
      attempt => 
        now - attempt.timestamp < ATTEMPT_WINDOW &&
        (!username || attempt.username === username)
    );
    
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    return Math.max(0, MAX_ATTEMPTS - failedAttempts.length);
  }, [state.attempts]);

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

  // 初始化时加载数据
  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  // 定期更新锁定状态
  useEffect(() => {
    if (state.isLocked && state.lockTimeRemaining > 0) {
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
    }
    
    // 如果没有锁定状态，返回空的清理函数
    return () => {};
  }, [state.isLocked, state.lockTimeRemaining]);

  return {
    ...state,
    recordAttempt,
    clearAttempts,
    getRemainingAttempts,
    formatLockTime,
    canAttemptLogin,
    getLockInfo,
    loadAttempts,
  };
}
