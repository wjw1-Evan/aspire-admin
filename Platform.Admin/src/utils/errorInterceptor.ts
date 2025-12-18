/**
 * 统一错误拦截器
 * 提供统一的错误处理、日志记录和用户提示
 */

import { getMessage, getNotification } from './antdAppInstance';

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
  code?: string;
  message: string;
  details?: any;
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
               error.response?.status === 404 ||
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
      errorInfo.code = error.info.errorCode;
      errorInfo.details = error.info;
    } else if (error.response) {
      errorInfo.code = error.response.data?.errorCode;
      errorInfo.details = error.response.data;
    } else if (error.errorCode) {
      // 如果错误对象直接包含 errorCode
      errorInfo.code = error.errorCode;
      errorInfo.details = error;
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
    if (error.response?.status === 401 || error.response?.status === 404) {
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
   */
  private extractErrorMessage(error: any): string {
    // 优先处理 ProblemDetails 格式的验证错误（.NET 标准错误格式）
    if (error?.response?.data?.errors) {
      const validationErrors = error.response.data.errors;
      const errorMessages: string[] = [];
      
      // 遍历所有字段的错误
      Object.keys(validationErrors).forEach((field) => {
        const fieldErrors = validationErrors[field];
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach((err: string) => {
            errorMessages.push(err);
          });
        } else if (typeof fieldErrors === 'string') {
          errorMessages.push(fieldErrors);
        }
      });
      
      // 如果有验证错误，返回第一个（最重要的）错误
      if (errorMessages.length > 0) {
        return errorMessages[0];
      }
    }
    
    // 优先从 error.info 中提取（UmiJS errorThrower 存储的位置）
    if (error.info?.errorMessage) {
      return error.info.errorMessage;
    }
    
    // 尝试从 error.response.data.title 获取（ProblemDetails 格式）
    if (error?.response?.data?.title) {
      return error.response.data.title;
    }
    
    if (error.response?.data?.errorMessage) {
      return error.response.data.errorMessage;
    }
    if (error.message) {
      return error.message;
    }
    if (error.response?.status) {
      return `HTTP ${error.response.status} 错误`;
    }
    return '未知错误';
  }

  /**
   * 提取所有验证错误消息（用于需要显示多个错误的场景）
   */
  extractValidationErrors(error: any): string[] {
    const errors: string[] = [];
    
    // 检查是否是 ProblemDetails 格式（.NET 标准错误格式）
    if (error?.response?.data?.errors) {
      const validationErrors = error.response.data.errors;
      // 遍历所有字段的错误
      Object.keys(validationErrors).forEach((field) => {
        const fieldErrors = validationErrors[field];
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach((err: string) => {
            errors.push(err);
          });
        } else if (typeof fieldErrors === 'string') {
          errors.push(fieldErrors);
        }
      });
    }
    
    // 如果没有提取到验证错误，尝试从其他位置获取错误信息
    if (errors.length === 0) {
      // 尝试从 error.response.data.title 获取
      if (error?.response?.data?.title) {
        errors.push(error.response.data.title);
      }
      // 尝试从 error.info.errorMessage 获取（UmiJS errorThrower）
      if (error?.info?.errorMessage) {
        errors.push(error.info.errorMessage);
      }
      // 尝试从 error.response.data.errorMessage 获取
      if (error?.response?.data?.errorMessage) {
        errors.push(error.response.data.errorMessage);
      }
      // 尝试从 error.message 获取
      if (error?.message) {
        errors.push(error.message);
      }
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
      code: errorInfo.code,
      url: errorInfo.url,
      method: errorInfo.method,
      timestamp: errorInfo.timestamp,
      details: errorInfo.details,
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
    const message = getMessage();
    const notification = getNotification();
    
    // 如果是验证错误（400状态码），尝试显示所有验证错误
    if (errorInfo.type === ErrorType.VALIDATION && originalError) {
      const validationErrors = this.extractValidationErrors(originalError);
      if (validationErrors.length > 1) {
        // 多个验证错误，依次显示所有错误
        validationErrors.forEach((msg, index) => {
          setTimeout(() => {
            if (config.displayType === ErrorDisplayType.MESSAGE) {
              message.error(msg, 3);
            } else if (config.displayType === ErrorDisplayType.NOTIFICATION) {
              notification.error({
                message: `验证错误 ${index + 1}`,
                description: msg,
                duration: 3,
              });
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
        message.error(errorInfo.message);
        break;
      case ErrorDisplayType.NOTIFICATION:
        notification.error({
          message: errorInfo.code || '错误',
          description: errorInfo.message,
          duration: 4.5,
        });
        break;
      case ErrorDisplayType.MODAL:
        // 实现模态框显示
        message.error(errorInfo.message);
        break;
      case ErrorDisplayType.REDIRECT:
        // 实现重定向逻辑
        break;
      case ErrorDisplayType.SILENT:
        // 静默处理，不显示
        break;
    }
  }

  /**
   * 显示多个验证错误（用于需要显示所有字段错误的场景）
   */
  displayValidationErrors(error: any, displayType: ErrorDisplayType = ErrorDisplayType.MESSAGE) {
    const message = getMessage();
    const notification = getNotification();
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
        message.error(errors[0]);
      } else if (displayType === ErrorDisplayType.NOTIFICATION) {
        notification.error({
          message: '验证错误',
          description: errors[0],
          duration: 4.5,
        });
      }
    } else {
      // 多个错误，依次显示所有错误（每个错误显示3秒，间隔0.5秒）
      errors.forEach((msg, index) => {
        setTimeout(() => {
          if (displayType === ErrorDisplayType.MESSAGE) {
            message.error(msg, 3);
          } else if (displayType === ErrorDisplayType.NOTIFICATION) {
            notification.error({
              message: `验证错误 ${index + 1}`,
              description: msg,
              duration: 3,
            });
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
