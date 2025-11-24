# 前端API调用迁移指南

## 🚨 紧急修改（必须立即更新，否则登录功能会失效）

### 1. 认证相关API

```typescript
// ❌ 旧代码
const login = async (credentials) => {
  return await fetch('/api/login/account', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

// ✅ 新代码
const login = async (credentials) => {
  return await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};
```

```typescript
// ❌ 旧代码
const logout = async () => {
  return await fetch('/api/login/outLogin', { method: 'POST' });
};

// ✅ 新代码
const logout = async () => {
  return await fetch('/api/auth/logout', { method: 'POST' });
};
```

```typescript
// ❌ 旧代码
const getCurrentUser = async () => {
  return await fetch('/api/currentUser');
};

// ✅ 新代码
const getCurrentUser = async () => {
  return await fetch('/api/auth/current-user');
};
```

```typescript
// ❌ 旧代码
const register = async (userData) => {
  return await fetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// ✅ 新代码
const register = async (userData) => {
  return await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};
```

```typescript
// ❌ 旧代码
const getCaptcha = async (phone) => {
  return await fetch(`/api/login/captcha?phone=${phone}`);
};

// ✅ 新代码
const getCaptcha = async (phone) => {
  return await fetch(`/api/auth/captcha?phone=${phone}`);
};
```

## 📝 推荐修改（提升代码一致性和语义）

### 2. 用户个人信息API

所有"当前用户"相关的API从 `/profile` 或 `/my-*` 统一改为 `/me`：

```typescript
// ❌ 旧代码
const getUserProfile = async () => {
  return await fetch('/api/user/profile');
};

const updateUserProfile = async (data) => {
  return await fetch('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const changePassword = async (passwordData) => {
  return await fetch('/api/user/profile/password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  });
};

// ✅ 新代码
const getUserProfile = async () => {
  return await fetch('/api/user/me');
};

const updateUserProfile = async (data) => {
  return await fetch('/api/user/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const changePassword = async (passwordData) => {
  return await fetch('/api/user/me/password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  });
};
```

```typescript
// ❌ 旧代码
const getMyActivityLogs = async (params) => {
  return await fetch(`/api/user/my-activity-logs-paged?${new URLSearchParams(params)}`);
};

const getMyPermissions = async () => {
  return await fetch('/api/user/my-permissions');
};

const getAiRoleDefinition = async () => {
  return await fetch('/api/user/profile/ai-role-definition');
};

// ✅ 新代码
const getMyActivityLogs = async (params) => {
  return await fetch(`/api/user/me/activity-logs-paged?${new URLSearchParams(params)}`);
};

const getMyPermissions = async () => {
  return await fetch('/api/user/me/permissions');
};

const getAiRoleDefinition = async () => {
  return await fetch('/api/user/me/ai-role-definition');
};
```

### 3. 通知API

```typescript
// ❌ 旧代码
const getNotices = async () => {
  return await fetch('/api/notices');
};

const getNotice = async (id) => {
  return await fetch(`/api/notices/${id}`);
};

const updateNotice = async (id, data) => {
  return await fetch(`/api/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const deleteNotice = async (id) => {
  return await fetch(`/api/notices/${id}`, { method: 'DELETE' });
};

// ✅ 新代码
const getNotices = async () => {
  return await fetch('/api/notice');
};

const getNotice = async (id) => {
  return await fetch(`/api/notice/${id}`);
};

