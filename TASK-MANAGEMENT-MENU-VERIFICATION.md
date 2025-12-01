# 任务管理菜单调整 - 验证指南

## 快速验证步骤

### 1. 后端验证

#### 检查数据初始化服务
```bash
# 查看菜单配置
grep -n "task-management" Platform.DataInitializer/Services/DataInitializerService.cs
```

**预期输出：**
- 菜单名称：`task-management`
- 菜单标题：`任务管理`
- 菜单路径：`/task-management` (不是 `/system/task-management`)
- 菜单组件：`./TaskManagement` (不是 `./System/TaskManagement`)
- 无 `ParentId` 属性（表示一级菜单）
- `SortOrder`: 3

#### 检查父菜单映射
```bash
# 验证 GetParentMenuNameByChildName 方法
grep -A 10 "GetParentMenuNameByChildName" Platform.DataInitializer/Services/DataInitializerService.cs
```

**预期结果：**
- 不应该包含 `"task-management" => "system"` 的映射

### 2. 前端验证

#### 检查路由配置
```bash
# 查看路由配置
grep -n "task-management" Platform.Admin/config/routes.ts
```

**预期输出：**
- 路由路径：`/task-management` (不是 `/system/task-management`)
- 组件路径：`./task-management`
- `hideInMenu: true`

#### 检查页面文件
```bash
# 验证页面文件位置
ls -la Platform.Admin/src/pages/task-management/
```

**预期结果：**
```
total 56
-rw-r--r--  index.tsx
-rw-r--r--  types.ts
drwxr-xr-x  components/
```

### 3. 文档验证

#### 检查文档更新
```bash
# 验证所有文档都已更新
grep -r "system/task-management" docs/ *.md
```

**预期结果：**
- 没有找到 `/system/task-management` 的引用
- 所有引用都应该是 `/task-management`

## 运行时验证

### 1. 启动应用

```bash
# 启动 DataInitializer（会更新菜单配置）
cd Platform.DataInitializer
dotnet run

# 启动 API Service
cd Platform.ApiService
dotnet run

# 启动前端应用
cd Platform.Admin
npm start
```

### 2. 检查菜单数据库

```bash
# 连接到 MongoDB
mongosh

# 查询菜单集合
use aspire_admin
db.menus.find({ name: "task-management" })
```

**预期结果：**
```json
{
  "_id": ObjectId("..."),
  "name": "task-management",
  "title": "任务管理",
  "path": "/task-management",
  "component": "./TaskManagement",
  "icon": "schedule",
  "sortOrder": 3,
  "isEnabled": true,
  "isDeleted": false,
  "permissions": ["task:read"],
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
  // 注意：没有 parentId 字段
}
```

### 3. 前端菜单验证

#### 登录系统
1. 打开浏览器访问 `http://localhost:15001`
2. 使用有效凭证登录

#### 检查菜单树
1. 查看左侧菜单栏
2. **预期菜单结构：**
   ```
   ├── 欢迎
   ├── 任务管理  ← 应该显示为一级菜单
   ├── 系统管理
   │   ├── 用户管理
   │   ├── 角色管理
   │   ├── 企业管理
   │   └── 我的活动
   ```

#### 测试菜单导航
1. 点击"任务管理"菜单项
2. 应该导航到 `/task-management` 页面
3. 页面应该正常加载任务管理界面

### 4. API 验证

#### 获取用户菜单
```bash
curl -X GET http://localhost:5000/api/menu/user \
  -H "Authorization: Bearer {token}"
```

**预期响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "welcome",
      "title": "欢迎",
      "path": "/welcome",
      "children": []
    },
    {
      "id": "...",
      "name": "task-management",
      "title": "任务管理",
      "path": "/task-management",
      "children": []
    },
    {
      "id": "...",
      "name": "system",
      "title": "系统管理",
      "path": "/system",
      "children": [...]
    }
  ]
}
```

#### 测试任务管理 API
```bash
# 获取任务列表
curl -X POST http://localhost:5000/api/task/query \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "pageSize": 10}'
```

**预期结果：**
- 返回 200 OK
- 返回任务列表数据

## 常见问题排查

### 问题 1：菜单仍然显示为二级菜单

**原因：** 数据库中仍有旧的菜单配置

**解决方案：**
```bash
# 连接到 MongoDB
mongosh

# 查找并删除旧的菜单记录
use aspire_admin
db.menus.deleteOne({ name: "task-management", path: "/system/task-management" })

# 重启 DataInitializer 以重新创建菜单
```

### 问题 2：访问 `/task-management` 返回 404

**原因：** 路由配置未更新或前端应用未重启

**解决方案：**
1. 确认 `Platform.Admin/config/routes.ts` 中有 `/task-management` 路由
2. 重启前端应用：`npm start`
3. 清除浏览器缓存

### 问题 3：菜单不显示

**原因：** 用户角色没有任务管理菜单权限

**解决方案：**
```bash
# 查询用户的角色
db.userCompanies.findOne({ userId: "..." })

# 查询角色的菜单权限
db.roles.findOne({ _id: ObjectId("...") })

# 确认 menuIds 中包含任务管理菜单的 ID
```

### 问题 4：菜单排序不正确

**原因：** `SortOrder` 值设置不正确

**解决方案：**
```bash
# 查看所有菜单的排序
db.menus.find({}, { name: 1, sortOrder: 1 }).sort({ sortOrder: 1 })

# 如果需要调整，更新菜单的 sortOrder
db.menus.updateOne(
  { name: "task-management" },
  { $set: { sortOrder: 3 } }
)
```

## 验证清单

- [ ] 数据初始化服务中的菜单配置正确
- [ ] 前端路由配置正确
- [ ] 菜单数据库记录正确
- [ ] 菜单在前端正确显示
- [ ] 菜单导航正常工作
- [ ] 任务管理 API 正常工作
- [ ] 菜单排序正确
- [ ] 权限控制正常

## 回滚步骤

如果需要回滚到之前的二级菜单结构：

### 1. 后端回滚
```csharp
// 在 DataInitializerService.cs 中恢复菜单配置
menus.Add(new Menu
{
    Name = "task-management",
    Title = "任务管理",
    Path = "/system/task-management",
    Component = "./System/TaskManagement",
    Icon = "schedule",
    ParentId = "system",
    SortOrder = 5,
    IsEnabled = true,
    IsDeleted = false,
    Permissions = new List<string> { "task:read" },
    CreatedAt = now,
    UpdatedAt = now
});

// 恢复父菜单映射
"task-management" => "system"
```

### 2. 前端回滚
```typescript
// 在 config/routes.ts 中恢复路由配置
{
  path: '/system/task-management',
  component: './task-management',
  hideInMenu: true,
}
```

### 3. 数据库清理
```bash
# 删除新的菜单记录
db.menus.deleteOne({ name: "task-management", path: "/task-management" })

# 重启应用以重新创建旧的菜单结构
```

---

**最后更新**: 2025-12-01
**验证状态**: 待验证 ⏳

