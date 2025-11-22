/**
 * 认证服务
 * 统一处理认证相关的操作，包括 token 刷新、跳转登录等
 */

import { history } from '@umijs/max';
import { tokenUtils } from './token';

/**
 * 认证服务类
 * 提供统一的认证相关操作接口
 */
class AuthenticationService {
  private static isRedirecting = false;

  /**
   * 跳转到登录页面
   * 防止重复跳转，统一处理认证失败的跳转逻辑
   */
  static redirectToLogin(reason?: string): void {
    // 防止重复跳转
    if (this.isRedirecting) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Already redirecting to login, skipping duplicate redirect');
      }
      return;
    }

    // 如果已经在登录页，不需要跳转
    const currentPath = history.location.pathname;
    if (currentPath === '/user/login' || currentPath.startsWith('/user/login')) {
      return;
    }

    this.isRedirecting = true;
    tokenUtils.clearAllTokens();

    // 记录跳转原因（用于调试）
    if (process.env.NODE_ENV === 'development' && reason) {
      console.log(`Redirecting to login: ${reason}`);
    }

    // 使用 history.push 同步跳转
    history.push('/user/login');

    // 重置标志（延迟执行，确保跳转完成）
    setTimeout(() => {
      this.isRedirecting = false;
    }, 1000);
  }

  /**
   * 检查是否正在跳转中
   */
  static isRedirectingInProgress(): boolean {
    return this.isRedirecting;
  }

  /**
   * 重置跳转状态（用于特殊情况）
   */
  static resetRedirectState(): void {
    this.isRedirecting = false;
  }
}

export default AuthenticationService;

