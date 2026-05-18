/**
 * Application constants
 */

import { Platform } from 'react-native';
import { getDevServerOrigin } from '../constants/env-config';

// API Configuration
// - Web 开发：同源代理（通过 Metro proxy / UmiJS 等 dev server 自动转发）
// - 原生开发：通过 Metro proxy 转发（Expo Go 只允许连接 bundle origin）
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? ''
    : getDevServerOrigin()
  : (process.env.EXPO_PUBLIC_API_BASE_URL ?? (() => { throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured'); })());

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
