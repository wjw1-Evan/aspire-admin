/**
 * Token 工具函数
 * 提供 JWT token 的解析和验证功能
 */

// Token 过期缓冲时间（秒）
const TOKEN_EXPIRY_BUFFER_SECONDS = 5 * 60; // 5分钟

/**
 * 解析 JWT token
 */
export function parseJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const base64Url = parts[1];
    if (!base64Url) {
      throw new Error('Invalid JWT payload');
    }
    
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
}

/**
 * 检查 token 是否过期
 */
export function isTokenExpired(token: string, bufferSeconds = TOKEN_EXPIRY_BUFFER_SECONDS): boolean {
  try {
    const payload = parseJWT(token);
    if (!payload?.exp) {
      return true;
    }
    
    return Date.now() / 1000 >= (payload.exp - bufferSeconds);
  } catch (error) {
    console.error('Failed to check token expiration:', error);
    return true;
  }
}

/**
 * 获取 token 过期时间
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = parseJWT(token);
    if (!payload?.exp) {
      return null;
    }
    
    return new Date(payload.exp * 1000);
  } catch (error) {
    console.error('Failed to get token expiration:', error);
    return null;
  }
}

/**
 * 获取 token 中的用户信息
 */
export function getTokenUserInfo(token: string): any {
  try {
    return parseJWT(token);
  } catch (error) {
    console.error('Failed to get user info from token:', error);
    return null;
  }
}

