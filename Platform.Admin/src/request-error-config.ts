import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { errorInterceptor } from '@/utils/errorInterceptor';
import AuthenticationService from '@/utils/authService';
import { tokenUtils } from '@/utils/token';
import { getMessage } from '@/utils/antdAppInstance';

// 将提示操作调度到渲染阶段之外，避免 React 18 并发模式警告
const runAfterRender = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
};

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}

// 与后端约定的响应数据格式 - 统一 API 标准
interface ResponseStructure {
  success: boolean;
  data?: any;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: string;
  traceId?: string;
  showType?: ErrorShowType;
}

// .NET ProblemDetails 错误响应格式
interface ProblemDetailsResponse {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

/**
 * @name 统一错误处理
 * 使用统一的错误拦截器处理所有错误
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出 - 支持多种响应格式
    errorThrower: (res) => {
      // 1. 检查是否是成功响应（有 success 字段且为 true）
      if (res.success === true) {
        return; // 成功响应，不抛出错误
      }

      // 2. 检查是否是 ProblemDetails 格式（后端错误响应）
      // .NET 后端使用 ProblemDetails 中间件返回标准错误格式
      if (res.status && (res.title || res.detail)) {
        const problemDetails = res as unknown as ProblemDetailsResponse;
        const error: any = new Error(problemDetails.title || problemDetails.detail || '请求失败');
        error.name = 'BizError';
        error.info = {
          errorCode: problemDetails.type || `HTTP_${problemDetails.status}`,
          errorMessage: problemDetails.title || problemDetails.detail || '请求失败',
          showType: ErrorShowType.ERROR_MESSAGE,
          data: problemDetails,
          errors: problemDetails.errors, // 验证错误字段（用于表单验证）
        };
        throw error;
      }

      // 3. 检查是否是标准错误响应格式（有 success 字段但为 false）
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (success === false) {
        const error: any = new Error(errorMessage || '请求失败');
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error;
      }

      // 4. 如果都不匹配，可能是网络错误或其他未知错误，不在这里处理
      // 由响应拦截器的错误处理逻辑处理
    },

    // 统一错误处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      const context = {
        url: error.config?.url,
        method: error.config?.method,
        requestId: error.config?.requestId,
      };

      // 1. 统一处理认证错误（含后端返回 400 但表示未登录的情况）
      const messageText =
        error?.info?.errorMessage ||
        error?.response?.data?.errorMessage ||
        error?.response?.data?.title ||
        error?.message;

      const errorCode = error?.info?.errorCode || error?.response?.data?.errorCode;
      const isLoginRequest = error.config?.url?.includes('/api/auth/login') || 
                            error.config?.url?.includes('/login');
      
      const isAuthError = error.response?.status === 401;
      // 有些接口会返回 400 但实际是未登录/未找到当前用户
      const isMissingCurrentUser =
        error.response?.status === 400 &&
        (messageText?.includes('未找到当前用户信息') ||
          messageText?.toLowerCase?.().includes('current user') ||
          messageText?.toLowerCase?.().includes('unauthorized'));

      // 检查是否是认证相关的错误消息（避免已处理的认证错误重复处理）
      const isAuthErrorMessage =
        error.message === 'Authentication handled silently' ||
        error.message === 'Authentication handled';

      // 2. 特殊处理登录错误：只显示友好的消息提示，不显示技术性错误页面
      if (isLoginRequest && (errorCode === 'LOGIN_FAILED' || errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' || error.name === 'BizError')) {
        // 如果错误已经被登录页面处理过（标记了 skipGlobalHandler），直接返回
        if (error?.skipGlobalHandler) {
          return;
        }
        
        // 登录错误已经在登录页面中处理了，这里只需要静默处理，避免显示技术性错误页面
        // 如果登录页面没有处理（比如直接从错误拦截器抛出），则显示友好提示
        const { message: msg } = getMessage();
        const errorMessage = error?.info?.errorMessage || messageText || '登录失败，请检查用户名和密码';
        runAfterRender(() => {
          msg.error(errorMessage);
        });
        // 静默处理，不再抛出错误
        return;
      }

      if (isAuthError || isAuthErrorMessage || isMissingCurrentUser) {
        // 清除 token
        tokenUtils.clearAllTokens();

        // 如果是获取当前用户的请求，不显示错误提示（因为可能是未登录状态）
        const isCurrentUserRequest = error.config?.url?.includes('/api/auth/current-user') ||
          error.config?.url?.includes('/api/currentUser');
        if (isCurrentUserRequest || isAuthError || isMissingCurrentUser) {
          // 使用 AuthenticationService 统一跳转
          AuthenticationService.redirectToLogin(
            isAuthError
              ? `HTTP ${error.response?.status}`
              : isMissingCurrentUser
              ? 'Missing current user (backend 400)'
              : 'Token refresh failed'
          );
        }

        // 使用 errorInterceptor 静默处理（不显示错误提示给用户）
        errorInterceptor.handleError(error, context);
        return; // 不再抛出错误，避免重复处理
      }

      // 3. 其他错误使用统一拦截器处理
      errorInterceptor.handleError(error, context);
    },
  },

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      return response;
    },
  ],
};