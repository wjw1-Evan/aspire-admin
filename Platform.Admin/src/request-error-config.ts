import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';

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
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
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
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      // 检查是否是认证相关的错误（401/404），这些已经在 app.tsx 中处理过了
      const isAuthError =
        error.response?.status === 401 || error.response?.status === 404;
      const isCurrentUserRequest =
        error.config?.url?.includes('/api/currentUser');

      if (isAuthError && isCurrentUserRequest) {
        // 认证错误已经在 app.tsx 的响应拦截器中处理过了，这里不重复显示消息
        console.log('认证错误已在响应拦截器中处理，跳过重复错误显示');
        return;
      }

      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;

          // 对于认证相关的业务错误，也不显示消息（已在响应拦截器处理）
          if (
            errorCode === 'USER_NOT_FOUND' ||
            errorCode === 'UNAUTHORIZED' ||
            errorCode === 'TOKEN_EXPIRED'
          ) {
            console.log(
              '认证相关业务错误已在响应拦截器中处理，跳过重复错误显示',
            );
            return;
          }

          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        // 但排除认证错误，因为这些已经在响应拦截器中处理过了
        if (!isAuthError) {
          message.error(`Response status:${error.response.status}`);
        } else {
          console.log('HTTP认证错误已在响应拦截器中处理，跳过重复错误显示');
        }
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        message.error('网络连接失败，请检查网络后重试。');
      } else {
        // 发送请求时出了点问题
        message.error('请求发送失败，请稍后重试。');
      }
    },
  },

  // 请求拦截器 - 移除错误的token参数添加
  // requestInterceptors: [
  //   (config: RequestOptions) => {
  //     // 拦截请求配置，进行个性化处理。
  //     const url = config?.url?.concat('?token=123');
  //     return { ...config, url };
  //   },
  // ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      // 注意：不在这里显示通用错误消息，避免与 errorHandler 重复
      // errorHandler 会根据 showType 智能显示错误消息
      return response;
    },
  ],
};
