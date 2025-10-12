# API 变更清单

本文档列出所有 API 的变更，方便前端开发者快速适配。

---

## 🔴 删除的 API

以下 API 已被删除，请使用替代方案：

### 用户管理

| 已删除的 API | 替代方案 | 说明 |
|-------------|---------|------|
| `GET /api/user` | `POST /api/user/list` | 使用统一的列表查询接口 |
| `POST /api/user/legacy` | `POST /api/user/management` | 统一使用新的创建接口 |
| `GET /api/user/search/{name}` | `POST /api/user/list` | 在 Search 参数中搜索 |
| `GET /api/user/test-list` | `POST /api/user/list` | 测试接口已删除 |
| `PUT /api/user/{id}/role` | `PUT /api/user/{id}` | 通过 RoleIds 字段更新 |

---

## 🟢 新增的 API

### 角色管理

#### GET /api/role/with-stats

获取带统计信息的角色列表。

**请求**：
```http
GET /api/role/with-stats
Authorization: Bearer {token}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "67...",
        "name": "管理员",
        "description": "系统管理员角色",
        "menuIds": ["67...", "67..."],
        "permissionIds": ["67...", "67..."],
        "isActive": true,
        "createdAt": "2025-10-12T00:00:00Z",
        "updatedAt": "2025-10-12T00:00:00Z",
        "userCount": 5,        // ⭐ 新增：用户数量
        "menuCount": 10,       // ⭐ 新增：菜单数量
        "permissionCount": 28  // ⭐ 新增：权限数量
      }
    ],
    "total": 3
  }
}
```

**用途**：
- 角色列表页显示统计信息
- 删除前评估影响范围

---

## 🟡 修改的 API

### 请求参数变更

#### POST /api/user/list

**变更内容**：

```diff
{
  "page": 1,
  "pageSize": 10,
  "search": "keyword",
- "role": "admin",
+ "roleIds": ["67...", "67..."],  // ⭐ 改为数组，支持多角色搜索
  "isActive": true,
  "sortBy": "CreatedAt",
- "sortOrder": "desc"
+ "sortOrder": "desc",
+ "startDate": "2025-10-01",      // ⭐ 新增：起始日期
+ "endDate": "2025-10-31"         // ⭐ 新增：结束日期
}
```

**迁移指南**：
```typescript
// Before
const request = {
  Role: "admin"  // 单个字符串
};

// After
const request = {
  RoleIds: ["67abc...", "67def..."]  // 角色ID数组
};
```

#### DELETE /api/user/{id}

**新增查询参数**：
```http
DELETE /api/user/{id}?reason=不再需要此账户
```

**变更说明**：
- ✅ 新增 `reason` 查询参数（可选）
- ✅ 新增业务规则：不能删除自己

**错误响应**：
```json
{
  "success": false,
  "errorMessage": "不能删除自己的账户",
  "showType": 2
}
```

#### PUT /api/user/{id}

**变更内容**：
- ✅ 新增业务规则：不能修改自己的角色
- ✅ 请求体不再包含 `role` 字段

```diff
{
  "username": "testuser",
  "email": "test@example.com",
- "role": "admin",
+ "roleIds": ["67...", "67..."],  // ⭐ 使用数组
  "isActive": true
}
```

**错误响应**：
```json
{
  "success": false,
  "errorMessage": "不能修改自己的角色",
  "showType": 2
}
```

#### DELETE /api/role/{id}

**新增查询参数**：
```http
DELETE /api/role/{id}?reason=角色重组
```

**新增功能**：
- ✅ 自动从所有用户的 RoleIds 中移除此角色
- ✅ 新增业务规则：不能删除系统管理员角色
- ✅ 新增业务规则：不能移除最后一个管理员

**错误响应**：
```json
{
  "success": false,
  "errorMessage": "不能删除系统管理员角色",
  "showType": 2
}
```

#### DELETE /api/menu/{id}

**新增查询参数**：
```http
DELETE /api/menu/{id}?reason=菜单结构调整
```

**新增功能**：
- ✅ 自动从所有角色的 MenuIds 中移除此菜单
- ✅ 检查子菜单（有子菜单时阻止删除）

**错误响应**：
```json
{
  "success": false,
  "errorMessage": "不能删除有子菜单的菜单，请先删除子菜单",
  "showType": 2
}
```

#### DELETE /api/permission/{id}

**新增功能**：
- ✅ 自动从所有角色的 PermissionIds 中移除此权限
- ✅ 自动从所有用户的 CustomPermissionIds 中移除此权限

#### POST /api/user/bulk-action

**新增请求字段**：
```diff
{
  "userIds": ["67...", "67..."],
  "action": "delete",
+ "reason": "批量清理测试账户"  // ⭐ 新增：删除原因（action=delete时使用）
}
```

---

