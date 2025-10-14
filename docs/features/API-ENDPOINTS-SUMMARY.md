# API 端点完整列表

## 📋 概览

本文档列出了系统所有的 API 端点，包括 v3.0 新增的多租户 API。

**API 基础地址:** `http://localhost:15000`  
**API 文档:** `http://localhost:15000/scalar/v1`

## 🏢 企业管理 API（v3.0 新增）

### 1. 企业注册

```http
POST /api/company/register
Content-Type: application/json
认证: 匿名访问
```

**请求体：**
```json
{
  "companyName": "示例公司",
  "companyCode": "example-company",
  "companyDescription": "企业描述（可选）",
  "industry": "互联网（可选）",
  "adminUsername": "admin",
  "adminPassword": "Admin@123",
  "adminEmail": "admin@example.com",
  "contactName": "张三（可选）",
  "contactPhone": "13800138000（可选）"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "company": { "id": "...", "name": "示例公司", ... },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresAt": "2025-01-14T12:00:00Z"
  },
  "errorMessage": "企业注册成功，已自动登录"
}
```

### 2. 获取当前企业信息

```http
GET /api/company/current
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "示例公司",
    "code": "example-company",
    "logo": null,
    "description": "企业描述",
    "industry": "互联网",
    "contactName": "张三",
    "contactEmail": "admin@example.com",
    "contactPhone": "13800138000",
    "isActive": true,
    "maxUsers": 100,
    "expiresAt": null,
    "createdAt": "2025-01-13T...",
    "updatedAt": "2025-01-13T..."
  }
}
```

### 3. 更新当前企业信息

```http
PUT /api/company/current
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "name": "新企业名称",
  "description": "新的描述",
  "industry": "新行业",
  "contactName": "新联系人",
  "contactEmail": "new@example.com",
  "contactPhone": "13900139000",
  "logo": "https://example.com/logo.png"
}
```

### 4. 获取企业统计信息

```http
GET /api/company/statistics
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5,
    "activeUsers": 4,
    "totalRoles": 2,
    "totalMenus": 8,
    "totalPermissions": 32,
    "maxUsers": 100,
    "remainingUsers": 95,
    "isExpired": false,
    "expiresAt": null
  }
}
```

### 5. 检查企业代码可用性

```http
GET /api/company/check-code?code=my-company
认证: 匿名访问
```

**响应：**
```json
{
  "success": true,
  "data": {
    "available": true,
    "message": "企业代码可用"
  }
}
```

## 🔐 认证 API

### 1. 登录

```http
POST /api/login/account
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "admin",
  "password": "admin123",
  "autoLogin": true,
  "type": "account"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "type": "account",
    "currentAuthority": "user",
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresAt": "2025-01-13T13:00:00Z"
  }
}
```

### 2. 登出

```http
POST /api/login/outLogin
Authorization: Bearer {token}
```

### 3. 获取当前用户

```http
GET /api/currentUser
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "admin",
    "userid": "...",
    "email": "admin@example.com",
    "access": "admin",
    "isLogin": true,
    "menus": [...]
  }
}
```

### 4. 刷新 Token

```http
POST /api/refresh-token
Content-Type: application/json
```

**请求体：**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### 5. 用户注册

```http
POST /api/register
Content-Type: application/json
```

### 6. 修改密码

```http
POST /api/change-password
Authorization: Bearer {token}
Content-Type: application/json
```

### 7. 获取验证码

```http
GET /api/login/captcha?phone=13800138000
```

### 8. 验证验证码

```http
POST /api/login/verify-captcha
Content-Type: application/json
```

## 👥 用户管理 API

### 1. 获取用户列表（分页）

```http
POST /api/user/list
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "page": 1,
  "pageSize": 10,
  "search": "关键词（可选）",
  "roleIds": ["role-id-1"],
  "isActive": true,
  "sortBy": "CreatedAt",
  "sortOrder": "desc",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z"
}
```

### 2. 根据ID获取用户

```http
GET /api/user/{id}
Authorization: Bearer {token}
```

### 3. 创建用户

