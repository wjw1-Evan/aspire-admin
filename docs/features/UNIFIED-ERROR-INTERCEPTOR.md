# 统一错误拦截器

## 📋 概述

统一错误拦截器是一个集中式的错误处理系统，提供统一的错误分类、处理、显示和监控功能。

## 🏗️ 架构设计

### 核心组件

1. **错误分类** - 按类型和严重程度分类错误
2. **规则引擎** - 基于条件的灵活错误处理规则
3. **显示策略** - 多种错误显示方式
4. **监控集成** - 与外部监控系统集成
5. **日志记录** - 结构化日志记录

### 错误类型

```typescript
enum ErrorType {
  NETWORK = 'NETWORK',           // 网络错误
  AUTHENTICATION = 'AUTHENTICATION', // 认证错误
  AUTHORIZATION = 'AUTHORIZATION',    // 授权错误
  VALIDATION = 'VALIDATION',         // 验证错误
  BUSINESS = 'BUSINESS',             // 业务错误
  SERVER = 'SERVER',                 // 服务器错误
  UNKNOWN = 'UNKNOWN',               // 未知错误
}
```

### 错误严重程度

```typescript
enum ErrorSeverity {
  LOW = 'LOW',         // 低严重程度
  MEDIUM = 'MEDIUM',   // 中等严重程度
  HIGH = 'HIGH',       // 高严重程度
  CRITICAL = 'CRITICAL', // 严重错误
}
```

### 显示方式

```typescript
enum ErrorDisplayType {
  SILENT = 'SILENT',           // 静默处理
  MESSAGE = 'MESSAGE',         // 消息提示
  NOTIFICATION = 'NOTIFICATION', // 通知
  MODAL = 'MODAL',            // 模态框
  REDIRECT = 'REDIRECT',       // 重定向
}
```

## 🚀 快速开始

### 1. 基础使用

```typescript
import { errorInterceptor } from '@/utils/errorInterceptor';

try {
  // API 调用
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
} catch (error) {
  // 使用统一错误拦截器处理
  errorInterceptor.handleError(error, {
    url: '/api/data',
    method: 'GET',
    requestId: 'req-123',
  });
}
```

### 2. 在 API 客户端中使用

```typescript
// apiClient.ts
import { errorInterceptor } from './errorInterceptor';

const handleError = (error: any, context?: any) => {
  return errorInterceptor.handleError(error, context);
};

// GET 请求
async get<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await request<ApiResponse<T>>(url, {
      method: 'GET',
    });
    return response;
  } catch (error) {
    return handleError(error, { url, method: 'GET' });
  }
}
```

### 3. 在组件中使用

```typescript
// React 组件
import React, { useState } from 'react';
import { errorInterceptor } from '@/utils/errorInterceptor';

export function DataComponent() {
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('获取用户失败');
      const data = await response.json();
      console.log(data);
    } catch (error) {
      errorInterceptor.handleError(error, {
        url: '/api/users',
        method: 'GET',
        requestId: `comp-${Date.now()}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={fetchData}>获取数据</button>;
}
```

## 🔧 高级配置

### 1. 添加自定义错误规则

```typescript
import { addErrorRule } from '@/utils/errorInterceptor';

// 添加特定业务错误规则
addErrorRule({
  condition: (error) => {
    return error.response?.data?.errorCode === 'INSUFFICIENT_BALANCE';
  },
  config: {
    displayType: ErrorDisplayType.NOTIFICATION,
    showToUser: true,
    logToConsole: true,
    sendToMonitoring: true,
    customHandler: (errorInfo) => {
      // 自定义处理逻辑
      console.log('余额不足，跳转到充值页面');
      window.location.href = '/recharge';
    },
  },
});
```

### 2. 配置默认行为

```typescript
import { setErrorConfig } from '@/utils/errorInterceptor';

// 设置默认配置
setErrorConfig({
  displayType: ErrorDisplayType.MESSAGE,
  showToUser: true,
  logToConsole: true,
  sendToMonitoring: true,
});

// 环境特定配置
if (process.env.NODE_ENV === 'development') {
  setErrorConfig({
    logToConsole: true,
    sendToMonitoring: false,
  });
}
```

### 3. 错误恢复策略

```typescript
// 网络错误自动重试
addErrorRule({
  condition: (error) => {
    return error.type === ErrorType.NETWORK;
  },
  config: {
    displayType: ErrorDisplayType.SILENT,
    showToUser: false,
    logToConsole: true,
    customHandler: (errorInfo) => {
      // 实现自动重试逻辑
      setTimeout(() => {
        console.log('重新发起请求');
      }, 2000);
    },
  },
});
```

## 📊 错误监控集成

### 1. Google Analytics 集成

```typescript
addErrorRule({
  condition: (error) => {
    return error.type === ErrorType.NETWORK;
  },
  config: {
    sendToMonitoring: true,
    customHandler: (errorInfo) => {
      if (typeof globalThis !== 'undefined' && (globalThis as any).gtag) {
        (globalThis as any).gtag('event', 'exception', {
          description: errorInfo.message,
          fatal: false,
        });
      }
    },
  },
});
```

### 2. Sentry 集成

```typescript
addErrorRule({
  condition: (error) => {
    return error.response?.status >= 500;
  },
  config: {
    sendToMonitoring: true,
    customHandler: (errorInfo) => {
      if (typeof globalThis !== 'undefined' && (globalThis as any).Sentry) {
        (globalThis as any).Sentry.captureException(errorInfo);
      }
    },
  },
});
```

## 🎯 最佳实践

### 1. 错误分类策略

```typescript
// 按业务领域分类
const BUSINESS_ERRORS = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
};