## 📊 响应格式变更

### 所有 API 响应统一

所有 API 现在使用统一的响应格式：

**成功响应**：
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应**：
```json
{
  "success": false,
  "errorMessage": "错误消息（中文）",
  "errorCode": "ERROR_CODE",
  "showType": 2,
  "traceId": "00-xxx-xxx-00"
}
```

### RoleController 响应格式变更

**Before**：
```json
{
  "success": true,
  "data": {
    "roles": [...],
    "total": 10
  },
  "errorMessage": null,
  "showType": 1
}
```

**After**：
```json
{
  "success": true,
  "data": {
    "roles": [...],
    "total": 10
  },
  "message": "操作成功"
}
```

**变更说明**：
- 使用 `message` 替代 `errorMessage`（成功时）
- 移除不必要的 null 字段

---

## 🔄 数据模型变更

### AppUser 模型

```diff
{
  "id": "67...",
  "username": "admin",
  "email": "admin@example.com",
- "role": "admin",
+ "roleIds": ["67abc...", "67def..."],  // ⭐ 必需字段，数组类型
  "isActive": true,
  "createdAt": "2025-10-12T00:00:00Z",
  "updatedAt": "2025-10-12T00:00:00Z",
  "lastLoginAt": "2025-10-12T10:00:00Z"
}
```

### CurrentUser 响应（/api/currentUser）

```diff
{
  "id": "67...",
  "name": "admin",
  "email": "admin@example.com",
- "access": "admin",        // 原来基于 Role 字段
+ "access": "user",         // ⭐ 现在默认为 "user"，实际权限由角色系统决定
  "isLogin": true,
  ...
}
```

**重要**：前端的权限控制现在应该基于：
1. 用户的 RoleIds
2. 角色的 PermissionIds
3. 用户的 CustomPermissionIds

而不是依赖 `access` 字段。

### JWT Token Claims 变更

```diff
{
  "userId": "67...",
  "username": "admin",
  "email": "admin@example.com",
- "role": "admin",    // ⭐ 已移除
- "access": "admin",  // ⭐ 已移除
  "exp": 1234567890,
  "iss": "Platform.ApiService",
  "aud": "Platform.Web"
}
```

**重要**：JWT token 不再包含角色信息。权限检查需要查询数据库。

---

## 🛠️ 前端迁移指南

### 1. 更新类型定义

```typescript
// Before
interface AppUser {
  role: string;
  roleIds?: string[];
}

// After
interface AppUser {
  roleIds: string[];  // 必需字段
}
```

### 2. 更新 API 调用

```typescript
// Before: 按 role 字符串搜索
const searchUsers = async () => {
  await request('/api/user/list', {
    method: 'POST',
    data: {
      Role: 'admin'
    }
  });
};

// After: 按 roleIds 数组搜索
const searchUsers = async () => {
  await request('/api/user/list', {
    method: 'POST',
    data: {
      RoleIds: ['67abc...', '67def...']  // 角色ID数组
    }
  });
};
```

### 3. 更新删除操作

```typescript
// Before: 简单删除
const deleteUser = async (id: string) => {
  await request(`/api/user/${id}`, { method: 'DELETE' });
};

// After: 带删除原因
const deleteUser = async (id: string, reason?: string) => {
  await request(`/api/user/${id}`, {
    method: 'DELETE',
    params: { reason }
  });
};
```

### 4. 更新角色显示

```typescript
// Before: 显示单个角色
<Tag>{user.role}</Tag>

// After: 显示多个角色
{user.roleIds?.map(roleId => (
  <Tag key={roleId}>{roleMap[roleId] || roleId}</Tag>
))}
```

### 5. 更新表单

```typescript
// Before: 单选角色
<Select name="role">
  <Option value="admin">管理员</Option>
  <Option value="user">用户</Option>
</Select>

// After: 多选角色
<Select name="roleIds" mode="multiple">
  {roles.map(role => (
    <Option key={role.id} value={role.id}>
      {role.name}
    </Option>
  ))}
</Select>
```

---

## ⚡ 快速参考

### 常用 API 端点

| 功能 | Method | Path | 权限要求 |
|------|--------|------|---------|
| 用户列表 | POST | `/api/user/list` | 无 |
| 创建用户 | POST | `/api/user/management` | user:create |
| 更新用户 | PUT | `/api/user/{id}` | user:update |
| 删除用户 | DELETE | `/api/user/{id}?reason=xxx` | user:delete |
| 批量操作 | POST | `/api/user/bulk-action` | user:update/delete |
| 用户统计 | GET | `/api/user/statistics` | user:read |
| 角色列表 | GET | `/api/role` | 无 |
| 角色统计 | GET | `/api/role/with-stats` | 无 |
| 删除角色 | DELETE | `/api/role/{id}?reason=xxx` | role:delete |
| 删除菜单 | DELETE | `/api/menu/{id}?reason=xxx` | menu:delete |
| 删除权限 | DELETE | `/api/permission/{id}` | permission:delete |