```http
POST /api/user/management
Authorization: Bearer {token}
Content-Type: application/json
权限: user:create
```

**请求体：**
```json
{
  "username": "newuser",
  "password": "Password@123",
  "email": "user@example.com",
  "roleIds": ["role-id"],
  "isActive": true
}
```

### 4. 更新用户

```http
PUT /api/user/{id}
Authorization: Bearer {token}
Content-Type: application/json
权限: user:update
```

### 5. 删除用户

```http
DELETE /api/user/{id}?reason=删除原因
Authorization: Bearer {token}
权限: user:delete
```

### 6. 获取用户统计

```http
GET /api/user/statistics
Authorization: Bearer {token}
权限: user:read
```

### 7. 批量操作用户

```http
POST /api/user/bulk-action
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "userIds": ["id1", "id2"],
  "action": "activate|deactivate|delete",
  "reason": "原因（仅delete需要）"
}
```

### 8. 检查用户名存在

```http
GET /api/user/check-username?username=test&excludeUserId=xxx
```

### 9. 检查邮箱存在

```http
GET /api/user/check-email?email=test@test.com&excludeUserId=xxx
```

### 10. 启用/禁用用户

```http
PUT /api/user/{id}/activate
PUT /api/user/{id}/deactivate
Authorization: Bearer {token}
```

### 11. 获取用户权限

```http
GET /api/user/{id}/permissions
Authorization: Bearer {token}
```

### 12. 分配自定义权限

```http
POST /api/user/{id}/custom-permissions
Authorization: Bearer {token}
Content-Type: application/json
```

### 13. 获取当前用户权限

```http
GET /api/user/my-permissions
Authorization: Bearer {token}
```

### 14. 获取用户活动日志

```http
GET /api/user/{id}/activity-logs?limit=50
Authorization: Bearer {token}
```

### 15. 获取所有活动日志

```http
GET /api/users/activity-logs?page=1&pageSize=20&userId=xxx&action=login
Authorization: Bearer {token}
权限: activity-log:read
```

## 👤 个人中心 API

### 1. 获取当前用户信息

```http
GET /api/user/profile
Authorization: Bearer {token}
```

### 2. 更新当前用户信息

```http
PUT /api/user/profile
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "name": "新姓名",
  "email": "new@example.com",
  "age": 25
}
```

### 3. 修改当前用户密码

