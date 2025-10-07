// 网络配置工具

import { Platform } from 'react-native';

/**
 * 获取本机IP地址的说明
 */
export const getLocalIPInstructions = (): string => {
  const platform = Platform.OS;
  
  switch (platform) {
    case 'ios':
    case 'macos':
      return '在终端运行: ipconfig getifaddr en0';
    case 'android':
      return '在设置中查看WiFi连接的IP地址';
    case 'web':
      return '在浏览器开发者工具中查看网络信息';
    default:
      return '请查看你的网络设置获取本机IP地址';
  }
};

/**
 * 验证IP地址格式
 */
export const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return ipRegex.test(ip);
};

/**
 * 验证URL格式
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 验证API网关地址格式
 */
export const isValidApiGatewayUrl = (url: string): boolean => {
  if (!url?.startsWith('http')) {
    return false;
  }
  return isValidUrl(url);
};

/**
 * 测试API连接
 */
export const testApiConnection = async (baseUrl: string): Promise<boolean> => {
  try {
    // 使用 apiService 进行连接测试
    const { apiService } = await import('@/services/api');
    await apiService.isOnline();
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

/**
 * 获取网络状态信息
 */
export const getNetworkInfo = () => {
  return {
    platform: Platform.OS,
    isDev: __DEV__,
    instructions: getLocalIPInstructions(),
  };
};
