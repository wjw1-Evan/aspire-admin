/**
 * 统一错误拦截器
 * 提供统一的错误处理、日志记录和用户提示
 * errorCode 优先翻译，message 作为 fallback
 */

import { getMessage, getNotification } from './antdAppInstance';
import { getIntl, getLocale } from '@umijs/max';

// 将提示操作调度到渲染阶段之外，避免 React 18 并发模式警告
const runAfterRender = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
};

// 翻译辅助函数：只翻译 errorCode，不翻译 message
const translateMessage = (msg: string, errorCode?: string): string => {
  console.debug('[translateMessage] 开始翻译', { errorCode, message: msg });
  // 只翻译 errorCode，不翻译 message（message 已经是处理过的）
  if (errorCode) {
    try {
      const intl = getIntl();
      const translated = intl.formatMessage({ id: errorCode, defaultMessage: '' });
      console.debug('[translateMessage] errorCode翻译结果', { errorCode, translated });
      if (translated && translated !== errorCode) {
        return translated;
      }
    } catch (e) {
      console.debug('[translateMessage] errorCode翻译异常', { errorCode, error: e });
    }
  }
  const result = msg || errorCode || '';
  console.debug('[translateMessage] 返回结果', { result });
  return result;
};

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS = 'BUSINESS',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// 错误显示方式
export enum ErrorDisplayType {
  SILENT = 'SILENT',           // 静默处理，不显示
  MESSAGE = 'MESSAGE',         // 显示消息提示
  NOTIFICATION = 'NOTIFICATION', // 显示通知
  MODAL = 'MODAL',            // 显示模态框
  REDIRECT = 'REDIRECT',       // 重定向
}

// 错误信息接口
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  httpCode?: string;
  errorCode?: string;
  message: string;
  debugData?: any;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  url?: string;
  method?: string;
}

// 错误处理配置
export interface ErrorHandlerConfig {
  displayType: ErrorDisplayType;
  showToUser: boolean;
  logToConsole: boolean;
  sendToMonitoring?: boolean;
  customHandler?: (error: ErrorInfo) => void;
}

// 错误处理规则
interface ErrorRule {
  condition: (error: any) => boolean;
  config: ErrorHandlerConfig;
}

class UnifiedErrorInterceptor {
  private readonly rules: ErrorRule[] = [];
  private defaultConfig: ErrorHandlerConfig = {
    displayType: ErrorDisplayType.MESSAGE,
    showToUser: true,
    logToConsole: true,
    sendToMonitoring: false,
  };

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认错误处理规则
   */
  private initializeDefaultRules() {
    // 认证错误规则
    this.addRule({
      condition: (error) => {
        return error.response?.status === 401 ||
          error.message === 'Authentication handled silently' ||
          error.message === 'Authentication handled';
      },
      config: {
        displayType: ErrorDisplayType.SILENT,
        showToUser: false,
        logToConsole: true,
        sendToMonitoring: false,
      },
    });

    // 网络错误规则
    this.addRule({
      condition: (error) => {
        return !error.response && error.request;
      },
      config: {
        displayType: ErrorDisplayType.MESSAGE,
        showToUser: true,
        logToConsole: true,
        sendToMonitoring: true,
      },
    });

    // 服务器错误规则
    this.addRule({
      condition: (error) => {
        return error.response?.status >= 500;
      },
      config: {
        displayType: ErrorDisplayType.MESSAGE,
        showToUser: true,
        logToConsole: true,
        sendToMonitoring: true,
      },
    });

    // 业务错误规则
    this.addRule({
      condition: (error) => {
        return error.name === 'BizError';
      },
      config: {
        displayType: ErrorDisplayType.MESSAGE,
        showToUser: true,
        logToConsole: true,
        sendToMonitoring: false,
      },
    });

    // 权限错误规则
    this.addRule({
      condition: (error) => {
        return error.response?.status === 403;
      },
      config: {
        displayType: ErrorDisplayType.MESSAGE,
        showToUser: true,
        logToConsole: true,
        sendToMonitoring: true,
      },
    });
  }

  /**
   * 添加错误处理规则
   */
  addRule(rule: ErrorRule) {
    this.rules.push(rule);
  }