### 请求参数对照

#### 用户搜索参数

| 字段 | 类型 | Before | After | 说明 |
|------|------|--------|-------|------|
| 角色 | - | `role: string` | `roleIds: string[]` | 改为数组，支持多选 |
| 起始日期 | - | - | `startDate: string` | 新增 |
| 结束日期 | - | - | `endDate: string` | 新增 |

#### 删除操作参数

所有删除操作新增 `reason` 查询参数：
```
DELETE /api/{resource}/{id}?reason=删除原因
```

---

## 🔄 迁移检查清单

### 后端

- [x] AppUser 模型移除 Role 字段
- [x] JWT 生成逻辑移除 role claim
- [x] 删除冗余的 API endpoints
- [x] 实现级联删除和清理
- [x] 优化数据库查询性能
- [x] 添加数据库索引
- [x] 统一响应格式
- [x] 错误消息中文化
- [x] 添加业务规则保护

### 前端

- [x] 更新类型定义（移除 role 字段）
- [x] 更新 API 调用（使用 roleIds）
- [x] 更新搜索表单（角色多选 + 日期范围）
- [x] 更新删除操作（添加原因输入）
- [x] 更新角色管理页面（显示统计信息）
- [x] 更新菜单管理页面（删除提示）
- [ ] 测试所有功能

### 数据库

- [x] 执行迁移脚本
- [x] 创建数据库索引
- [ ] 验证数据完整性
- [ ] 清理旧 Role 字段（可选）

---

## 📋 测试清单

### 功能测试

- [ ] 创建用户并分配多个角色
- [ ] 搜索：按单个角色
- [ ] 搜索：按多个角色
- [ ] 搜索：按日期范围
- [ ] 搜索：组合条件（角色 + 日期 + 状态）
- [ ] 更新用户的角色
- [ ] 删除用户（输入原因）
- [ ] 批量启用/禁用用户
- [ ] 批量删除用户（输入原因）
- [ ] 删除角色（验证级联清理）
- [ ] 删除菜单（验证级联清理）
- [ ] 删除权限（验证级联清理）

### 安全测试

- [ ] 尝试删除自己的账户（应被阻止）
- [ ] 尝试修改自己的角色（应被阻止）
- [ ] 尝试删除系统管理员角色（应被阻止）
- [ ] 尝试删除有子菜单的菜单（应被阻止）
- [ ] 尝试无权限的操作（应被阻止）

### 性能测试

- [ ] 活动日志列表加载速度（应明显提升）
- [ ] 用户列表搜索速度（有索引支持）
- [ ] 角色列表加载速度（带统计信息）

---

## 💡 常见问题

### Q: 前端如何获取角色列表？

**A**: 使用现有的 `/api/role` API：

```typescript
const response = await request('/api/role', { method: 'GET' });
const roles = response.data.roles;

// 构建 roleId -> roleName 映射
const roleMap = {};
roles.forEach(role => {
  roleMap[role.id] = role.name;
});
```

### Q: 如何显示用户的角色名称？

**A**: 先获取角色列表构建映射，然后渲染：

```typescript
// 1. 加载角色列表（组件初始化时）
const roles = await getAllRoles();
const roleMap = roles.data.roles.reduce((map, role) => {
  map[role.id] = role.name;
  return map;
}, {});

// 2. 渲染用户角色
{user.roleIds.map(roleId => (
  <Tag key={roleId}>{roleMap[roleId] || '未知角色'}</Tag>
))}
```

### Q: 搜索时如何获取角色ID？

**A**: 从角色列表中获取：

```typescript
// 用户选择角色名称
const selectedRoleNames = ['管理员', '编辑者'];

// 转换为角色ID
const selectedRoleIds = roles
  .filter(role => selectedRoleNames.includes(role.name))
  .map(role => role.id);

// 发送搜索请求
await request('/api/user/list', {
  method: 'POST',
  data: {
    RoleIds: selectedRoleIds
  }
});
```

### Q: 如何处理旧的响应数据？

**A**: 响应格式向后兼容。如果前端代码已经使用 `roleIds`，无需修改：

```typescript
// 这段代码仍然有效
if (user.roleIds && user.roleIds.length > 0) {
  // 处理角色
}
```

---

## 📞 支持

遇到问题？

1. 查看 [优化总结文档](./BUSINESS-LOGIC-OPTIMIZATION-SUMMARY.md)
2. 查看 [用户使用指南](./OPTIMIZATION-USER-GUIDE.md)
3. 查看 Aspire Dashboard 日志
4. 查看浏览器控制台错误

---

**API 变更完成！请按照此清单逐项检查和测试。** ✅

