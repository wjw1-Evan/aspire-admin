/**
 * 错误消息显示 Hook
 * 用于管理错误消息的显示和清除
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseErrorMessageOptions {
  /** 自动清除时间（毫秒），默认 5000 */
  autoHideDuration?: number;
}

interface UseErrorMessageReturn {
  /** 错误消息 */
  errorMessage: string;
  /** 显示错误消息 */
  showError: (title: string, message: string) => void;
  /** 清除错误消息 */
  clearError: () => void;
}

/**
 * 错误消息显示 Hook
 */
export function useErrorMessage(options: UseErrorMessageOptions = {}): UseErrorMessageReturn {
  const { autoHideDuration = 5000 } = options;
  const [errorMessage, setErrorMessage] = useState<string>('');
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清除错误消息
  const clearError = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setErrorMessage('');
  }, []);

  // 显示错误提示
  const showError = useCallback(
    (title: string, message: string) => {
      // 清除之前的自动隐藏定时器
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }

      // 立即设置错误消息（同步更新）
      const fullMessage = title ? `${title}: ${message}` : message;
      
      // 使用 React 的批处理确保状态更新
      setErrorMessage(fullMessage);

      // 设置自动清除定时器
      if (autoHideDuration > 0) {
        errorTimerRef.current = setTimeout(() => {
          setErrorMessage('');
          errorTimerRef.current = null;
        }, autoHideDuration);
      }
    },
    [autoHideDuration]
  );

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);

  return {
    errorMessage,
    showError,
    clearError,
  };
}

