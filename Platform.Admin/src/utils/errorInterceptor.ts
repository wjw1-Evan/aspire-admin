/**
 * 统一错误拦截器
 * 提供统一的错误处理、日志记录和用户提示
 */

import { message, notification } from 'antd';

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

    // 显示给用户
    if (config.showToUser) {
      this.displayError(errorInfo, config);
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
    if (error.response) {
      errorInfo.code = error.response.data?.errorCode;
      errorInfo.details = error.response.data;
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
  private displayError(errorInfo: ErrorInfo, config: ErrorHandlerConfig) {
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
