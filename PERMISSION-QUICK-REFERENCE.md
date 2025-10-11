# 权限系统快速参考卡

> 一页纸掌握所有核心知识 📋

---

## 🎯 核心概念

### 权限代码格式
```
{resource}:{action}
例如：user:create, role:update, menu:delete
```

### 权限来源
```
用户权限 = 角色权限 ∪ 自定义权限
```

### 超级管理员
```
角色名 = "super-admin" → 自动拥有所有权限
```

---

## 📊 默认权限列表（28个）

| 资源 | 创建 | 查看 | 修改 | 删除 |
|------|------|------|------|------|
| user | ✓ | ✓ | ✓ | ✓ |
| role | ✓ | ✓ | ✓ | ✓ |
| menu | ✓ | ✓ | ✓ | ✓ |
| notice | ✓ | ✓ | ✓ | ✓ |
| tag | ✓ | ✓ | ✓ | ✓ |
| permission | ✓ | ✓ | ✓ | ✓ |
| activity-log | ✓ | ✓ | ✓ | ✓ |

---

## 🔧 常用代码片段

### 后端

#### 添加权限验证
```csharp
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateUser() { }
```

#### 代码中检查权限
```csharp
if (await HasPermissionAsync("user", "create")) { }
await RequirePermissionAsync("user", "update");
```

### 前端

#### 控制按钮显示
```typescript
<PermissionControl permission="user:create">
  <Button>新建</Button>
</PermissionControl>
```

#### 使用 Hook
```typescript
const { can } = usePermission();
if (can('user', 'create')) { }
```

#### 路由控制
```typescript
{ path: '/users', access: 'canReadUser' }
```

---

## 🚀 快速操作

### 启动系统
```bash
dotnet run --project Platform.AppHost
# 访问: http://localhost:15001
# 登录: admin / admin123
```

### 初始化权限
```bash
POST /api/permission/initialize
```

### 查看我的权限
```bash
GET /api/user/my-permissions
```

### 配置角色权限
```bash
POST /api/role/{roleId}/permissions
{ "permissionIds": ["id1", "id2"] }
```

### 配置用户权限
```bash
POST /api/user/{userId}/custom-permissions
{ "permissionIds": ["id1", "id2"] }
```

---

## 📍 重要端点

### 权限管理
- `GET /api/permission` - 所有权限
- `GET /api/permission/grouped` - 分组权限
- `POST /api/permission/initialize` - 初始化

### 角色权限
- `GET /api/role/{id}/permissions` - 获取
- `POST /api/role/{id}/permissions` - 分配

### 用户权限
- `GET /api/user/my-permissions` - 我的权限
- `GET /api/user/{id}/permissions` - 用户权限
- `POST /api/user/{id}/custom-permissions` - 分配

---

## 🎨 管理界面

### 权限管理
```
路径: /system/permission-management
功能: 查看和初始化权限
```

### 角色配置
```
角色管理 → 操作权限 → 勾选权限 → 保存
```

### 用户配置
```
用户管理 → 配置权限 → 添加自定义权限 → 保存
```

---

## ⚠️ 注意事项

### 安全
- ✅ 后端必须验证权限
- ✅ 前端仅用于 UI 控制
- ✅ 敏感操作添加额外检查

### 性能
- ✅ 权限数据缓存在前端
- ✅ 避免重复权限检查
- ✅ 使用 useMemo 优化

### 维护
- ✅ 遵循最小权限原则
- ✅ 定期审计权限配置
- ✅ 记录重要权限变更

---

## 🐛 常见问题

### 权限不生效？
```
1. 检查用户是否登录
2. 查看用户权限列表
3. 验证权限代码正确
4. 刷新页面重试
```

### 403 错误？
```
原因: 用户无该操作权限
解决: 为用户或角色分配权限
```

### 初始化失败？
```
检查: MongoDB 连接
检查: 控制台日志
手动: POST /api/permission/initialize
```

---

## 📚 文档速查

| 需求 | 文档 | 页码 |
|------|------|------|
| 快速开始 | CRUD-PERMISSION-QUICK-START.md | - |
| API 调用 | PERMISSION-API-EXAMPLES.md | - |
| 测试方法 | CRUD-PERMISSION-TEST-GUIDE.md | - |
| 配置示例 | PERMISSION-BEST-PRACTICES.md | - |
| 架构设计 | CRUD-PERMISSION-SYSTEM.md | - |

---

## ✅ 快速检查清单

### 系统启动后
- [ ] 权限已初始化（28个）
- [ ] 超级管理员有所有权限
- [ ] 权限管理菜单已添加
- [ ] 可以访问权限管理页面

### 配置角色后
- [ ] 角色权限已保存
- [ ] 用户可以看到新权限
- [ ] 前端按钮正确显示
- [ ] 后端 API 验证生效

### 测试通过后
- [ ] 超级管理员可以访问所有功能
- [ ] 受限用户按钮正确隐藏
- [ ] 无权限调用返回 403
- [ ] 权限合并逻辑正确

---

## 🎯 一句话总结

**CRUD 权限系统**：精确到增删查改操作的完整权限管理解决方案，支持混合权限模式，提供可视化配置界面，前后端双重验证，开箱即用！

---

## 📞 需要帮助？

**查看完整文档**：[PERMISSIONS-INDEX.md](PERMISSIONS-INDEX.md)

**快速开始**：[CRUD-PERMISSION-QUICK-START.md](CRUD-PERMISSION-QUICK-START.md)

**主文档**：[PERMISSION-SYSTEM-README.md](PERMISSION-SYSTEM-README.md)

---

**打印此页作为快速参考！** 📄

