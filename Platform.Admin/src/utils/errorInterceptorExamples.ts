/**
 * 统一错误拦截器使用示例
 * 展示如何在项目中使用统一的错误处理机制
 */

import { errorInterceptor, ErrorType, ErrorSeverity, ErrorDisplayType, addErrorRule, setErrorConfig } from '@/utils/errorInterceptor';

// ==================== 基础使用 ====================

/**
 * 示例 1: 基础错误处理
 */
export function basicErrorHandling() {
  try {
    // 模拟一个会出错的 API 调用
    throw new Error('网络连接失败');
  } catch (error) {
    // 使用统一错误拦截器处理
    const errorInfo = errorInterceptor.handleError(error, {
      url: '/api/users',
      method: 'GET',
      requestId: 'req-123',
    });
    
    console.log('错误信息:', errorInfo);
  }
}

// ==================== 自定义错误规则 ====================

/**
 * 示例 2: 添加自定义错误处理规则
 */
export function addCustomErrorRules() {
  // 添加特定业务错误规则
  addErrorRule({
    condition: (error) => {
      return error.response?.data?.errorCode === 'INSUFFICIENT_BALANCE';
    },
    config: {
      displayType: ErrorDisplayType.NOTIFICATION,
      showToUser: true,
      logToConsole: true,
      sendToMonitoring: true,
      customHandler: (errorInfo) => {
        // 自定义处理逻辑
        console.log('余额不足，跳转到充值页面');
        // window.location.href = '/recharge';
      },
    },
  });

  // 添加特定 API 错误规则
  addErrorRule({
    condition: (error) => {
      return error.config?.url?.includes('/api/payment');
    },
    config: {
      displayType: ErrorDisplayType.MODAL,
      showToUser: true,
      logToConsole: true,
      sendToMonitoring: true,
    },
  });
}

// ==================== 配置错误处理 ====================

/**
 * 示例 3: 配置默认错误处理行为
 */
export function configureErrorHandling() {
  // 设置默认配置
  setErrorConfig({
    displayType: ErrorDisplayType.MESSAGE,
    showToUser: true,
    logToConsole: true,
    sendToMonitoring: true,
  });

  // 开发环境配置
  if (process.env.NODE_ENV === 'development') {
    setErrorConfig({
      logToConsole: true,
      sendToMonitoring: false,
    });
  }

  // 生产环境配置
  if (process.env.NODE_ENV === 'production') {
    setErrorConfig({
      logToConsole: false,
      sendToMonitoring: true,
    });
  }
}

// ==================== 在组件中使用 ====================

/**
 * 示例 4: 在 React 组件中使用
 */
import React, { useState } from 'react';
import { Button } from 'antd';

export function ErrorHandlingComponent() {
  const [loading, setLoading] = useState(false);

  const handleApiCall = async () => {
    setLoading(true);
    try {
      // 模拟 API 调用
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('数据:', data);
    } catch (error) {
      // 使用统一错误拦截器
      errorInterceptor.handleError(error, {
        url: '/api/data',
        method: 'GET',
        requestId: `req-${Date.now()}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button loading={loading} onClick={handleApiCall}>
        调用 API
      </Button>
    </div>
  );
}

// ==================== 在 Hook 中使用 ====================

/**
 * 示例 5: 在自定义 Hook 中使用
 */
import { useState, useCallback } from 'react';

export function useApiWithErrorHandling() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      return result;
    } catch (error) {
      // 使用统一错误拦截器
      errorInterceptor.handleError(error, {
        url,
        method: 'GET',
        requestId: `hook-${Date.now()}`,
      });
      throw error; // 重新抛出错误，让调用者处理
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetchData };
}

// ==================== 在服务中使用 ====================

/**
 * 示例 6: 在服务类中使用
 */
export class UserService {
  async getUser(id: string) {
    try {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error(`用户 ${id} 不存在`);
      }
      return await response.json();
    } catch (error) {
      // 使用统一错误拦截器
      errorInterceptor.handleError(error, {
        url: `/api/users/${id}`,
        method: 'GET',
        requestId: `user-service-${Date.now()}`,
      });
      throw error;
    }
  }

  async createUser(userData: any) {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('创建用户失败');
      }
      return await response.json();
    } catch (error) {
      // 使用统一错误拦截器
      errorInterceptor.handleError(error, {
        url: '/api/users',
        method: 'POST',
        requestId: `user-service-create-${Date.now()}`,
      });
      throw error;
    }
  }
}

// ==================== 错误监控集成 ====================

/**
 * 示例 7: 集成错误监控系统
 */
export function setupErrorMonitoring() {
  // 添加 Sentry 集成规则
  addErrorRule({
    condition: (error) => {
      return error.response?.status >= 500;
    },
    config: {
      displayType: ErrorDisplayType.MESSAGE,
      showToUser: true,
      logToConsole: true,
      sendToMonitoring: true,
      customHandler: (errorInfo) => {
        // 发送到 Sentry
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(errorInfo);
        }
      },
    },
  });

  // 添加 Google Analytics 集成
  addErrorRule({
    condition: (error) => {
      return error.type === ErrorType.NETWORK;
    },
    config: {
      displayType: ErrorDisplayType.MESSAGE,
      showToUser: true,
      logToConsole: true,
      sendToMonitoring: true,
      customHandler: (errorInfo) => {
        // 发送到 Google Analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'exception', {
            description: errorInfo.message,
            fatal: false,
          });
        }
      },
    },
  });
}

// ==================== 错误恢复策略 ====================

/**
 * 示例 8: 实现错误恢复策略
 */
export function implementErrorRecovery() {
  // 网络错误自动重试
  addErrorRule({
    condition: (error) => {
      return error.type === ErrorType.NETWORK;
    },
    config: {
      displayType: ErrorDisplayType.SILENT,
      showToUser: false,
      logToConsole: true,
      sendToMonitoring: true,
      customHandler: (errorInfo) => {
        // 实现自动重试逻辑
        console.log('网络错误，尝试重新连接...');
        setTimeout(() => {
          // 重新发起请求
          console.log('重新发起请求');
        }, 2000);
      },
    },
  });

  // 认证错误自动跳转
  addErrorRule({
    condition: (error) => {
      return error.type === ErrorType.AUTHENTICATION;
    },
    config: {
      displayType: ErrorDisplayType.SILENT,
      showToUser: false,
      logToConsole: true,
      sendToMonitoring: false,
      customHandler: (errorInfo) => {
        // 自动跳转到登录页面
        console.log('认证失败，跳转到登录页面');
        // window.location.href = '/login';
      },
    },
  });
}

// ==================== 导出配置函数 ====================

/**
 * 初始化错误处理配置
 * 在应用启动时调用
 */
export function initializeErrorHandling() {
  // 配置默认行为
  configureErrorHandling();
  
  // 添加自定义规则
  addCustomErrorRules();
  
  // 设置错误监控
  setupErrorMonitoring();
  
  // 实现错误恢复
  implementErrorRecovery();
  
  console.log('统一错误拦截器已初始化');
}
