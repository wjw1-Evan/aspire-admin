# 路由守卫增强 - Token 有效性验证

## 📋 概述

增强了管理后台的路由守卫机制，确保用户直接访问内容页面时自动验证token有效性，如果token无效则跳转到登录页面。

## 🎯 实现内容

### 1. 响应拦截器 - 用户不存在处理

**文件**: `Platform.Admin/src/app.tsx`

#### 成功响应检查（IsLogin 字段）
```typescript
// 检查 /api/currentUser 的响应
if (response.config.url?.includes('/api/currentUser') && response.data) {
  const userData = response.data.data;
  // 如果用户不存在或被禁用（IsLogin = false）
  if (userData && userData.isLogin === false) {
    console.log('User not found or inactive, clearing tokens and redirecting to login');
    tokenUtils.clearAllTokens();
    history.push('/user/login');
    return response;
  }
}
```

**触发场景**：
- 用户被删除（软删除）
- 用户被禁用（IsActive = false）
- Token中的用户ID在数据库中不存在

#### 错误响应检查（404状态码）
```typescript
// 处理用户不存在的情况（404 + NOT_FOUND 错误码）
if (error.response?.status === 404) {
  const errorData = error.response?.data;
  const isCurrentUserRequest = error.config?.url?.includes('/api/currentUser');
  
  // 如果是获取当前用户请求返回404，说明用户不存在
  if (isCurrentUserRequest && errorData?.errorCode === 'NOT_FOUND') {
    console.log('User not found (404), clearing tokens and redirecting to login');
    tokenUtils.clearAllTokens();
    history.push('/user/login');
    return Promise.reject(error);
  }
}
```

**触发场景**：
- Token有效但用户已被彻底删除
- 数据库中找不到对应用户

#### getInitialState 用户验证
```typescript
// 检查用户是否有效（后端返回 IsLogin = false 表示用户不存在或被禁用）
if (!userInfo || userInfo.isLogin === false) {
  console.log('User not found or inactive, clearing tokens');
  tokenUtils.clearAllTokens();
  return undefined;
}
```

### 2. onPageChange 路由守卫

**文件**: `Platform.Admin/src/app.tsx`

在 ProLayout 的 `onPageChange` 回调中实现四层验证：

#### 1. 白名单检查
```typescript
// 白名单：不需要登录的页面
const whiteList = [loginPath, '/user/register', '/user/register-result'];
if (whiteList.includes(location.pathname)) {
  return;  // 白名单页面直接放行
}
```

#### 2. CurrentUser 检查
```typescript
// 检查是否有 currentUser
if (!initialState?.currentUser) {
  console.log('No current user, redirecting to login');
  history.push(loginPath);
  return;
}
```

#### 3. Token 存在性检查
```typescript
// 检查是否有 token
if (!tokenUtils.hasToken()) {
  console.log('No token found, redirecting to login');
  tokenUtils.clearAllTokens();
  history.push(loginPath);
  return;
}
```

#### 4. Token 有效性检查
```typescript
// 检查 token 是否过期
if (tokenUtils.isTokenExpired()) {
  console.log('Token expired, attempting to refresh or redirecting to login');
  const refreshToken = tokenUtils.getRefreshToken();
  
  if (!refreshToken) {
    // 没有刷新token，直接跳转登录
    console.log('No refresh token, redirecting to login');
    tokenUtils.clearAllTokens();
    history.push(loginPath);
    return;
  }
  
  // 有刷新token，让响应拦截器处理刷新逻辑
  console.log('Token expired but refresh token exists, will refresh on next request');
}
```

## 🔄 完整的认证流程

### 场景1：用户直接访问内容页（刷新页面或输入URL）

```
用户访问 /user-management
    ↓
getInitialState() 执行
    ↓
检查 localStorage 中的 token
    ↓
调用 /api/currentUser 验证 token
    ↓
┌─────────────┬─────────────────┬──────────────────┐
│ Token 有效  │  Token 无效     │ 用户不存在       │
│用户存在     │                 │                  │
├─────────────┼─────────────────┼──────────────────┤
│ IsLogin=true│ 401 错误        │ IsLogin=false    │
│   ↓         │   ↓             │   ↓              │
│ 加载菜单权限│ 尝试刷新 token  │ 清除 token       │
│   ↓         │   ↓             │   ↓              │
│ 显示页面    │ 刷新成功/失败   │ 跳转登录页       │
│             │   ↓             │                  │
│             │ 跳转登录页      │                  │
└─────────────┴─────────────────┴──────────────────┘
```

### 场景2：用户在页面间导航

```
用户点击菜单导航
    ↓
onPageChange() 触发
    ↓
三层检查：
  1. 是否在白名单？
  2. 是否有 currentUser？
  3. 是否有 token？
  4. token 是否过期？
    ↓
┌─────────────┬─────────────────┐
│ 全部通过    │  任一失败       │
├─────────────┼─────────────────┤
│ 正常导航    │ 跳转登录页      │
└─────────────┴─────────────────┘
```

### 场景3：Token在使用中过期

```
用户操作页面
    ↓
发起 API 请求
    ↓
服务端返回 401
    ↓
响应拦截器捕获
    ↓
检查是否有 refreshToken
    ↓
┌─────────────┬─────────────────┐
│ 有刷新token │  无刷新token    │
├─────────────┼─────────────────┤
│ 刷新 token  │ 清除 token      │
│   ↓         │   ↓             │
│ 重试请求    │ 跳转登录页      │
│   ↓         │                 │
│ 成功/失败   │                 │
│   ↓         │                 │
│ 跳转登录页  │                 │
└─────────────┴─────────────────┘
```

