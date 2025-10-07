# 重新设计的认证系统使用指南

## 概述

我们重新设计了移动应用的认证判断模块，与Admin端保持完全统一，提供了更加健壮、安全、用户友好的认证体验。

## 主要改进

### 1. 与Admin端完全统一
- 使用相同的API接口和数据结构
- 统一的认证流程和错误处理
- 一致的权限检查机制

### 2. 简化的认证状态管理
- 清晰的状态管理架构
- 基于JWT的简单token机制
- 更好的错误处理和用户反馈

### 3. 优化的 Token 验证
- 自动 token 验证
- 智能的网络重试机制
- 简化的token管理

### 4. 统一的权限系统
- 基于Admin端access字段的权限控制
- 简单的角色检查
- 与后端完全一致的权限逻辑

### 5. 改进的用户体验
- 统一的错误处理
- 网络状态指示
- 自动登出保护

## 核心组件

### 1. AuthContext - 认证状态管理

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    loading, 
    error 
  } = useAuth();

  if (loading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}
```

### 2. 权限检查 Hook

```typescript
import { usePermissions } from '@/hooks/use-auth';

function AdminPanel() {
  const { 
    checkPermission, 
    checkRole, 
    checkAllRoles 
  } = usePermissions();

  // 检查权限（基于Admin端的access字段）
  const canEdit = checkPermission({ access: 'admin' });
  
  // 检查角色
  const isAdmin = checkRole('admin');
  
  // 检查多个角色（需要全部满足）
  const isSuperAdmin = checkAllRoles(['admin', 'super_admin']);

  return (
    <div>
      {canEdit && <EditButton />}
      {isAdmin && <AdminTools />}
      {isSuperAdmin && <SuperAdminPanel />}
    </div>
  );
}
```

### 3. 认证守卫组件

```typescript
import { AuthGuard } from '@/components/auth-guard';

function ProtectedPage() {
  return (
    <AuthGuard
      requireAuth={true}
      permission={{ access: 'admin' }}
      roles={['user', 'admin']}
      fallback={<LoginPrompt />}
    >
      <Dashboard />
    </AuthGuard>
  );
}
```

### 4. 路由守卫

```typescript
import { RouteGuard } from '@/components/route-guard';

function App() {
  return (
    <RouteGuard
      protectedRoutes={['/(tabs)', '/profile']}
      publicRoutes={['/auth']}
      redirectTo="/auth"
    >
      <Navigation />
    </RouteGuard>
  );
}
```

## 使用示例

### 1. 登录流程

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginScreen() {
  const { login, loading, error } = useAuth();
  
  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // 登录成功，会自动跳转到主页
    } catch (error) {
      // 错误会在 AuthErrorHandler 中统一处理
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input name="username" />
      <input name="password" type="password" />
      <button type="submit" disabled={loading}>
        {loading ? '登录中...' : '登录'}
      </button>
      {error && <ErrorMessage message={error.message} />}
    </form>
  );
}
```

### 2. 权限控制

```typescript
import { usePermissions } from '@/hooks/use-auth';

function UserManagement() {
  const { 
    checkPermission, 
    checkAnyPermission 
  } = usePermissions();

  const canView = checkPermission({ access: 'admin' });
  const canManage = checkAnyPermission([
    { access: 'admin' },
    { access: 'user' }
  ]);

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div>
      <UserList />
      {canManage && <UserActions />}
    </div>
  );
}
```

### 3. 错误处理

```typescript
import { useAuthError } from '@/hooks/use-auth';

function ErrorDisplay() {
  const { 
    error, 
    getUserFriendlyMessage, 
    isRetryable, 
    clearError 
  } = useAuthError();

  if (!error) return null;

  return (
    <div className="error-banner">
      <p>{getUserFriendlyMessage()}</p>
      {isRetryable() && (
        <button onClick={clearError}>重试</button>
      )}
    </div>
  );
}
```

### 4. 自动登出

```typescript
import { useAutoLogout } from '@/hooks/use-auth';

function App() {
  // 30分钟无活动自动登出
  useAutoLogout(30 * 60 * 1000);
  
  return <MainApp />;
}
```

## 配置选项

### 1. API 服务配置

```typescript
// services/api.ts
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:15000/apiservice' 
  : 'https://your-production-api.com/apiservice';

// Token 存储键名
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
```

### 2. 路由配置

```typescript
// app/_layout.tsx
<RouteGuard
  protectedRoutes={['/(tabs)', '/profile', '/settings']}
  publicRoutes={['/auth', '/forgot-password']}
  redirectTo="/auth"
>
  <AppContent />
</RouteGuard>
```

### 3. 权限配置

```typescript
// 在用户数据中包含权限信息 - 与Admin端保持一致
const user = {
  id: '123',
  name: 'John Doe',
  access: 'admin', // 基于Admin端的access字段
  // 其他用户信息...
};
```

## 安全特性

### 1. Token 管理
- 自动 token 验证
- 安全的 token 存储
- 简化的token管理

### 2. 网络安全
- 请求重试机制
- 网络状态监控
- 超时处理

### 3. 权限控制
- 基于Admin端access字段的权限控制
- 简单的角色检查
- 与后端完全一致的权限逻辑

### 4. 用户体验
- 统一的错误处理
- 加载状态管理
- 自动登出保护

## 最佳实践

### 1. 权限检查
```typescript
// ✅ 推荐：使用 Hook 进行权限检查
const { checkPermission } = usePermissions();
const canEdit = checkPermission({ access: 'admin' });

// ❌ 不推荐：直接访问用户数据
const canEdit = user?.access === 'admin';
```

### 2. 错误处理
```typescript
// ✅ 推荐：使用统一的错误处理
try {
  await login(credentials);
} catch (error) {
  // 错误会被 AuthErrorHandler 统一处理
}

// ❌ 不推荐：手动处理所有错误
try {
  await login(credentials);
} catch (error) {
  if (error.type === 'NETWORK_ERROR') {
    showNetworkError();
  } else if (error.type === 'TOKEN_EXPIRED') {
    redirectToLogin();
  }
  // ... 更多错误处理
}
```

### 3. 路由保护
```typescript
// ✅ 推荐：使用 RouteGuard 保护路由
<RouteGuard protectedRoutes={['/admin']}>
  <AdminPanel />
</RouteGuard>

// ❌ 不推荐：在每个组件中手动检查
function AdminPanel() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  // ...
}
```

## 故障排除

### 1. Token 过期问题
- 检查 refresh token 是否正确配置
- 确认 token 过期时间设置
- 查看网络请求日志

### 2. 权限检查失败
- 确认用户权限数据格式正确
- 检查权限字符串是否匹配
- 验证角色配置

### 3. 路由跳转问题
- 检查路由守卫配置
- 确认受保护路由列表
- 验证重定向路径

## 更新日志

### v2.0.0 - 重新设计版本
- 与Admin端完全统一的认证系统
- 简化的认证状态管理架构
- 基于Admin端access字段的权限系统
- 统一的错误处理
- 增强的安全特性
- 更好的用户体验

---

这个重新设计的认证系统提供了更加健壮、安全、用户友好的认证体验。如果您有任何问题或建议，请随时联系我们。