  /**
   * 处理错误
   */
  handleError(error: any, context?: any): ErrorInfo {
    const errorInfo = this.parseError(error, context);
    const config = this.getErrorConfig(error);

    // 记录日志
    if (config.logToConsole) {
      this.logError(errorInfo);
    }

    // 发送到监控系统
    if (config.sendToMonitoring) {
      this.sendToMonitoring(errorInfo);
    }

    // 显示给用户（传递原始错误对象，用于提取所有验证错误）
    if (config.showToUser) {
      this.displayError(errorInfo, config, error);
    }

    // 自定义处理
    if (config.customHandler) {
      config.customHandler(errorInfo);
    }

    return errorInfo;
  }

  /**
   * 解析错误信息
   */
  private parseError(error: any, context?: any): ErrorInfo {
    const errorInfo: ErrorInfo = {
      type: this.determineErrorType(error),
      severity: this.determineErrorSeverity(error),
      message: this.extractErrorMessage(error),
      timestamp: new Date(),
    };

    // 添加额外信息
    // 优先从 error.info 中提取（UmiJS errorThrower 存储的位置）
    if (error.info?.errorCode) {
      errorInfo.errorCode = error.info.errorCode;
    } else if (error.response?.data?.errorCode) {
      errorInfo.errorCode = error.response.data.errorCode;
    }

    if (error.info?.code) {
      errorInfo.httpCode = error.info.code;
      errorInfo.debugData = error.info;
    } else if (error.response?.data?.code) {
      errorInfo.httpCode = error.response.data.code;
      errorInfo.debugData = error.response.data;
    } else if (error.response?.status) {
      errorInfo.httpCode = `HTTP_${error.response.status}`;
      errorInfo.debugData = error.response.data;
    }

    if (context) {
      errorInfo.url = context.url;
      errorInfo.method = context.method;
      errorInfo.requestId = context.requestId;
    }

    return errorInfo;
  }

