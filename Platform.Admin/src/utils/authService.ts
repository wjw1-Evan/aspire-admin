import { history } from '@umijs/max';
import { tokenUtils } from './token';

let isRedirecting = false;

export function redirectToLogin(reason?: string): void {
  if (isRedirecting) return;

  const currentPath = history.location.pathname;
  if (currentPath === '/user/login' || currentPath.startsWith('/user/login')) return;

  isRedirecting = true;
  tokenUtils.clearAllTokens();
  history.push('/user/login');

  setTimeout(() => {
    isRedirecting = false;
  }, 1000);
}
