import type { RequestConfig } from '@umijs/max';
import { errorInterceptor } from '@/utils/errorInterceptor';

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
  timestamp: string;
  traceId?: string;
  showType?: ErrorShowType;
}

/**
 * @name 统一错误处理
 * 使用统一的错误拦截器处理所有错误
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },
    
    // 统一错误处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      // 使用统一错误拦截器处理错误
      const context = {
        url: error.config?.url,
        method: error.config?.method,
        requestId: error.config?.requestId,
      };

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
