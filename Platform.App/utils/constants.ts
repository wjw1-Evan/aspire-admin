/**
 * Application constants
 */

import { APIGATEWAY_URL } from '../constants/env-config';

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? `${APIGATEWAY_URL}/apiservice`
  : process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.yourproduction.com';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@aspire_access_token',
  REFRESH_TOKEN: '@aspire_refresh_token',
  USER_INFO: '@aspire_user_info',
  CURRENT_COMPANY_ID: '@aspire_current_company_id',
} as const;

// App Configuration
export const APP_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  REQUEST_TIMEOUT: 30000, // 30 seconds
} as const;
