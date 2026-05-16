/**
 * Application constants
 */

import { Platform } from 'react-native';
import { getDevServerOrigin } from '../constants/env-config';

// API Configuration
// 开发模式统一通过 Metro proxy 转发（Web 同源 / 原生端走 dev server），避免 ATS 等问题
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? ''
    : getDevServerOrigin()
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
