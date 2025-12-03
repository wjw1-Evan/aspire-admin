/**
 * Request utilities for API configuration
 */

/**
 * Get the API base URL based on the environment
 * - Development: uses proxy (empty string)
 * - Production: uses environment variable or empty string
 */
export function getApiBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    // In development, we use the proxy configured in umi
    return '';
  }

  // In production, use the environment variable or empty string
  return process.env.REACT_APP_API_BASE_URL || '';
}

