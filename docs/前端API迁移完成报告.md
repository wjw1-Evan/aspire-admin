# 前端API调用迁移完成报告

## ✅ 已完成的修改

### 1. 认证服务 (`src/services/ant-design-pro/login.ts`)
- [x] `GET /api/login/captcha` -> `GET /api/auth/captcha`
- [x] `POST /api/login/verify-captcha` -> `POST /api/auth/verify-captcha`

### 2. 核心API服务 (`src/services/ant-design-pro/api.ts`)
- [x] `GET /api/currentUser` -> `GET /api/auth/current-user`
- [x] `POST /api/login/outLogin` -> `POST /api/auth/logout`
- [x] `POST /api/login/account` -> `POST /api/auth/login`
- [x] `POST /api/register` -> `POST /api/auth/register`
- [x] `POST /api/refresh-token` -> `POST /api/auth/refresh-token`
- [x] `POST /api/change-password` -> `POST /api/auth/change-password`
- [x] `GET /api/user/profile` -> `GET /api/user/me`
- [x] `PUT /api/user/profile` -> `PUT /api/user/me`
- [x] `PUT /api/user/profile/password` -> `PUT /api/user/me/password`
- [x] `GET /api/user/profile/activity-logs` -> `GET /api/user/me/activity-logs`
- [x] `GET /api/notices` -> `GET /api/notice`
- [x] `GET /api/captcha/image` -> `GET /api/auth/captcha/image` (修复404错误)
- [x] `POST /api/captcha/verify-image` -> `POST /api/auth/captcha/verify-image`

### 3. 通知服务 (`src/services/notice.ts`)
- [x] `GET /api/notices` -> `GET /api/notice`
- [x] `PUT /api/notices/{id}` -> `PUT /api/notice/{id}`
- [x] `DELETE /api/notices/{id}` -> `DELETE /api/notice/{id}`

### 4. 权限服务 (`src/services/permission.ts`)
- [x] `GET /api/user/my-permissions` -> `GET /api/user/me/permissions`
- [x] 移除了错误的类型导入（修复 Lint 错误）

### 5. 用户日志服务 (`src/services/user-log/api.ts`)
- [x] `GET /api/user/my-activity-logs-paged` -> `GET /api/user/me/activity-logs-paged`
- [x] `GET /api/user/my-activity-logs/{logId}` -> `GET /api/user/me/activity-logs/{logId}`

### 6. 系统监控服务 (`src/services/system/api.ts`)
- [x] `GET /api/systemmonitor/resources` -> `GET /api/system-monitor/resources` (修复404错误)

### 7. 全局配置 (`src/app.tsx` & `src/request-error-config.ts`)
- [x] 更新了对当前用户请求的判断逻辑，支持新的 `/api/auth/current-user` 路径

## 🔍 验证状态

- **Company服务**: 检查确认已使用 `/api/company` 和 `/api/join-request`，无需修改。
- **Role服务**: 检查确认已使用 `/api/role`，无需修改。
- **Menu服务**: 检查确认已使用 `/api/menu`，无需修改。

## 🚀 下一步

前端代码已准备就绪，可以进行构建和部署。建议进行一次全面的功能测试，特别是登录、个人中心和通知功能。
