// 认证错误处理组件

import React from 'react';

interface AuthErrorHandlerProps {
  readonly children: React.ReactNode;
}

export function AuthErrorHandler({ children }: AuthErrorHandlerProps) {
  // 直接返回子组件，让路由系统处理认证状态
  // 认证状态检查和路由跳转由 _layout.tsx 中的 AuthRouter 处理
  return <>{children}</>;
}

