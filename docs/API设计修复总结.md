# API 设计修复总结

## ✅ 已完成的修复项

### 1. 路由一致性修复

所有Controller现在都使用明确的路由路径，不再使用 `[controller]` 占位符：

| Controller | 旧路由 | 新路由 |
|-----------|--------|--------|
| AuthController | `api` | `api/auth` |
| UserController | `api/user` | `api/user` ✓ |
| RoleController | `api/[controller]` | `api/role` |
| MenuController | `api/[controller]` | `api/menu` |
| CompanyController | `api/company` | `api/company` ✓ |
| RuleController | `api` | `api/rule` |
| NoticeController | `api` | `api/notice` |
| SystemMonitorController | `api/[controller]` | `api/system-monitor` |
| JoinRequestController | `api/[controller]` | `api/join-request` |
| FriendsController | `api/[controller]` | `api/friends` |
| MaintenanceController | `api/[controller]` | `api/maintenance` |
| SocialController | `api/social` | `api/social` ✓ |
| ChatSessionsController | `api/chat/sessions` | `api/chat/sessions` ✓ |
| ChatMessagesController | `api/chat/messages` | `api/chat/messages` ✓ |
| ChatAiController | `api/chat/ai` | `api/chat/ai` ✓ |

### 2. RESTful 路径规范修复

#### AuthController 端点修复：

| 旧端点 | 新端点 | HTTP方法 | 说明 |
|--------|--------|----------|------|
| `GET /api/currentUser` | `GET /api/auth/current-user` | GET | 获取当前用户 |
| `POST /api/login/account` | `POST /api/auth/login` | POST | 用户登录 |
| `POST /api/login/outLogin` | `POST /api/auth/logout` | POST | 用户登出 |
| `GET /api/login/captcha` | `GET /api/auth/captcha` | GET | 获取验证码 |
| `POST /api/login/verify-captcha` | `POST /api/auth/verify-captcha` | POST | 验证验证码 |
| `POST /api/register` | `POST /api/auth/register` | POST | 用户注册 |
| `POST /api/change-password` | `POST /api/auth/change-password` | POST | 修改密码 |
| `POST /api/refresh-token` | `POST /api/auth/refresh-token` | POST | 刷新令牌 |

#### UserController 端点修复（符合RESTful规范的"当前用户"路径）：

| 旧端点 | 新端点 | HTTP方法 | 说明 |
|--------|--------|----------|------|
| `GET /api/user/profile` | `GET /api/user/me` | GET | 获取当前用户信息 |
| `PUT /api/user/profile` | `PUT /api/user/me` | PUT | 更新当前用户信息 |
| `PUT /api/user/profile/password` | `PUT /api/user/me/password` | PUT | 修改当前用户密码 |
| `GET /api/user/profile/activity-logs` | `GET /api/user/me/activity-logs` | GET | 获取当前用户活动日志 |
| `GET /api/user/my-activity-logs-paged` | `GET /api/user/me/activity-logs-paged` | GET | 获取当前用户活动日志（分页） |
| `GET /api/user/my-activity-logs/{logId}` | `GET /api/user/me/activity-logs/{logId}` | GET | 获取当前用户活动日志详情 |
| `GET /api/user/my-permissions` | `GET /api/user/me/permissions` | GET | 获取当前用户权限 |
| `GET /api/user/profile/ai-role-definition` | `GET /api/user/me/ai-role-definition` | GET | 获取AI角色定义 |
| `PUT /api/user/profile/ai-role-definition` | `PUT /api/user/me/ai-role-definition` | PUT | 更新AI角色定义 |

#### 移除重复路由前缀：

- **RuleController**: 移除端点中的 `rule` 前缀（因为基础路由已是 `api/rule`）
- **NoticeController**: 移除端点中的 `notices` 前缀（因为基础路由已是 `api/notice`）

### 3. API路由设计原则

#### ✅ 采用的最佳实践：

1. **明确的路由路径**：所有路由都使用明确的字符串，便于理解和维护
2. **RESTful资源命名**：使用名词而非动词（如 `user` 而非 `getUser`）
3. **kebab-case命名**：多单词使用连字符分隔（如 `system-monitor`）
4. **当前用户使用 `/me`**：符合RESTful规范的"当前用户"表示方式
5. **避免路径重复**：基础路由已包含资源名称，端点中不再重复
6. **层次清晰**：相关资源按层次组织（如 `chat/sessions`, `chat/messages`）

#### ✅ 一致的响应格式：

所有API现在都统一使用 `ApiResponse<T>` 格式：

```csharp
public class ApiResponse<T>
{
    public bool success { get; set; }
    public T? data { get; set; }
    public string? errorCode { get; set; }
    public string? errorMessage { get; set; }
    public string timestamp { get; set; }
    public string? traceId { get; set; }
}
```

## 📋 前端适配清单

前端需要更新以下API端点调用：

### 认证相关（必须立即修改）
- [x] `POST /api/login/account` → `POST /api/auth/login`
- [x] `POST /api/login/outLogin` → `POST /api/auth/logout`
- [x] `GET /api/currentUser` → `GET /api/auth/current-user`
- [x] `POST /api/register` → `POST /api/auth/register`
- [x] `GET /api/login/captcha` → `GET /api/auth/captcha`

### 用户信息相关（推荐尽快修改）
- [x] `GET /api/user/profile` → `GET /api/user/me`
- [x] `PUT /api/user/profile` → `PUT /api/user/me`
- [x] `PUT /api/user/profile/password` → `PUT /api/user/me/password`
- [x] `GET /api/user/profile/activity-logs` → `GET /api/user/me/activity-logs`
- [x] `GET /api/user/my-*` → `GET /api/user/me/*`

### 通知相关
- [x] `GET /api/notices` → `GET /api/notice`
- [x] `GET /api/notices/{id}` → `GET /api/notice/{id}`
- [x] `PUT /api/notices/{id}` → `PUT /api/notice/{id}`
- [x] `POST /api/notices` → `POST /api/notice`
- [x] `DELETE /api/notices/{id}` → `DELETE /api/notice/{id}`

### 规则相关
- [x] `GET /api/rule` → `GET /api/rule` (保持不变)
- [x] `POST /api/rule` → `POST /api/rule` (保持不变)

## 🎯 设计改进亮点

1. **一致性**：所有Controller都遵循统一的路由命名规范
2. **可维护性**：明确的路由路径便于查找和理解
3. **RESTful**：符合RESTful API设计规范
4. **可扩展性**：为未来添加API版本控制预留空间
5. **语义化**：使用 `/me` 表示当前用户，语义更清晰

## ⚠️ 注意事项

1. **Breaking Changes**：这些修改会破坏现有的前端调用，需要同步更新前端代码
2. **向后兼容**：如需要平滑迁移，可以考虑同时保留旧端点一段时间，并标记为 `[Obsolete]`
3. **文档更新**：更新API文档和OpenAPI规范
4. **测试更新**：更新所有相关的集成测试和E2E测试

## 📌 后续优化建议

1. **添加API版本控制**：考虑在路由中添加版本号（如 `/api/v1/auth/login`）
2. **统一错误响应**：确保所有异常都通过全局异常处理器转换为统一的错误响应
3. **添加速率限制**：对敏感端点（如登录、注册）添加速率限制
4. **改进分页参数**：统一使用 `page` 和 `pageSize` 参数名
5. **添加HATEOAS链接**：在响应中添加相关资源的链接
