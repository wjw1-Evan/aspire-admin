# CRUD 权限系统快速开始指南

## 🚀 快速启动

### 1. 启动后端服务

```bash
# 通过 AppHost 启动所有服务（推荐）
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet run --project Platform.AppHost
```

系统启动时会自动：
- ✅ 初始化 MongoDB 数据库
- ✅ 创建默认管理员用户（username: `admin`, password: `admin123`）
- ✅ 初始化28个默认权限（7个资源 × 4个操作）
- ✅ 为超级管理员分配所有权限

### 2. 访问系统

- **管理后台**: http://localhost:15001
- **API 文档**: http://localhost:15000/scalar/v1
- **Aspire Dashboard**: http://localhost:15003

### 3. 登录系统

使用默认管理员账户登录：
- 用户名：`admin`
- 密码：`admin123`

## 📖 权限系统使用

### 查看和管理权限

1. 登录管理后台
2. 进入「权限管理」页面（需要添加到菜单或直接访问 `/permission-management`）
3. 查看按资源分组的所有权限
4. 点击「初始化默认权限」可以重新初始化权限

### 为角色配置权限

1. 进入「角色管理」页面
2. 找到需要配置的角色
3. 点击「配置权限」按钮（需要在角色管理页面中添加）
4. 在弹出的模态框中勾选权限：
   - 每行代表一个资源
   - 每列代表一个操作（创建、查看、修改、删除）
   - 勾选左侧复选框可全选该资源的所有权限
5. 点击「保存」按钮

### 测试权限系统

#### 测试场景 1：创建受限角色

1. 创建一个新角色「编辑者」
2. 为该角色分配权限：
   - `user:read` - 可以查看用户
   - `notice:create` - 可以创建公告
   - `notice:read` - 可以查看公告
   - `notice:update` - 可以修改公告
3. 创建一个新用户，分配「编辑者」角色
4. 使用新用户登录，验证：
   - ✅ 可以查看用户列表
   - ❌ 不能创建用户（按钮不显示）
   - ✅ 可以创建、查看、修改公告
   - ❌ 不能删除公告（按钮不显示）

#### 测试场景 2：权限继承

1. 创建一个「普通用户」角色，只分配 `user:read` 权限
2. 创建一个用户 A，分配「普通用户」角色
3. 为用户 A 添加自定义权限 `notice:create`
4. 用户 A 最终拥有的权限：
   - `user:read`（来自角色）
   - `notice:create`（自定义权限）

## 🔧 为页面添加权限控制

### 示例：用户管理页面

```typescript
// Platform.Admin/src/pages/user-management/index.tsx
import PermissionControl from '@/components/PermissionControl';

function UserManagement() {
  return (
    <PageContainer>
      {/* 控制新建按钮 */}
      <PermissionControl permission="user:create">
        <Button type="primary" onClick={handleCreate}>
          新建用户
        </Button>
      </PermissionControl>

      {/* 在表格操作列中控制按钮 */}
      <ProTable
        columns={[
          // ... 其他列
          {
            title: '操作',
            valueType: 'option',
            render: (_, record) => [
              <PermissionControl permission="user:update" key="edit">
                <a onClick={() => handleEdit(record)}>编辑</a>
              </PermissionControl>,
              <PermissionControl permission="user:delete" key="delete">
                <a onClick={() => handleDelete(record)}>删除</a>
              </PermissionControl>,
            ],
          },
        ]}
      />
    </PageContainer>
  );
}
```

### 使用 Hook 进行条件判断

```typescript
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { can } = usePermission();
  
  const handleAction = () => {
    if (!can('user', 'create')) {
      message.error('您没有创建用户的权限');
      return;
    }
    // 执行创建逻辑
  };
  
  return (
    <div>
      {can('user', 'read') && <UserList />}
      {can('user', 'create') && <CreateButton />}
    </div>
  );
}
```

## 🎯 常见任务

### 添加新的资源权限

假设要添加「文章管理」模块：

#### 1. 后端添加权限（自动）

编辑 `Platform.ApiService/Scripts/InitializePermissions.cs`:

```csharp
var resources = new[]
{
    ("user", "用户"),
    ("role", "角色"),
    ("menu", "菜单"),
    ("notice", "公告"),
    ("tag", "标签"),
    ("permission", "权限"),
    ("activity-log", "活动日志"),
    ("article", "文章"), // 新增
};
```

