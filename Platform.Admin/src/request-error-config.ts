import type { RequestConfig } from '@umijs/max';
import { redirectToLogin } from '@/utils/authService';
import { errorInterceptor } from '@/utils/errorInterceptor';
import { tokenUtils } from '@/utils/token';

export const errorConfig: RequestConfig = {
  errorConfig: {
    errorThrower: (res) => {
      if (res.success === true) return;

      const tempRes = res as any;
      if (tempRes.success === false) {
        const error: any = new Error(tempRes.message || '请求失败');
        error.name = 'BizError';
        error.info = {
          message: tempRes.message,
          errorCode: tempRes.errorCode,
          data: tempRes.data,
          errors: tempRes.errors,
        };
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

      if (isLoginRequest) return;

      if (isAuthError) {
        tokenUtils.clearAllTokens();
        redirectToLogin('登录已过期，请重新登录');
        return;
      }

      errorInterceptor.handleError(error, context);
    },
  },

  responseInterceptors: [(response) => response],
};