const updateNotice = async (id, data) => {
  return await fetch(`/api/notice/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const deleteNotice = async (id) => {
  return await fetch(`/api/notice/${id}`, { method: 'DELETE' });
};
```

## 🔧 使用集中配置简化迁移

### 方案1：创建API配置文件

```typescript
// src/config/api-endpoints.ts

export const API_ENDPOINTS = {
  // 认证相关
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    currentUser: '/api/auth/current-user',
    captcha: '/api/auth/captcha',
    verifyCaptcha: '/api/auth/verify-captcha',
    changePassword: '/api/auth/change-password',
    refreshToken: '/api/auth/refresh-token',
  },
  
  // 用户相关
  user: {
    me: '/api/user/me',
    mePassword: '/api/user/me/password',
    meActivityLogs: '/api/user/me/activity-logs',
    meActivityLogsPaged: '/api/user/me/activity-logs-paged',
    meActivityLogDetail: (id: string) => `/api/user/me/activity-logs/${id}`,
    mePermissions: '/api/user/me/permissions',
    meAiRoleDefinition: '/api/user/me/ai-role-definition',
    byId: (id: string) => `/api/user/${id}`,
    list: '/api/user/list',
    management: '/api/user/management',
  },
  
  // 通知相关
  notice: {
    list: '/api/notice',
    byId: (id: string) => `/api/notice/${id}`,
  },
  
  // 菜单相关
  menu: {
    user: '/api/menu/user',
    all: '/api/menu',
    tree: '/api/menu/tree',
  },
  
  // 角色相关
  role: {
    list: '/api/role',
    withStats: '/api/role/with-stats',
    byId: (id: string) => `/api/role/${id}`,
    menus: (id: string) => `/api/role/${id}/menus`,
  },
  
  // 企业相关
  company: {
    current: '/api/company/current',
    register: '/api/company/register',
    create: '/api/company/create',
    myCompanies: '/api/company/my-companies',
    switch: '/api/company/switch',
    search: '/api/company/search',
    statistics: '/api/company/statistics',
    checkCode: '/api/company/check-code',
    members: (companyId: string) => `/api/company/${companyId}/members`,
  },
};
```

### 方案2：使用环境变量或配置映射

```typescript
// src/utils/api-migrator.ts

/**
 * 临时迁移工具：自动将旧API路径转换为新路径
 * 生产环境部署后可以移除
 */
const API_PATH_MIGRATION_MAP: Record<string, string> = {
  // 认证相关
  '/api/login/account': '/api/auth/login',
  '/api/login/outLogin': '/api/auth/logout',
  '/api/currentUser': '/api/auth/current-user',
  '/api/register': '/api/auth/register',
  '/api/login/captcha': '/api/auth/captcha',
  '/api/login/verify-captcha': '/api/auth/verify-captcha',
  '/api/change-password': '/api/auth/change-password',
  '/api/refresh-token': '/api/auth/refresh-token',
  
  // 用户相关
  '/api/user/profile': '/api/user/me',
  '/api/user/my-permissions': '/api/user/me/permissions',
  '/api/user/profile/ai-role-definition': '/api/user/me/ai-role-definition',
  
  // 通知相关
  '/api/notices': '/api/notice',
};

/**
 * 迁移API路径（仅在开发模式下警告）
 */
export function migrateApiPath(oldPath: string): string {
  const newPath = API_PATH_MIGRATION_MAP[oldPath];
  
  if (newPath && process.env.NODE_ENV === 'development') {
    console.warn(
      `[API Migration] 路径已过时: ${oldPath}\n` +
      `请更新为新路径: ${newPath}`
    );
  }
  
  return newPath || oldPath;
}

// 使用示例
const apiCall = async (path: string, options?: RequestInit) => {
  const migratedPath = migrateApiPath(path);
  return await fetch(migratedPath, options);
};
```

### 方案3：使用Axios拦截器自动迁移

```typescript
// src/utils/axios-config.ts

import axios from 'axios';

const API_PATH_MIGRATION_MAP: Record<string, string> = {
  '/api/login/account': '/api/auth/login',
  '/api/login/outLogin': '/api/auth/logout',
  '/api/currentUser': '/api/auth/current-user',
  // ... 其他映射
};

// 请求拦截器
axios.interceptors.request.use((config) => {
  if (config.url) {
    const migratedUrl = API_PATH_MIGRATION_MAP[config.url];
    
    if (migratedUrl) {
      // 开发模式下警告
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[API Migration] ${config.url} → ${migratedUrl}`);
      }
      
      config.url = migratedUrl;
    }
  }
  
  return config;
});
```

## 📋 完整的API端点对照表

| 功能模块 | 旧端点 | 新端点 | 方法 |
|---------|--------|--------|------|
| **认证** | | | |
| 登录 | `/api/login/account` | `/api/auth/login` | POST |
| 登出 | `/api/login/outLogin` | `/api/auth/logout` | POST |
| 当前用户 | `/api/currentUser` | `/api/auth/current-user` | GET |
| 注册 | `/api/register` | `/api/auth/register` | POST |
| 获取验证码 | `/api/login/captcha` | `/api/auth/captcha` | GET |
| 验证验证码 | `/api/login/verify-captcha` | `/api/auth/verify-captcha` | POST |
| **用户** | | | |
| 个人信息 | `/api/user/profile` | `/api/user/me` | GET |
| 更新个人信息 | `/api/user/profile` | `/api/user/me` | PUT |
| 修改密码 | `/api/user/profile/password` | `/api/user/me/password` | PUT |
| 我的权限 | `/api/user/my-permissions` | `/api/user/me/permissions` | GET |
| 我的活动日志 | `/api/user/my-activity-logs-paged` | `/api/user/me/activity-logs-paged` | GET |
| AI角色定义 | `/api/user/profile/ai-role-definition` | `/api/user/me/ai-role-definition` | GET/PUT |
| **通知** | | | |
| 通知列表 | `/api/notices` | `/api/notice` | GET |
| 通知详情 | `/api/notices/{id}` | `/api/notice/{id}` | GET |
| 更新通知 | `/api/notices/{id}` | `/api/notice/{id}` | PUT |
| 删除通知 | `/api/notices/{id}` | `/api/notice/{id}` | DELETE |

## ⚡ 快速替换命令

如果你使用VSCode，可以使用全局查找替换：

```
查找: /api/login/account
替换: /api/auth/login

查找: /api/login/outLogin  
替换: /api/auth/logout

查找: /api/currentUser
替换: /api/auth/current-user

查找: /api/user/profile
替换: /api/user/me

查找: /api/notices
替换: /api/notice
```

## ✅ 测试清单

迁移完成后，请测试以下功能：

- [ ] 用户登录功能
- [ ] 用户登出功能
- [ ] 获取当前用户信息
- [ ] 用户注册功能
- [ ] 修改个人信息
- [ ] 修改密码
- [ ] 查看通知列表
- [ ] 标记通知为已读
- [ ] 查看活动日志

## 🔍 调试技巧

1. **浏览器控制台**：查看Network标签，检查API请求的URL是否正确
2. **后端日志**：检查后端日志，确认请求到达了正确的端点
3. **404错误**：如果遇到404错误，说明路径没有更新，检查上面的对照表
4. **CORS错误**：确保API网关配置了正确的路由

## 📞 需要帮助？

如果遇到问题，请检查：
1. 后端是否已经重新启动
2. API路径是否完全匹配（注意大小写和斜杠）
3. HTTP方法是否正确
4. 请求头是否包含必要的认证信息

祝迁移顺利！🎉