```http
PUT /api/user/profile/password
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

### 4. 获取当前用户活动日志

```http
GET /api/user/profile/activity-logs?limit=20
Authorization: Bearer {token}
```

## 🎭 角色管理 API

### 1. 获取所有角色

```http
GET /api/role
Authorization: Bearer {token}
权限: role:read
```

### 2. 获取角色（带统计）

```http
GET /api/role/with-stats
Authorization: Bearer {token}
权限: role:read
```

### 3. 根据ID获取角色

```http
GET /api/role/{id}
Authorization: Bearer {token}
权限: role:read
```

### 4. 创建角色

```http
POST /api/role
Authorization: Bearer {token}
Content-Type: application/json
权限: role:create
```

**请求体：**
```json
{
  "name": "新角色",
  "description": "角色描述",
  "menuIds": ["menu-id-1", "menu-id-2"],
  "isActive": true
}
```

### 5. 更新角色

```http
PUT /api/role/{id}
Authorization: Bearer {token}
Content-Type: application/json
权限: role:update
```

### 6. 删除角色

```http
DELETE /api/role/{id}?reason=删除原因
Authorization: Bearer {token}
权限: role:delete
```

### 7. 分配菜单到角色

```http
POST /api/role/{id}/menus
Authorization: Bearer {token}
Content-Type: application/json
权限: role:update
```

**请求体：**
```json
{
  "menuIds": ["menu-id-1", "menu-id-2"]
}
```

### 8. 分配权限到角色

```http
POST /api/role/{id}/permissions
Authorization: Bearer {token}
Content-Type: application/json
权限: role:update
```

## 📋 菜单管理 API

### 1. 获取所有菜单

```http
GET /api/menu
Authorization: Bearer {token}
权限: menu:read
```

### 2. 获取菜单树

```http
GET /api/menu/tree
Authorization: Bearer {token}
权限: menu:read
```

### 3. 获取当前用户菜单

```http
GET /api/menu/current-user
Authorization: Bearer {token}
```

### 4. 根据ID获取菜单

```http
GET /api/menu/{id}
Authorization: Bearer {token}
权限: menu:read
```

### 5. 创建菜单

```http
POST /api/menu
Authorization: Bearer {token}
Content-Type: application/json
权限: menu:create
```

**请求体：**
```json
{
  "name": "my-menu",
  "title": "我的菜单",
  "path": "/my-menu",
  "component": "./my-menu",
  "icon": "MenuOutlined",
  "sortOrder": 1,
  "isEnabled": true,
  "parentId": null,
  "permissions": ["my-menu:read"]
}
```

### 6. 更新菜单

```http
PUT /api/menu/{id}
Authorization: Bearer {token}
Content-Type: application/json
权限: menu:update
```

### 7. 删除菜单

```http
DELETE /api/menu/{id}?reason=删除原因
Authorization: Bearer {token}
权限: menu:delete
```

### 8. 菜单排序

```http
POST /api/menu/reorder
Authorization: Bearer {token}
Content-Type: application/json
权限: menu:update
```

## 🔔 通知 API

### 1. 获取通知列表

```http
GET /api/notices
Authorization: Bearer {token}
```

### 2. 根据ID获取通知

```http
GET /api/notices/{id}
Authorization: Bearer {token}
```

### 3. 创建通知

```http
POST /api/notices
Authorization: Bearer {token}
Content-Type: application/json
权限: notice:create
```

**请求体：**
```json
{
  "title": "通知标题",
  "description": "通知内容",
  "type": "notification",
  "avatar": "https://example.com/avatar.png",
  "status": "urgent",
  "clickClose": true
}
```

### 4. 更新通知

```http
PUT /api/notices/{id}
Authorization: Bearer {token}
Content-Type: application/json
权限: notice:update
```

### 5. 删除通知

```http
DELETE /api/notices/{id}?reason=删除原因
Authorization: Bearer {token}
权限: notice:delete
```

### 6. 标记通知为已读

```http
PUT /api/notices/{id}/read
Authorization: Bearer {token}
```

### 7. 标记通知为未读

```http
PUT /api/notices/{id}/unread
Authorization: Bearer {token}
```

### 8. 全部标记为已读

```http
PUT /api/notices/read-all
Authorization: Bearer {token}
```

## 🔑 权限管理 API

### 1. 获取所有权限

```http
GET /api/permission
Authorization: Bearer {token}
权限: permission:read
```

### 2. 获取权限（按资源分组）

```http
GET /api/permission/grouped
Authorization: Bearer {token}
权限: permission:read
```

### 3. 根据ID获取权限

```http
GET /api/permission/{id}
Authorization: Bearer {token}
权限: permission:read
```

### 4. 创建权限

```http
POST /api/permission
Authorization: Bearer {token}
Content-Type: application/json
权限: permission:create
```

**请求体：**
```json
{
  "resourceName": "product",
  "resourceTitle": "产品",
  "action": "read",
  "actionTitle": "查看",
  "description": "产品查看权限"
}
```

### 5. 更新权限

```http
PUT /api/permission/{id}
Authorization: Bearer {token}
Content-Type: application/json
权限: permission:update
```

### 6. 删除权限

```http
DELETE /api/permission/{id}?reason=删除原因
Authorization: Bearer {token}
权限: permission:delete
```

### 7. 检查权限

```http
POST /api/permission/check
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "resource": "user",
  "action": "create"
}
```

## 📊 标签和规则 API

### 标签 API

```http
GET    /api/tags                    获取标签列表
POST   /api/tags                    创建标签
PUT    /api/tags/{id}               更新标签
DELETE /api/tags/{id}               删除标签
```

### 规则 API

```http
GET    /api/rule                    获取规则列表
POST   /api/rule                    创建规则
PUT    /api/rule/{id}               更新规则
DELETE /api/rule/{id}               删除规则
```

## 📈 测试用 CURL 命令

### 测试企业注册

```bash
curl -X POST http://localhost:15000/api/company/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "测试公司",
    "companyCode": "test-company-'$(date +%s)'",
    "adminUsername": "admin",
    "adminPassword": "Admin@123",
    "adminEmail": "admin@test.com"
  }'