## ✅ 改进优势

### 1. 多层防护
- ✅ 白名单机制（避免登录页循环重定向）
- ✅ CurrentUser 检查（确保已登录）
- ✅ Token 存在性检查（确保有凭证）
- ✅ Token 有效性检查（确保凭证未过期）
- ✅ 用户存在性检查（确保用户未被删除或禁用）⭐ **新增**

### 2. 用户体验优化
- ✅ 提前发现过期token，避免API请求失败
- ✅ 自动token刷新，无感知延长会话
- ✅ 清晰的控制台日志，便于调试

### 3. 安全性提升
- ✅ 防止无效token访问受保护资源
- ✅ 及时清除过期凭证
- ✅ 强制重新认证

## 🔧 Token 过期策略

### 过期时间配置

**文件**: `Platform.Admin/src/utils/token.ts`

```typescript
// Token 过期缓冲时间（5分钟）
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

// 检查token是否过期
isTokenExpired: (): boolean => {
  const expiresAt = tokenUtils.getTokenExpiresAt();
  if (!expiresAt) {
    return false; // 如果没有过期时间，假设不过期
  }
  
  // 提前5分钟认为token过期，留出刷新时间
  return Date.now() >= (expiresAt - TOKEN_EXPIRY_BUFFER);
}
```

### Token 刷新时机

1. **主动检查**（新增）：`onPageChange` 中检查token是否过期
2. **被动触发**（已有）：API请求返回401时触发刷新
3. **自动刷新**（已有）：响应拦截器自动处理刷新逻辑

## 🧪 测试场景

### 场景1：直接访问内容页
```bash
# 步骤
1. 清除浏览器所有缓存和localStorage
2. 直接访问 http://localhost:15001/user-management
3. 预期：自动跳转到登录页
```

### 场景2：Token过期后刷新页面
```bash
# 步骤
1. 正常登录系统
2. 手动修改 localStorage 中的 token_expires_at 为过去时间
3. 刷新页面或访问其他页面
4. 预期：
   - 如果有 refreshToken：尝试刷新token
   - 如果无 refreshToken：跳转登录页
```

### 场景3：Token被手动删除
```bash
# 步骤
1. 正常登录系统
2. 打开开发者工具，删除 localStorage 中的 auth_token
3. 点击菜单导航到其他页面
4. 预期：立即跳转到登录页
```

### 场景4：访问白名单页面
```bash
# 步骤
1. 未登录状态
2. 访问 /user/login 或 /user/register
3. 预期：正常显示页面，不跳转
```

### 场景5：用户被删除或禁用 ⭐ **新增**
```bash
# 步骤
1. 用户A正常登录系统
2. 管理员在后台删除或禁用用户A
3. 用户A刷新页面或访问其他页面
4. 预期：
   - 后端返回 IsLogin = false
   - 前端检测到用户无效
   - 清除所有token
   - 跳转到登录页
```

### 场景6：Token中的用户不存在 ⭐ **新增**
```bash
# 步骤
1. 用户有有效的token
2. 但token中的用户ID在数据库中不存在
3. 调用 /api/currentUser
4. 预期：
   - 后端返回 404 (NOT_FOUND)
   - 前端拦截器捕获
   - 清除所有token
   - 跳转到登录页
```

## 📊 验证检查清单

路由守卫应该满足：

- [x] 白名单页面可以无token访问
- [x] 内容页面必须有有效token才能访问
- [x] Token不存在时自动跳转登录
- [x] Token过期时尝试刷新或跳转登录
- [x] 刷新token失败时跳转登录
- [x] 用户不存在时清除token并跳转登录 ⭐ **新增**
- [x] 用户被禁用时清除token并跳转登录 ⭐ **新增**
- [x] 清除无效token，避免混乱
- [x] 提供清晰的控制台日志

## 🎯 与后端配合

### 后端Token验证

**文件**: `Platform.ApiService/Middleware/JwtMiddleware.cs` (如有)

后端应该：
1. ✅ 验证token签名
2. ✅ 检查token是否过期
3. ✅ 返回401状态码（token无效）
4. ✅ 在响应头中返回错误信息

### API响应格式

```typescript
// Token有效
{
  success: true,
  data: { /* 用户信息 */ }
}

// Token无效（401）
{
  success: false,
  errorCode: "UNAUTHORIZED",
  errorMessage: "Token已过期或无效"
}
```

## 📚 相关文件

### 前端文件
- [app.tsx](mdc:Platform.Admin/src/app.tsx) - 路由守卫实现
- [token.ts](mdc:Platform.Admin/src/utils/token.ts) - Token工具函数
- [api.ts](mdc:Platform.Admin/src/services/ant-design-pro/api.ts) - API服务

### 文档
- [认证系统规范](mdc:.cursor/rules/auth-system.mdc)
- [API集成规范](mdc:.cursor/rules/api-integration.mdc)

## 🎯 核心原则

1. **多层验证** - 白名单、currentUser、token存在性、token有效性
2. **用户体验** - 自动刷新token，减少重新登录
3. **安全优先** - 无效token立即清除和跳转
4. **日志完善** - 清晰的控制台输出，便于调试
5. **防止循环** - 白名单避免登录页重定向循环

遵循这些规范，确保用户访问受保护页面时的安全性！

---

**实施时间**: 2025-10-14  
**版本**: v3.1.1  
**状态**: ✅ 已完成

