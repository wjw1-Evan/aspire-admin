// 认证相关的工具函数

import { PermissionCheck, CurrentUser } from '@/types/auth';
import { apiService } from '@/services/api';

// Token 工具函数
export const tokenUtils = {
  // 解析 JWT token
  parseJWT: (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT:', error);
      return null;
    }
  },

  // 检查 token 是否过期
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = tokenUtils.parseJWT(token);
    if (!payload?.exp) {
      return true;
    }
      
      // 提前 5 分钟认为 token 过期
      const bufferTime = 5 * 60; // 5 分钟（秒）
      return Date.now() / 1000 >= (payload.exp - bufferTime);
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true;
    }
  },

  // 获取 token 过期时间
  getTokenExpiration: (token: string): Date | null => {
    try {
      const payload = tokenUtils.parseJWT(token);
    if (!payload?.exp) {
      return null;
    }
      
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Failed to get token expiration:', error);
      return null;
    }
  },

  // 获取 token 中的用户信息
  getTokenUserInfo: (token: string): any => {
    try {
      const payload = tokenUtils.parseJWT(token);
      return payload || null;
    } catch (error) {
      console.error('Failed to get user info from token:', error);
      return null;
    }
  },
};

// 权限检查工具函数
export const permissionUtils = {
  // 检查用户是否有特定权限
  hasPermission: (user: CurrentUser | null, permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  },

  // 检查用户是否有特定角色
  hasRole: (user: CurrentUser | null, role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  },

  // 检查用户是否有多个权限中的任意一个
  hasAnyPermission: (user: CurrentUser | null, permissions: string[]): boolean => {
    return user?.permissions ? permissions.some(permission => user.permissions?.includes(permission)) : false;
  },

  // 检查用户是否有多个权限中的全部
  hasAllPermissions: (user: CurrentUser | null, permissions: string[]): boolean => {
    return user?.permissions ? permissions.every(permission => user.permissions?.includes(permission)) : false;
  },

  // 检查用户是否有多个角色中的任意一个
  hasAnyRole: (user: CurrentUser | null, roles: string[]): boolean => {
    return user?.roles ? roles.some(role => user.roles?.includes(role)) : false;
  },

  // 检查用户是否有多个角色中的全部
  hasAllRoles: (user: CurrentUser | null, roles: string[]): boolean => {
    return user?.roles ? roles.every(role => user.roles?.includes(role)) : false;
  },

  // 检查资源权限（格式：resource:action）
  hasResourcePermission: (user: CurrentUser | null, resource: string, action: string): boolean => {
    const resourcePermission = `${resource}:${action}`;
    return user?.permissions?.includes(resourcePermission) ?? false;
  },

  // 解析权限检查对象
  checkPermission: (user: CurrentUser | null, check: PermissionCheck): boolean => {
    if (!user) {
      return false;
    }

    const { permission, role, resource, action } = check;

    // 检查角色
    if (role && permissionUtils.hasRole(user, role)) {
      return true;
    }

    // 检查权限
    if (permission && permissionUtils.hasPermission(user, permission)) {
      return true;
    }

    // 检查资源权限
    if (resource && action && permissionUtils.hasResourcePermission(user, resource, action)) {
      return true;
    }

    return false;
  },
};

// 存储工具函数
export const storageUtils = {
  // 安全地存储敏感数据
  setSecureItem: async (key: string, value: string): Promise<void> => {
    try {
      // 在实际应用中，这里应该使用更安全的存储方式
      // 例如：Keychain (iOS) 或 Keystore (Android)
      await apiService.setToken(value);
    } catch (error) {
      console.error('Failed to set secure item:', error);
      throw error;
    }
  },

  // 安全地获取敏感数据
  getSecureItem: async (key: string): Promise<string | null> => {
    try {
      return await apiService.getToken();
    } catch (error) {
      console.error('Failed to get secure item:', error);
      return null;
    }
  },

  // 清除敏感数据
  clearSecureItem: async (key: string): Promise<void> => {
    try {
      await apiService.removeToken();
    } catch (error) {
      console.error('Failed to clear secure item:', error);
    }
  },
};

// 网络工具函数
export const networkUtils = {
  // 检查网络连接状态
  isOnline: (): boolean => {
    return navigator.onLine;
  },

  // 等待网络连接
  waitForConnection: (): Promise<void> => {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve();
        return;
      }

      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };

      window.addEventListener('online', handleOnline);
    });
  },

  // 检查 API 连接
  checkApiConnection: async (): Promise<boolean> => {
    try {
      return await apiService.isOnline();
    } catch (error) {
      console.error('Failed to check API connection:', error);
      return false;
    }
  },
};

// 安全工具函数
export const securityUtils = {
  // 生成随机字符串
  generateRandomString: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 生成设备指纹
  generateDeviceFingerprint: (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Device fingerprint', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join('|');
    
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  },

  // 检查是否在安全上下文中
  isSecureContext: (): boolean => {
    return window.isSecureContext || location.protocol === 'https:';
  },
};

// 时间工具函数
export const timeUtils = {
  // 格式化时间
  formatTime: (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  },

  // 计算相对时间
  getRelativeTime: (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    
    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < week) {
      return `${Math.floor(diff / day)}天前`;
    } else if (diff < month) {
      return `${Math.floor(diff / week)}周前`;
    } else {
      return `${Math.floor(diff / month)}个月前`;
    }
  },

  // 检查时间是否过期
  isExpired: (timestamp: number, bufferMinutes: number = 5): boolean => {
    const bufferTime = bufferMinutes * 60 * 1000;
    return Date.now() >= (timestamp - bufferTime);
  },
};

// 验证工具函数
export const validationUtils = {
  // 验证邮箱格式
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 验证手机号格式（中国大陆）
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 验证密码强度
  isStrongPassword: (password: string): boolean => {
    // 至少8位，包含大小写字母、数字和特殊字符
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },

  // 验证用户名格式
  isValidUsername: (username: string): boolean => {
    // 3-20位，只能包含字母、数字、下划线
    const usernameRegex = /^\w{3,20}$/;
    return usernameRegex.test(username);
  },
};
