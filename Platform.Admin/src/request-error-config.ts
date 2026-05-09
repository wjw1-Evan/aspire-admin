import type { RequestConfig } from '@umijs/max';
import { history, getIntl, getLocale } from '@umijs/max';
import { errorInterceptor } from '@/utils/errorInterceptor';
import { redirectToLogin } from '@/utils/authService';
import { tokenUtils } from '@/utils/token';
import { getMessage } from '@/utils/antdAppInstance';

const runAfterRender = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
};

export const errorConfig: RequestConfig = {
  errorConfig: {
    errorThrower: (res) => {
      if (res.success === true) return;

      const tempRes = res as any;
      if (tempRes.success === false) {
        const error: any = new Error(tempRes.message || '请求失败');
        error.name = 'BizError';
        error.info = { message: tempRes.message, errorCode: tempRes.errorCode, data: tempRes.data, errors: tempRes.errors };
        throw error;
      }
    },

    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      if (error?.skipGlobalHandler) return;

      const context = {
        url: error.config?.url,
        method: error.config?.method,
        requestId: error.config?.requestId,
      };

      const isLoginRequest = error.config?.url?.includes('/apiservice/api/auth/login');
      const isAuthError = error.response?.status === 401;

      if (isLoginRequest && error.name === 'BizError') return;

      if (isAuthError) {
        if (error?._tokenRefreshAttempted) {
          tokenUtils.clearAllTokens();
          redirectToLogin('Token refresh failed');
          return;
        }
        const isCurrentUserRequest = error.config?.url?.includes('/apiservice/api/auth/current-user');
        if (isCurrentUserRequest) {
          redirectToLogin(`HTTP ${error.response?.status}`);
        }
        errorInterceptor.handleError(error, context);
        return;
      }

      errorInterceptor.handleError(error, context);
    },
  },

  responseInterceptors: [
    (response) => response,
  ],
};