```

### 测试登录

```bash
curl -X POST http://localhost:15000/api/login/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "autoLogin": true
  }'
```

### 测试获取企业信息（需要 token）

```bash
TOKEN="your-token-here"

curl -X GET http://localhost:15000/api/company/current \
  -H "Authorization: Bearer $TOKEN"
```

### 测试获取用户列表

```bash
curl -X POST http://localhost:15000/api/user/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "pageSize": 10
  }'
```

## 🎯 多租户特性验证

### 验证数据隔离

```bash
# 1. 注册企业A
RESPONSE_A=$(curl -s -X POST http://localhost:15000/api/company/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "企业A",
    "companyCode": "company-a",
    "adminUsername": "admin-a",
    "adminPassword": "Admin@123",
    "adminEmail": "admin-a@test.com"
  }')

TOKEN_A=$(echo $RESPONSE_A | jq -r '.data.token')

# 2. 注册企业B
RESPONSE_B=$(curl -s -X POST http://localhost:15000/api/company/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "企业B",
    "companyCode": "company-b",
    "adminUsername": "admin-b",
    "adminPassword": "Admin@123",
    "adminEmail": "admin-b@test.com"
  }')

TOKEN_B=$(echo $RESPONSE_B | jq -r '.data.token')

# 3. 使用企业A的 token 获取用户列表
echo "企业A的用户："
curl -s -X POST http://localhost:15000/api/user/list \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"page":1,"pageSize":100}' | jq '.data.users[].username'

# 4. 使用企业B的 token 获取用户列表
echo "企业B的用户："
curl -s -X POST http://localhost:15000/api/user/list \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"page":1,"pageSize":100}' | jq '.data.users[].username'

# 应该完全不同，证明数据隔离成功 ✅
```

## 📖 使用 Scalar API 文档

访问：http://localhost:15000/scalar/v1

在 Scalar 文档中您可以：
- ✅ 查看所有 API 端点
- ✅ 查看请求/响应模型
- ✅ 直接在浏览器中测试 API
- ✅ 查看示例代码

## 🔍 API 分类汇总

| 类别 | 端点数量 | 说明 |
|------|---------|------|
| 企业管理 | 5 | v3.0 新增 |
| 认证授权 | 8 | 登录、注册、token |
| 用户管理 | 15 | CRUD + 批量操作 |
| 角色管理 | 8 | CRUD + 菜单分配 |
| 菜单管理 | 8 | CRUD + 树形结构 |
| 通知管理 | 8 | CRUD + 已读未读 |
| 权限管理 | 7 | CRUD + 检查 |
| 标签管理 | 4 | CRUD |
| 规则管理 | 4 | CRUD |
| **总计** | **67+** | 完整的 REST API |

## ⚠️ 重要说明

### 多租户隔离

所有业务 API（用户、角色、菜单、权限、通知等）都自动按企业隔离：

```http
GET /api/user/list
Authorization: Bearer {token}

# 自动查询：WHERE companyId = 'token中的companyId' AND isDeleted = false
# 只返回当前企业的数据 ✅
```

### 权限控制

带 `权限:` 标注的接口需要对应的权限：

```http
POST /api/user/management
权限: user:create

# 需要当前用户拥有 "user:create" 权限
```

### 响应格式

所有 API 使用统一的响应格式：

```json
{
  "success": true|false,
  "data": { ... },
  "errorCode": "ERROR_CODE",
  "errorMessage": "错误消息",
  "timestamp": "2025-01-13T...",
  "traceId": "..."
}
```

---

**文档版本**: v3.0  
**最后更新**: 2025-01-13  
**API 总数**: 67+