  /**
   * 确定错误类型
   */
  private determineErrorType(error: any): ErrorType {
    if (error.response?.status === 401) {
      return ErrorType.AUTHENTICATION;
    }
    if (error.response?.status === 403) {
      return ErrorType.AUTHORIZATION;
    }
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return ErrorType.VALIDATION;
    }
    if (error.response?.status >= 500) {
      return ErrorType.SERVER;
    }
    if (!error.response && error.request) {
      return ErrorType.NETWORK;
    }
    if (error.name === 'BizError') {
      return ErrorType.BUSINESS;
    }
    return ErrorType.UNKNOWN;
  }

  /**
   * 确定错误严重程度
   */
  private determineErrorSeverity(error: any): ErrorSeverity {
    if (error.response?.status >= 500) {
      return ErrorSeverity.CRITICAL;
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return ErrorSeverity.HIGH;
    }
    if (error.response?.status >= 400) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  /**
   * 提取错误消息
   * 规则：errors -> errorCode -> message
   */
  private extractErrorMessage(error: any): string {
    // 1. 如果有 errors，直接返回错误码数组的第一个（不做翻译，由调用处处理）
    const validationErrors = this.extractValidationErrors(error);
    if (validationErrors.length > 0) {
      return validationErrors[0];
    }

    // 2. 如果有 errorCode，翻译 errorCode
    const errorCode = error?.info?.errorCode || error?.response?.data?.errorCode;
    if (errorCode) {
      const translated = translateMessage('', errorCode);
      if (translated) return translated;
    }

    // 3. 最后的 fallback 是 message
    if (error.message) {
      return error.message;
    }

    if (error.response?.status) {
      return `HTTP ${error.response.status} Error`;
    }

    return '未知错误';
  }

/**
   * 提取所有验证错误消息
   * 优先级: errors (字段错误) -> errorCode -> message
   * 有 errorCode 时只翻译 errorCode，不再显示 message
   */
  extractValidationErrors(error: any): string[] {
    const errors: string[] = [];
    const intl = getIntl();

    // 1. 优先从 errors 字典中提取字段级验证错误（.NET ProblemDetails 格式）
    if (error?.response?.data?.errors) {
      const validationErrors = error.response.data.errors;
      Object.keys(validationErrors).forEach((field) => {
        const fieldErrors = validationErrors[field];
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach((err) => {
            const translated = intl.formatMessage({ id: err as string, defaultMessage: err as string });
            errors.push(translated);
          });
        } else if (typeof fieldErrors === 'string') {
          const translated = intl.formatMessage({ id: fieldErrors as string, defaultMessage: fieldErrors as string });
          errors.push(translated);
        }
      });
      if (errors.length > 0) {
        return errors;
      }
    }

    // 2. 有 errorCode 时只翻译 errorCode，不显示 message
    const errorCode = error?.response?.data?.errorCode || error?.info?.errorCode;
    if (errorCode) {
      const translated = intl.formatMessage({ id: errorCode as string, defaultMessage: errorCode as string });
      if (translated !== errorCode) {
        errors.push(translated);
      } else {
        errors.push('操作失败');
      }
      return errors;
    }

    // 3. 无 errorCode 时取 message
    const message = error?.response?.data?.message || error?.info?.message;
    if (message) {
      const translated = intl.formatMessage({ id: message as string, defaultMessage: message as string });
      errors.push(translated);
      return errors;
    }

    // 4. 最后的 fallback 是 Axios 错误消息
    if (error.message && !error.message.startsWith('Request failed')) {
      errors.push(error.message);
    }

    return errors;
  }

  /**
   * 获取错误处理配置
   */
  private getErrorConfig(error: any): ErrorHandlerConfig {
    for (const rule of this.rules) {
      if (rule.condition(error)) {
        return rule.config;
      }
    }
    return this.defaultConfig;
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo) {
    const logLevel = this.getLogLevel(errorInfo.severity);
    const logMessage = `[${errorInfo.type}] ${errorInfo.message}`;
    const logData = {
      httpCode: errorInfo.httpCode,
      errorCode: errorInfo.errorCode,
      url: errorInfo.url,
      method: errorInfo.method,
      timestamp: errorInfo.timestamp,
      debugData: errorInfo.debugData,
    };

    switch (logLevel) {
      case 'error':
        console.error(logMessage, logData);
        break;
      case 'warn':
        console.warn(logMessage, logData);
        break;
      case 'info':
        console.info(logMessage, logData);
        break;
      default:
        console.log(logMessage, logData);
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * 显示错误给用户
   */
  private displayError(errorInfo: ErrorInfo, config: ErrorHandlerConfig, originalError?: any) {
    const msgApi = getMessage();
    const notifApi = getNotification();

    // 检查 message 和 notification 是否可用
    if (!msgApi?.error || !notifApi?.error) {
      console.error('Message/Notification API not available:', errorInfo.message);
      return;
    }

    // 如果是验证错误（400状态码），尝试显示所有验证错误
    if (errorInfo.type === ErrorType.VALIDATION && originalError) {
      const validationErrors = this.extractValidationErrors(originalError);
      if (validationErrors.length > 1) {
        // 多个验证错误，依次显示所有错误
        validationErrors.forEach((msg, index) => {
          setTimeout(() => {
            if (config.displayType === ErrorDisplayType.MESSAGE) {
              runAfterRender(() => msgApi.error(msg, 3));
            } else if (config.displayType === ErrorDisplayType.NOTIFICATION) {
              runAfterRender(() =>
                notifApi.error({
                  message: `验证错误 ${index + 1}`,
                  description: msg,
                  duration: 3,
                }),
              );
            }
          }, index * 500);
        });
        return;
      } else if (validationErrors.length === 1) {
        // 单个验证错误，使用提取的错误消息
        errorInfo.message = validationErrors[0];
      }
    }

    switch (config.displayType) {
      case ErrorDisplayType.MESSAGE:
        runAfterRender(() => msgApi.error(errorInfo.message));
        break;
      case ErrorDisplayType.NOTIFICATION:
        // 错误显示优先级：errors > errorCode > message
        // - 如果有 errors，显示 "验证错误" 标题
        // - 否则如果有 errorCode，显示 errorCode 标题
        // - 否则显示 "错误" 标题
        const hasValidationErrors = originalError?.response?.data?.errors && Object.keys(originalError.response.data.errors).length > 0;
        const hasErrorCode = errorInfo.errorCode;
        let title = '错误';
        if (hasValidationErrors) {
          title = '验证错误';
        } else if (hasErrorCode) {
          // errorCode 已经是翻译后的结果
          title = errorInfo.message;
        }
        runAfterRender(() =>
          notifApi.error({
            message: title,
            description: errorInfo.message,
            duration: 4.5,
          }),
        );
        break;
      case ErrorDisplayType.MODAL:
        runAfterRender(() => msgApi.error(errorInfo.message));
        break;
      case ErrorDisplayType.REDIRECT:
        break;
      case ErrorDisplayType.SILENT:
        break;
    }
  }

  /**
   * 显示多个验证错误（用于需要显示所有字段错误的场景）
   */
  displayValidationErrors(error: any, displayType: ErrorDisplayType = ErrorDisplayType.MESSAGE) {
    const message = getMessage();
    const notification = getNotification();
    
    // 检查 message 和 notification 是否可用
    if (!message?.error || !notification?.error) {
      console.error('Message/Notification API not available in displayValidationErrors');
      return;
    }
    
    const errors = this.extractValidationErrors(error);

    if (errors.length === 0) {
      // 如果没有提取到错误，使用默认错误处理
      const errorInfo = this.parseError(error);
      this.displayError(errorInfo, {
        displayType,
        showToUser: true,
        logToConsole: true,
      });
      return;
    }

    if (errors.length === 1) {
      // 单个错误，直接显示
      if (displayType === ErrorDisplayType.MESSAGE) {
        runAfterRender(() => message.error(errors[0]));
      } else if (displayType === ErrorDisplayType.NOTIFICATION) {
        runAfterRender(() =>
          notification.error({
            message: getIntl(getLocale()).formatMessage({ id: 'request.error.validation', defaultMessage: '验证错误' }),
            description: errors[0],
            duration: 4.5,
          }),
        );
      }
    } else {
      // 多个错误，依次显示所有错误（每个错误显示3秒，间隔0.5秒）
      errors.forEach((msg, index) => {
        setTimeout(() => {
          if (displayType === ErrorDisplayType.MESSAGE) {
            runAfterRender(() => message.error(msg, 3));
          } else if (displayType === ErrorDisplayType.NOTIFICATION) {
            runAfterRender(() =>
              notification.error({
                message: `${getIntl(getLocale()).formatMessage({ id: 'request.error.validation', defaultMessage: '验证错误' })} ${index + 1}`,
                description: msg,
                duration: 3,
              }),
            );
          }
        }, index * 500);
      });
    }
  }

  /**
   * 发送到监控系统
   */
  private sendToMonitoring(errorInfo: ErrorInfo) {
    // 集成监控系统（如 Sentry、LogRocket 等）
    if (typeof globalThis !== 'undefined' && (globalThis as any).gtag) {
      (globalThis as any).gtag('event', 'exception', {
        description: errorInfo.message,
        fatal: errorInfo.severity === ErrorSeverity.CRITICAL,
      });
    }
  }

  /**
   * 创建错误处理中间件
   */
  createMiddleware() {
    return (error: any, context?: any) => {
      return this.handleError(error, context);
    };
  }

  /**
   * 设置默认配置
   */
  setDefaultConfig(config: Partial<ErrorHandlerConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

// 创建全局实例
export const errorInterceptor = new UnifiedErrorInterceptor();

// 导出便捷方法
export const handleError = (error: any, context?: any) => {
  return errorInterceptor.handleError(error, context);
};

export const addErrorRule = (rule: ErrorRule) => {
  errorInterceptor.addRule(rule);
};

export const setErrorConfig = (config: Partial<ErrorHandlerConfig>) => {
  errorInterceptor.setDefaultConfig(config);
};

/**
 * 提取所有验证错误消息（用于需要显示多个错误的场景）
 */
export const extractValidationErrors = (error: any): string[] => {
  return errorInterceptor.extractValidationErrors(error);
};

/**
 * 显示多个验证错误（用于需要显示所有字段错误的场景）
 */
export const displayValidationErrors = (error: any, displayType: ErrorDisplayType = ErrorDisplayType.MESSAGE) => {
  return errorInterceptor.displayValidationErrors(error, displayType);
};
