# 权限系统 API 使用示例

本文档提供 CRUD 权限系统的完整 API 使用示例。

## 📋 目录

1. [权限管理 API](#权限管理-api)
2. [角色权限 API](#角色权限-api)
3. [用户权限 API](#用户权限-api)
4. [权限验证示例](#权限验证示例)

---

## 权限管理 API

### 1. 获取所有权限

**请求**
```http
GET /api/permission
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": "673d2f5e4a8b9c001234567",
      "resourceName": "user",
      "resourceTitle": "用户",
      "action": "create",
      "actionTitle": "创建",
      "code": "user:create",
      "description": "用户创建权限",
      "createdAt": "2025-10-11T08:00:00Z",
      "updatedAt": "2025-10-11T08:00:00Z"
    },
    // ... 更多权限
  ]
}
```

### 2. 按资源分组获取权限

**请求**
```http
GET /api/permission/grouped
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "resourceName": "user",
      "resourceTitle": "用户",
      "permissions": [
        {
          "id": "673d2f5e4a8b9c001234567",
          "code": "user:create",
          "action": "create",
          "actionTitle": "创建"
        },
        {
          "id": "673d2f5e4a8b9c001234568",
          "code": "user:read",
          "action": "read",
          "actionTitle": "查看"
        },
        {
          "id": "673d2f5e4a8b9c001234569",
          "code": "user:update",
          "action": "update",
          "actionTitle": "修改"
        },
        {
          "id": "673d2f5e4a8b9c00123456a",
          "code": "user:delete",
          "action": "delete",
          "actionTitle": "删除"
        }
      ]
    },
    // ... 其他资源
  ]
}
```

### 3. 按资源获取权限

**请求**
```http
GET /api/permission/by-resource/user
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": "673d2f5e4a8b9c001234567",
      "code": "user:create",
      "resourceName": "user",
      "resourceTitle": "用户",
      "action": "create",
      "actionTitle": "创建"
    },
    // ... user 资源的其他权限
  ]
}
```

### 4. 创建自定义权限

**请求**
```http
POST /api/permission
Authorization: Bearer {token}
Content-Type: application/json

{
  "resourceName": "article",
  "resourceTitle": "文章",
  "action": "publish",
  "actionTitle": "发布",
  "description": "发布文章权限"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "673d2f5e4a8b9c00123456b",
    "resourceName": "article",
    "resourceTitle": "文章",
    "action": "publish",
    "actionTitle": "发布",
    "code": "article:publish",
    "description": "发布文章权限",
    "createdAt": "2025-10-11T09:00:00Z"
  },
  "message": "创建成功"
}
```

### 5. 初始化默认权限

**请求**
```http
POST /api/permission/initialize
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "message": "初始化成功"
}
```

**说明**：此接口会创建系统默认的 28 个权限（如果不存在）

---

## 角色权限 API

### 1. 获取角色的权限

**请求**
```http
GET /api/role/{roleId}/permissions
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": "673d2f5e4a8b9c001234567",
      "code": "user:create",
      "resourceName": "user",
      "resourceTitle": "用户",
      "action": "create",
      "actionTitle": "创建"
    },
    {
      "id": "673d2f5e4a8b9c001234568",
      "code": "user:read",
      "resourceName": "user",
      "resourceTitle": "用户",
      "action": "read",
      "actionTitle": "查看"
    }
    // ... 该角色的其他权限
  ]
}
```

### 2. 为角色分配权限

**请求**
```http
POST /api/role/{roleId}/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "permissionIds": [
    "673d2f5e4a8b9c001234567",
    "673d2f5e4a8b9c001234568",
    "673d2f5e4a8b9c001234569"
  ]
}
```

**响应**
```json
{
  "success": true,
  "data": true
}
```

**说明**：此接口会完全替换角色的权限列表

---

## 用户权限 API

### 1. 获取用户的所有权限

**请求**
```http
GET /api/user/{userId}/permissions
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "data": {
    "rolePermissions": [
      {
        "id": "673d2f5e4a8b9c001234567",
        "code": "user:read",
        "resourceName": "user",
        "resourceTitle": "用户",
        "action": "read",
        "actionTitle": "查看"
      }
      // ... 从角色继承的权限
    ],
    "customPermissions": [
      {
        "id": "673d2f5e4a8b9c00123456a",
        "code": "notice:create",
        "resourceName": "notice",
        "resourceTitle": "公告",
        "action": "create",
        "actionTitle": "创建"
      }
      // ... 用户自定义权限
    ],
    "allPermissionCodes": [
      "user:read",
      "role:read",
      "notice:create",
      "notice:read"
      // ... 所有权限代码（合并去重）
    ]
  }
}
```

### 2. 为用户分配自定义权限

**请求**
```http
POST /api/user/{userId}/custom-permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "permissionIds": [
    "673d2f5e4a8b9c00123456a",
    "673d2f5e4a8b9c00123456b"
  ]
}
```

**响应**
```json
{
  "success": true,
  "message": "权限分配成功"
}
```

**说明**：此接口会完全替换用户的自定义权限列表

### 3. 获取当前用户的权限

**请求**
```http
GET /api/user/my-permissions
Authorization: Bearer {token}
```

**响应**
```json
{
  "success": true,
  "data": {
    "rolePermissions": [ /* ... */ ],
    "customPermissions": [ /* ... */ ],
    "allPermissionCodes": [
      "user:create",
      "user:read",
      "user:update",
      "notice:create"
      // ...
    ]
  }
}
```

---

## 权限验证示例

### 场景 1：用户创建流程

#### 步骤 1：前端检查权限
```typescript
import { usePermission } from '@/hooks/usePermission';

function UserManagement() {
  const { can } = usePermission();
  
  const handleCreate = async () => {
    // 前端检查（仅用于 UI 控制）
    if (!can('user', 'create')) {
      message.error('您没有创建用户的权限');
      return;
    }
    
    // 调用 API
    const response = await createUser(userData);
    // ...
  };
  
  return (
    <PermissionControl permission="user:create">
      <Button onClick={handleCreate}>新建用户</Button>
    </PermissionControl>
  );
}
```

#### 步骤 2：后端验证权限
```csharp
[HttpPost("management")]
[Authorize]
[RequirePermission("user", "create")]  // 自动验证权限
public async Task<IActionResult> CreateUserManagement([FromBody] CreateUserManagementRequest request)
{
    // 只有拥有 user:create 权限的用户才能到达这里
    var user = await _userService.CreateUserManagementAsync(request);
    return Success(user);
}
```

#### 步骤 3：权限验证失败
如果用户没有 `user:create` 权限，后端返回：
```json
{
  "success": false,
  "error": "无权执行此操作：user:create",
  "errorCode": "FORBIDDEN"
}
```
HTTP 状态码：**403 Forbidden**

---

### 场景 2：权限合并示例

#### 用户配置
- **角色**：`editor`（编辑者）
  - 角色权限：`user:read`, `notice:read`, `notice:update`
  
- **自定义权限**：
  - `notice:create`
  - `tag:create`

#### 最终权限
调用 `/api/user/my-permissions` 返回：
```json
{
  "rolePermissions": [
    { "code": "user:read", ... },
    { "code": "notice:read", ... },
    { "code": "notice:update", ... }
  ],
  "customPermissions": [
    { "code": "notice:create", ... },
    { "code": "tag:create", ... }
  ],
  "allPermissionCodes": [
    "user:read",
    "notice:read",
    "notice:update",
    "notice:create",  // 来自自定义权限
    "tag:create"      // 来自自定义权限
  ]
}
```

#### 权限验证
- ✅ `user:read` - 通过（来自角色）
- ✅ `notice:create` - 通过（自定义权限）
- ✅ `notice:update` - 通过（来自角色）
- ❌ `user:create` - 失败（无此权限）
- ❌ `notice:delete` - 失败（无此权限）

---

### 场景 3：超级管理员

**特殊处理**：角色为 `super-admin` 的用户自动拥有所有权限

#### 验证逻辑
```csharp
// RequirePermissionAttribute.cs
var userRole = context.HttpContext.User.FindFirst("role")?.Value;
if (userRole == "super-admin")
{
    return; // 超级管理员自动通过所有权限检查
}
```

#### 示例
- 用户：admin
- 角色：super-admin
- 权限：**自动拥有所有权限**，无需配置

---

## 🔧 常用 API 组合

### 创建新角色并配置权限

```bash
# 1. 创建角色
POST /api/role
{
  "name": "content-editor",
  "description": "内容编辑者",
  "menuIds": [],
  "isActive": true
}

# 响应：{ "success": true, "data": { "id": "新角色ID", ... } }

# 2. 获取所有权限（选择需要的权限）
GET /api/permission/grouped

# 3. 为角色分配权限
POST /api/role/{新角色ID}/permissions
{
  "permissionIds": [
    "notice:create 的 ID",
    "notice:read 的 ID",
    "notice:update 的 ID",
    "tag:create 的 ID",
    "tag:read 的 ID"
  ]
}
```

### 为用户添加额外权限

```bash
# 1. 查看用户当前权限
GET /api/user/{userId}/permissions

# 2. 添加自定义权限
POST /api/user/{userId}/custom-permissions
{
  "permissionIds": [
    "已有的自定义权限ID1",
    "已有的自定义权限ID2",
    "新添加的权限ID"
  ]
}
```

**注意**：这个接口会完全替换用户的自定义权限列表，而不是追加。

### 检查用户是否有特定权限

**方式 1：前端检查**
```typescript
// 调用 API
const response = await getMyPermissions();
const permissions = response.data.allPermissionCodes;

// 检查权限
if (permissions.includes('user:create')) {
  // 有权限
}
```

**方式 2：后端验证**
```csharp
// 在控制器中
var userId = GetRequiredUserId();
if (await HasPermissionAsync("user", "create"))
{
    // 有权限
}
```

---

## 📊 权限数据结构

### 权限代码格式

格式：`{resource}:{action}`

**示例**：
- `user:create` - 用户创建权限
- `role:update` - 角色修改权限
- `menu:delete` - 菜单删除权限

### 标准操作类型

- `create` - 创建
- `read` - 查看
- `update` - 修改
- `delete` - 删除

### 自定义操作（可选）

除了标准的 CRUD，还可以创建自定义操作：
- `article:publish` - 发布文章
- `article:archive` - 归档文章
- `user:export` - 导出用户数据
- `user:import` - 导入用户数据

---

## 🎯 实战示例

### 示例 1：创建文章管理权限

#### 1. 后端初始化（自动）

编辑 `InitializePermissions.cs`，添加资源：
```csharp
var resources = new[]
{
    ("user", "用户"),
    ("role", "角色"),
    // ... 其他资源
    ("article", "文章"), // 新增
};
```

重启服务后自动创建：
- `article:create`
- `article:read`
- `article:update`
- `article:delete`

#### 2. 后端控制器

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ArticleController : BaseApiController
{
    private readonly IArticleService _articleService;

    public ArticleController(IArticleService articleService)
    {
        _articleService = articleService;
    }

    [HttpGet]
    [RequirePermission("article", "read")]
    public async Task<IActionResult> GetAll()
    {
        var articles = await _articleService.GetAllAsync();
        return Success(articles);
    }

    [HttpPost]
    [RequirePermission("article", "create")]
    public async Task<IActionResult> Create([FromBody] CreateArticleRequest request)
    {
        var article = await _articleService.CreateAsync(request);
        return Success(article, "创建成功");
    }

    [HttpPut("{id}")]
    [RequirePermission("article", "update")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateArticleRequest request)
    {
        var result = await _articleService.UpdateAsync(id, request);
        if (!result)
            throw new KeyNotFoundException($"文章 {id} 不存在");
        return Success("更新成功");
    }

    [HttpDelete("{id}")]
    [RequirePermission("article", "delete")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _articleService.DeleteAsync(id);
        if (!result)
            throw new KeyNotFoundException($"文章 {id} 不存在");
        return Success("删除成功");
    }

    // 自定义权限示例
    [HttpPost("{id}/publish")]
    [RequirePermission("article", "publish")]
    public async Task<IActionResult> Publish(string id)
    {
        var result = await _articleService.PublishAsync(id);
        return Success("发布成功");
    }
}
```

#### 3. 前端使用

```typescript
// pages/article-management/index.tsx
import PermissionControl from '@/components/PermissionControl';
import { usePermission } from '@/hooks/usePermission';

function ArticleManagement() {
  const { can } = usePermission();

  return (
    <PageContainer>
      {/* 控制按钮显示 */}
      <PermissionControl permission="article:create">
        <Button type="primary">新建文章</Button>
      </PermissionControl>

      <ProTable
        columns={[
          // ...
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <PermissionControl permission="article:update">
                  <Button onClick={() => handleEdit(record)}>编辑</Button>
                </PermissionControl>
                
                <PermissionControl permission="article:publish">
                  <Button onClick={() => handlePublish(record)}>发布</Button>
                </PermissionControl>
                
                <PermissionControl permission="article:delete">
                  <Button danger onClick={() => handleDelete(record)}>删除</Button>
                </PermissionControl>
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
```

---

### 示例 2：批量操作权限控制

#### 场景
批量删除用户需要 `user:delete` 权限

#### 后端实现
```csharp
[HttpPost("bulk-delete")]
[RequirePermission("user", "delete")]
public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteRequest request)
{
    foreach (var userId in request.UserIds)
    {
        await _userService.DeleteUserAsync(userId);
    }
    return Success("批量删除成功");
}
```

#### 前端实现
```typescript
function UserManagement() {
  const { can } = usePermission();
  const [selectedRows, setSelectedRows] = useState([]);

  const handleBulkDelete = async () => {
    if (!can('user', 'delete')) {
      message.error('您没有删除用户的权限');
      return;
    }

    await bulkDeleteUsers(selectedRows.map(r => r.id));
    message.success('批量删除成功');
  };

  return (
    <div>
      <PermissionControl permission="user:delete">
        <Button 
          danger 
          disabled={selectedRows.length === 0}
          onClick={handleBulkDelete}
        >
          批量删除
        </Button>
      </PermissionControl>

      <Table
        rowSelection={{
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        // ...
      />
    </div>
  );
}
```

---

### 示例 3：条件权限

#### 场景
用户只能编辑自己创建的文章，但管理员可以编辑所有文章

#### 后端实现
```csharp
[HttpPut("{id}")]
[RequirePermission("article", "update")]
public async Task<IActionResult> UpdateArticle(string id, [FromBody] UpdateArticleRequest request)
{
    var article = await _articleService.GetByIdAsync(id);
    if (article == null)
        throw new KeyNotFoundException("文章不存在");

    var userId = GetRequiredUserId();
    
    // 非管理员只能编辑自己的文章
    if (!IsAdmin && article.CreatedBy != userId)
    {
        throw new UnauthorizedAccessException("您只能编辑自己创建的文章");
    }

    var result = await _articleService.UpdateAsync(id, request);
    return Success("更新成功");
}
```

---

## 🔍 调试技巧

### 1. 查看用户实际权限

**浏览器 Console**
```javascript
// 获取当前用户权限
fetch('/api/user/my-permissions', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
})
.then(r => r.json())
.then(data => {
  console.log('角色权限:', data.data.rolePermissions);
  console.log('自定义权限:', data.data.customPermissions);
  console.log('所有权限代码:', data.data.allPermissionCodes);
});
```

### 2. 查看角色权限

```javascript
// 查看某个角色的权限
fetch('/api/role/ROLE_ID/permissions', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
})
.then(r => r.json())
.then(data => console.log('角色权限:', data.data));
```

### 3. 测试权限验证

```javascript
// 尝试调用受保护的 API
fetch('/api/user/management', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  },
  body: JSON.stringify({
    username: 'test',
    password: 'test123456',
    email: 'test@example.com'
  })
})
.then(r => {
  console.log('状态码:', r.status); // 应该是 403 如果无权限
  return r.json();
})
.then(data => console.log('响应:', data));
```

---

## 📚 错误代码参考

| 错误代码 | HTTP 状态码 | 说明 |
|---------|-----------|------|
| UNAUTHORIZED | 401 | 未登录或 Token 无效 |
| FORBIDDEN | 403 | 已登录但无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数错误 |
| SERVER_ERROR | 500 | 服务器内部错误 |

---

## 🎉 总结

本文档提供了权限系统的完整 API 使用示例，涵盖：
- ✅ 权限管理 API
- ✅ 角色权限 API
- ✅ 用户权限 API
- ✅ 权限验证流程
- ✅ 实战示例
- ✅ 调试技巧

**需要更多帮助？** 请参考：
- `CRUD-PERMISSION-SYSTEM.md` - 系统详细文档
- `CRUD-PERMISSION-QUICK-START.md` - 快速开始指南
- `CRUD-PERMISSION-TEST-GUIDE.md` - 测试指南