// 按 HTTP 状态码分类
const HTTP_ERRORS = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  500: 'INTERNAL_SERVER_ERROR',
};
```

### 2. 错误处理层次

```typescript
// 1. 全局错误拦截器（统一处理）
errorInterceptor.handleError(error, context);

// 2. 组件级错误处理（特定业务逻辑）
if (error.code === 'USER_NOT_FOUND') {
  // 显示用户友好的消息
  message.info('用户不存在，请检查输入');
}

// 3. 页面级错误处理（导航和状态管理）
if (error.type === ErrorType.AUTHENTICATION) {
  // 跳转到登录页面
  history.push('/login');
}
```

### 3. 错误日志记录

```typescript
// 结构化日志记录
const errorInfo = {
  type: ErrorType.BUSINESS,
  severity: ErrorSeverity.MEDIUM,
  message: '用户创建失败',
  code: 'USER_CREATE_FAILED',
  timestamp: new Date(),
  context: {
    url: '/api/users',
    method: 'POST',
    userId: 'user-123',
  },
};
```

## 🔍 调试和测试

### 1. 开发环境调试

```typescript
// 启用详细日志
if (process.env.NODE_ENV === 'development') {
  setErrorConfig({
    logToConsole: true,
    showToUser: true,
  });
}
```

### 2. 错误测试

```typescript
// 模拟不同类型的错误
const testErrors = {
  network: new Error('网络连接失败'),
  auth: { response: { status: 401 } },
  business: { name: 'BizError', info: { errorCode: 'USER_NOT_FOUND' } },
};

// 测试错误处理
Object.entries(testErrors).forEach(([type, error]) => {
  errorInterceptor.handleError(error, { url: '/test', method: 'GET' });
});
```

## 📚 API 参考

### 核心方法

#### `errorInterceptor.handleError(error, context?)`

处理错误的主要方法。

**参数：**
- `error: any` - 错误对象
- `context?: any` - 错误上下文信息

**返回：**
- `ErrorInfo` - 解析后的错误信息

#### `addErrorRule(rule: ErrorRule)`

添加自定义错误处理规则。

**参数：**
- `rule: ErrorRule` - 错误处理规则

#### `setErrorConfig(config: Partial<ErrorHandlerConfig>)`

设置默认错误处理配置。

**参数：**
- `config: Partial<ErrorHandlerConfig>` - 配置选项

### 接口定义

```typescript
interface ErrorInfo {
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

interface ErrorHandlerConfig {
  displayType: ErrorDisplayType;
  showToUser: boolean;
  logToConsole: boolean;
  sendToMonitoring?: boolean;
  customHandler?: (error: ErrorInfo) => void;
}

interface ErrorRule {
  condition: (error: any) => boolean;
  config: ErrorHandlerConfig;
}
```

## 🚫 注意事项

### 1. 避免重复处理

```typescript
// ❌ 错误：重复处理同一个错误
try {
  await apiCall();
} catch (error) {
  errorInterceptor.handleError(error); // 第一次处理
  message.error('操作失败');           // 重复处理
}

// ✅ 正确：只使用统一拦截器
try {
  await apiCall();
} catch (error) {
  errorInterceptor.handleError(error); // 统一处理
}
```

### 2. 敏感信息保护

```typescript
// ❌ 错误：记录敏感信息
errorInterceptor.handleError(error, {
  password: 'secret123', // 不要记录密码
});

// ✅ 正确：过滤敏感信息
errorInterceptor.handleError(error, {
  userId: 'user-123',    // 只记录必要信息
});
```

### 3. 性能考虑

```typescript
// ❌ 错误：在循环中频繁处理错误
for (const item of items) {
  try {
    await processItem(item);
  } catch (error) {
    errorInterceptor.handleError(error); // 可能影响性能
  }
}

// ✅ 正确：批量处理或使用 Promise.allSettled
const results = await Promise.allSettled(
  items.map(item => processItem(item))
);
```

## 📈 性能优化

### 1. 错误规则优化

```typescript
// 将最常用的规则放在前面
const rules = [
  // 高频规则
  { condition: (error) => error.response?.status === 401 },
  { condition: (error) => error.response?.status === 404 },
  
  // 低频规则
  { condition: (error) => error.response?.status >= 500 },
];
```

### 2. 监控数据采样

```typescript
// 只监控重要错误
addErrorRule({
  condition: (error) => {
    return error.severity === ErrorSeverity.CRITICAL;
  },
  config: {
    sendToMonitoring: true,
  },
});
```

## 🎯 总结

统一错误拦截器提供了：

- ✅ **集中式错误处理** - 统一管理所有错误
- ✅ **灵活的错误规则** - 基于条件的处理策略
- ✅ **多种显示方式** - 适应不同场景需求
- ✅ **监控系统集成** - 便于错误追踪和分析
- ✅ **结构化日志** - 便于调试和问题定位
- ✅ **类型安全** - 完整的 TypeScript 支持

通过使用统一错误拦截器，可以显著提高应用的错误处理质量和用户体验。