重启服务后会自动创建 4 个权限：
- `article:create`
- `article:read`
- `article:update`
- `article:delete`

#### 2. 控制器添加权限验证

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ArticleController : BaseApiController
{
    [HttpGet]
    [RequirePermission("article", "read")]
    public async Task<IActionResult> GetAll() { }
    
    [HttpPost]
    [RequirePermission("article", "create")]
    public async Task<IActionResult> Create([FromBody] CreateArticleRequest request) { }
    
    [HttpPut("{id}")]
    [RequirePermission("article", "update")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateArticleRequest request) { }
    
    [HttpDelete("{id}")]
    [RequirePermission("article", "delete")]
    public async Task<IActionResult> Delete(string id) { }
}
```

#### 3. 前端添加权限定义

编辑 `Platform.Admin/src/access.ts`:

```typescript
return {
  // ... 现有权限
  
  // 文章权限
  canCreateArticle: can('article', 'create'),
  canReadArticle: can('article', 'read'),
  canUpdateArticle: can('article', 'update'),
  canDeleteArticle: can('article', 'delete'),
};
```

#### 4. 页面使用权限控制

```typescript
<PermissionControl permission="article:create">
  <Button type="primary">新建文章</Button>
</PermissionControl>
```

### 手动创建自定义权限

除了系统默认的 CRUD 权限，还可以创建自定义权限：

```bash
# 调用 API 创建权限
POST /api/permission
{
  "resourceName": "article",
  "resourceTitle": "文章",
  "action": "publish",
  "actionTitle": "发布",
  "description": "发布文章权限"
}
```

这样就创建了一个 `article:publish` 权限。

## 🐛 故障排查

### 权限初始化失败

**问题**：启动后没有看到权限数据

**解决**：
1. 检查数据库连接是否正常
2. 查看控制台日志，确认初始化脚本是否执行
3. 手动调用初始化接口：
   ```bash
   POST /api/permission/initialize
   ```

### 权限验证不生效

**问题**：添加了 `[RequirePermission]` 但仍然可以访问

**解决**：
1. 确认用户已登录并有有效的 JWT token
2. 检查 `RequirePermissionAttribute` 是否正确导入
3. 确认超级管理员会自动通过所有权限检查
4. 查看后端日志，确认权限验证逻辑是否执行

### 前端按钮仍然显示

**问题**：用户没有权限但按钮仍然显示

**解决**：
1. 确认已在 `app.tsx` 中获取用户权限
2. 检查 `currentUser.permissions` 是否包含权限代码
3. 确认 `PermissionControl` 组件正确使用
4. 清除浏览器缓存并重新登录

## 📊 权限数据查看

### 查看用户的所有权限

```bash
GET /api/user/my-permissions

# 响应
{
  "success": true,
  "data": {
    "rolePermissions": [ /* 从角色继承的权限 */ ],
    "customPermissions": [ /* 用户自定义权限 */ ],
    "allPermissionCodes": [
      "user:create",
      "user:read",
      "user:update",
      "notice:create",
      // ...
    ]
  }
}
```

### 查看角色的权限

```bash
GET /api/role/{roleId}/permissions

# 响应
{
  "success": true,
  "data": [
    {
      "id": "...",
      "code": "user:create",
      "resourceName": "user",
      "resourceTitle": "用户",
      "action": "create",
      "actionTitle": "创建"
    },
    // ...
  ]
}
```

### 查看所有权限

```bash
GET /api/permission/grouped

# 响应
{
  "success": true,
  "data": [
    {
      "resourceName": "user",
      "resourceTitle": "用户",
      "permissions": [
        { "code": "user:create", ... },
        { "code": "user:read", ... },
        { "code": "user:update", ... },
        { "code": "user:delete", ... }
      ]
    },
    // ...
  ]
}
```

## 🎉 开始使用

现在你已经了解了 CRUD 权限系统的基本使用方法。系统提供了灵活的权限控制能力，可以满足各种业务场景的需求。

**下一步**：
1. 为现有页面添加权限控制按钮
2. 创建不同权限的测试角色
3. 验证权限系统是否按预期工作
4. 根据业务需求添加自定义权限

有任何问题，请参考 `CRUD-PERMISSION-SYSTEM.md` 详细文档。

