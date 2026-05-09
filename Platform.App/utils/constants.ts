/**
 * Application constants
 */

import { Platform } from 'react-native';
import { APIGATEWAY_URL } from '../constants/env-config';

// API Configuration
// Web 开发模式通过 Metro proxy 转发，使用同源请求避免跨域
// 原生端直接请求 API 网关
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? ''
    : `${APIGATEWAY_URL}/apiservice`
  : process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.yourproduction.com';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@aspire_access_token',
  REFRESH_TOKEN: '@aspire_refresh_token',
  USER_INFO: '@aspire_user_info',
  CURRENT_COMPANY_ID: '@aspire_current_company_id',
  TOKEN_EXPIRES: '@aspire_token_expires_at',
} as const;

// App Configuration
export const APP_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  REQUEST_TIMEOUT: 30000, // 30 seconds
} as const;
