# 权限系统最佳实践

## 🎯 权限设计原则

### 1. 最小权限原则

**定义**：用户只应该拥有完成其工作所需的最少权限。

**示例**：
```
❌ 错误：给所有用户分配管理员角色
✅ 正确：
  - 客服人员：user:read, notice:read
  - 内容编辑：notice:create, notice:read, notice:update
  - 系统管理员：所有权限
```

### 2. 职责分离原则

**定义**：不同职能的用户应该有不同的权限配置。

**示例角色配置**：

#### 查看者（Viewer）
```json
{
  "name": "viewer",
  "permissions": [
    "user:read",
    "role:read",
    "menu:read",
    "notice:read",
    "tag:read"
  ]
}
```

#### 内容编辑（Content Editor）
```json
{
  "name": "content-editor",
  "permissions": [
    "notice:create",
    "notice:read",
    "notice:update",
    "tag:create",
    "tag:read",
    "tag:update"
  ]
}
```

#### 用户管理员（User Admin）
```json
{
  "name": "user-admin",
  "permissions": [
    "user:create",
    "user:read",
    "user:update",
    "role:read"
  ]
}
```

#### 系统管理员（System Admin）
```json
{
  "name": "admin",
  "permissions": [
    // 除权限管理外的所有权限
    "user:*",
    "role:*",
    "menu:*",
    "notice:*",
    "tag:*"
  ]
}
```

#### 超级管理员（Super Admin）
```json
{
  "name": "super-admin",
  "permissions": [
    // 所有权限（自动分配，无需配置）
    "*:*"
  ]
}
```

### 3. 权限命名规范

**格式**：`{resource}:{action}`

**规则**：
- ✅ 使用小写字母和连字符
- ✅ 资源名使用单数形式
- ✅ 操作名简洁明了
- ❌ 不要使用空格或特殊字符

**示例**：
```
✅ user:create
✅ article:publish
✅ report:export

❌ User:Create
❌ article-publish
❌ report export
```

---

## 🏗️ 常见业务场景

### 场景 1：多租户系统

**需求**：不同组织的用户只能访问自己组织的数据

**实现**：
1. 添加组织维度的权限
2. 在数据查询时过滤组织

```csharp
// 权限定义
"user:read:own-org"  // 查看本组织用户
"user:read:all-org"  // 查看所有组织用户

// 控制器实现
[HttpGet]
[RequirePermission("user", "read")]
public async Task<IActionResult> GetUsers()
{
    var userId = GetRequiredUserId();
    var canReadAll = await HasPermissionAsync("user", "read:all-org");
    
    if (canReadAll)
    {
        // 返回所有用户
        return Success(await _userService.GetAllUsersAsync());
    }
    else
    {
        // 只返回当前组织的用户
        var orgId = GetCurrentUserOrgId();
        return Success(await _userService.GetUsersByOrgAsync(orgId));
    }
}
```

### 场景 2：审批流程

**需求**：文章需要审批才能发布

**实现**：
```csharp
// 权限定义
"article:create"   // 创建文章（草稿）
"article:submit"   // 提交审批
"article:approve"  // 审批通过
"article:reject"   // 审批拒绝
"article:publish"  // 发布文章

// 角色配置
作者（Author）：article:create, article:submit
编辑（Editor）：article:approve, article:reject
发布者（Publisher）：article:publish
```

### 场景 3：数据导出限制

**需求**：只有特定用户可以导出敏感数据

**实现**：
```csharp
// 添加自定义权限
"user:export"        // 导出用户数据
"report:export"      // 导出报表
"financial:export"   // 导出财务数据

// 控制器
[HttpGet("export")]
[RequirePermission("user", "export")]
public async Task<IActionResult> ExportUsers()
{
    var data = await _userService.GetAllUsersAsync();
    var excel = GenerateExcel(data);
    return File(excel, "application/vnd.ms-excel", "users.xlsx");
}
```

### 场景 4：分级管理

**需求**：高级管理员可以管理普通管理员

**实现**：
```csharp
// 权限定义
"admin:create"  // 创建管理员
"admin:update"  // 修改管理员
"admin:delete"  // 删除管理员

// 角色配置
普通管理员（Admin）：user:*, role:read
高级管理员（Senior Admin）：user:*, role:*, admin:*
```

---

## 🎨 前端权限控制模式

### 模式 1：组件级控制（推荐）

**适用**：简单的显示/隐藏控制

```typescript
<PermissionControl permission="user:create">
  <Button type="primary">新建用户</Button>
</PermissionControl>
```

**优点**：
- 声明式，代码清晰
- 易于维护
- 适合简单场景

### 模式 2：Hook 条件判断

**适用**：复杂的逻辑判断

```typescript
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { can, hasAnyPermission } = usePermission();
  
  // 场景 1：简单判断
  if (!can('user', 'create')) {
    return <EmptyState message="您没有权限创建用户" />;
  }
  
  // 场景 2：多权限判断
  const canManage = hasAnyPermission('user:create', 'user:update', 'user:delete');
  
  return canManage ? <ManagementPanel /> : <ReadOnlyView />;
}
```

**优点**：
- 灵活性高
- 支持复杂逻辑
- 可组合多个权限

### 模式 3：Access 路由控制

**适用**：页面级权限控制

```typescript
// config/routes.ts
export default [
  {
    path: '/admin/user-management',
    name: '用户管理',
    component: './user-management',
    access: 'canReadUser', // 需要 user:read 权限
  },
  {
    path: '/admin/permission-management',
    name: '权限管理',
    component: './permission-management',
    access: 'canReadPermission', // 需要 permission:read 权限
  },
];
```

**优点**：
- 路由级保护
- 自动隐藏菜单
- 防止直接访问

### 模式 4：混合使用（最佳实践）

```typescript
function UserManagement() {
  const { can } = usePermission();
  
  return (
    <PageContainer
      // 页面级：路由已验证 user:read
      
      extra={[
        // 按钮级：组件控制
        <PermissionControl permission="user:create">
          <Button type="primary">新建</Button>
        </PermissionControl>
      ]}
    >
      {/* 逻辑级：Hook 判断 */}
      {can('user', 'create') && <QuickCreateForm />}
      
      <ProTable
        columns={[
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                {/* 按钮级：组件控制 */}
                <PermissionControl permission="user:update">
                  <Button>编辑</Button>
                </PermissionControl>
                
                <PermissionControl permission="user:delete">
                  <Button danger>删除</Button>
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

## 🚫 常见错误和避免方法

### 错误 1：只有前端验证

**问题**：
```typescript
// ❌ 只在前端检查权限
function handleDelete(id) {
  if (!can('user', 'delete')) {
    return;
  }
  // 直接调用 API，后端没有验证
  await deleteUser(id);
}
```

**解决**：
```csharp
// ✅ 后端必须验证
[HttpDelete("{id}")]
[RequirePermission("user", "delete")]
public async Task<IActionResult> Delete(string id)
{
    // 后端验证，安全可靠
}
```

**原则**：**永远不要信任前端，后端必须验证！**

---

### 错误 2：权限粒度过细

**问题**：
```
❌ 为每个字段创建权限
user:update:name
user:update:email
user:update:age
user:update:phone
...
```

**解决**：
```
✅ 使用合理的粒度
user:update  // 修改用户基本信息
user:update:sensitive  // 修改敏感信息（如角色、权限）
```

**原则**：权限不是越细越好，要平衡安全性和可维护性。

---

### 错误 3：硬编码权限

**问题**：
```typescript
// ❌ 硬编码权限字符串
if (currentUser.permissions.includes('user:create')) { }
if (currentUser.permissions.includes('user:update')) { }
```

**解决**：
```typescript
// ✅ 使用 Hook 或常量
const { can } = usePermission();
if (can('user', 'create')) { }
if (can('user', 'update')) { }

// 或使用常量
const PERMISSIONS = {
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
};
if (hasPermission(PERMISSIONS.USER_CREATE)) { }
```

---

### 错误 4：忘记处理权限变更

**问题**：
```typescript
// ❌ 用户权限变更后，前端缓存的权限未更新
```

**解决**：
```typescript
// ✅ 权限变更后刷新用户信息
const { initialState, setInitialState } = useModel('@@initialState');

const handlePermissionChange = async () => {
  // 重新获取用户信息
  const userInfo = await initialState?.fetchUserInfo?.();
  setInitialState({ ...initialState, currentUser: userInfo });
};
```

---

## 📊 权限配置示例

### 示例 1：电商系统角色配置

#### 客服（Customer Service）
```
权限：
- user:read（查看用户）
- order:read（查看订单）
- order:update（修改订单状态）

菜单：
- 用户列表
- 订单管理
```

#### 运营（Operations）
```
权限：
- user:read（查看用户）
- user:update（修改用户）
- product:create（创建商品）
- product:read（查看商品）
- product:update（修改商品）
- order:read（查看订单）

菜单：
- 用户管理
- 商品管理
- 订单列表
```

#### 财务（Finance）
```
权限：
- order:read（查看订单）
- financial:read（查看财务数据）
- financial:export（导出财务数据）

菜单：
- 订单列表
- 财务报表
```

---

### 示例 2：内容管理系统

#### 作者（Author）
```
权限：
- article:create（创建文章）
- article:read（查看文章）
- article:update:own（修改自己的文章）
- article:delete:own（删除自己的文章）

实现：
后端验证时检查文章创建者是否为当前用户
```

#### 编辑（Editor）
```
权限：
- article:read（查看所有文章）
- article:update（修改所有文章）
- article:approve（审批文章）
- tag:create（创建标签）
- tag:update（修改标签）
```

#### 发布者（Publisher）
```
权限：
- article:read（查看文章）
- article:publish（发布文章）
- article:unpublish（下线文章）
```

---

## 🔧 权限配置工作流

### 新员工入职流程

**步骤 1：确定职位**
- 职位：内容编辑

**步骤 2：分配角色**
```bash
# 创建用户并分配角色
POST /api/user/management
{
  "username": "editor1",
  "password": "初始密码",
  "email": "editor1@company.com",
  "roleIds": ["content-editor角色ID"]
}
```

**步骤 3：验证权限**
```bash
# 查看用户权限
GET /api/user/{userId}/permissions

# 应该返回 content-editor 角色的所有权限
```

**步骤 4：特殊权限（如需要）**
```bash
# 如果需要额外权限
POST /api/user/{userId}/custom-permissions
{
  "permissionIds": ["额外权限ID"]
}
```

---

### 角色调整流程

**场景**：content-editor 角色需要增加删除标签的权限

**步骤 1：获取角色当前权限**
```bash
GET /api/role/{roleId}/permissions
```

**步骤 2：添加新权限**
```bash
POST /api/role/{roleId}/permissions
{
  "permissionIds": [
    "原有权限ID1",
    "原有权限ID2",
    "tag:delete的ID"  // 新增
  ]
}
```

**步骤 3：通知用户**
- 用户重新登录后权限自动生效
- 或者用户刷新页面

---

## 🎓 权限管理培训

### 管理员培训清单

#### 基础知识
- [ ] 了解权限的概念（resource:action）
- [ ] 理解角色权限和自定义权限的区别
- [ ] 知道如何查看用户的权限

#### 操作技能
- [ ] 能够创建新角色
- [ ] 能够为角色配置菜单权限
- [ ] 能够为角色配置操作权限
- [ ] 能够为用户分配角色
- [ ] 能够为用户添加自定义权限

#### 安全意识
- [ ] 遵循最小权限原则
- [ ] 定期审查权限配置
- [ ] 及时回收离职员工权限
- [ ] 记录重要权限变更

---

## 📋 权限审计

### 定期审计检查表

#### 每月审计
- [ ] 检查是否有权限过大的用户
- [ ] 检查是否有长期未使用的账户
- [ ] 检查是否有异常的权限分配

#### 每季度审计
- [ ] 审查所有角色的权限配置
- [ ] 检查是否有冗余的角色
- [ ] 优化权限结构

#### 重要时刻审计
- [ ] 员工离职时立即回收权限
- [ ] 员工调岗时调整权限
- [ ] 系统升级后验证权限

### 审计 SQL 示例

```javascript
// MongoDB 查询示例

// 1. 查找拥有超级管理员角色的用户
db.users.find({
  roleIds: { $in: ["super-admin角色ID"] },
  isDeleted: false
})

// 2. 查找有自定义权限的用户
db.users.find({
  customPermissionIds: { $exists: true, $ne: [] },
  isDeleted: false
})

// 3. 查找长期未登录的用户（30天）
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

db.users.find({
  lastLoginAt: { $lt: thirtyDaysAgo },
  isActive: true,
  isDeleted: false
})

// 4. 统计各角色的用户数量
db.users.aggregate([
  { $match: { isDeleted: false } },
  { $unwind: "$roleIds" },
  { $group: { _id: "$roleIds", count: { $sum: 1 } } }
])
```

---

## 🔐 安全建议

### 1. 权限管理权限

**重要**：权限管理（permission:*）权限应该严格控制

```
建议配置：
- super-admin：所有权限
- admin：除 permission:* 外的所有权限
- 其他角色：不应有 permission:* 权限
```

### 2. 敏感操作

**建议**：对敏感操作添加额外验证

```csharp
[HttpDelete("{id}")]
[RequirePermission("user", "delete")]
public async Task<IActionResult> DeleteUser(string id)
{
    // 额外检查：不能删除自己
    var currentUserId = GetRequiredUserId();
    if (id == currentUserId)
    {
        throw new InvalidOperationException("不能删除自己的账户");
    }
    
    // 额外检查：不能删除超级管理员
    var user = await _userService.GetUserByIdAsync(id);
    if (user.Role == "super-admin")
    {
        throw new InvalidOperationException("不能删除超级管理员");
    }
    
    await _userService.DeleteUserAsync(id);
    return Success("删除成功");
}
```

### 3. 操作日志

**建议**：记录所有权限相关的操作

```csharp
// 权限变更时记录日志
await _userService.LogUserActivityAsync(
    operatorId,
    "assign_permissions",
    $"为用户 {targetUserId} 分配了权限：{string.Join(", ", permissionCodes)}",
    ipAddress,
    userAgent
);
```

---

## 📈 性能优化

### 1. 权限缓存

**后端缓存**（可选）：
```csharp
public class CachedPermissionCheckService : IPermissionCheckService
{
    private readonly IMemoryCache _cache;
    private readonly IPermissionCheckService _innerService;
    
    public async Task<List<string>> GetUserPermissionCodesAsync(string userId)
    {
        var cacheKey = $"user_permissions_{userId}";
        
        if (!_cache.TryGetValue(cacheKey, out List<string> permissions))
        {
            permissions = await _innerService.GetUserPermissionCodesAsync(userId);
            
            _cache.Set(cacheKey, permissions, TimeSpan.FromMinutes(5));
        }
        
        return permissions;
    }
}
```

### 2. 前端优化

**策略**：
- ✅ 权限数据存储在 initialState，避免重复请求
- ✅ 使用 useMemo 缓存权限检查结果
- ✅ 批量权限检查而非逐个检查

```typescript
import { useMemo } from 'react';
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { hasPermission } = usePermission();
  
  // 使用 useMemo 缓存权限检查结果
  const permissions = useMemo(() => ({
    canCreate: hasPermission('user:create'),
    canUpdate: hasPermission('user:update'),
    canDelete: hasPermission('user:delete'),
  }), [hasPermission]);
  
  return (
    <div>
      {permissions.canCreate && <CreateButton />}
      {permissions.canUpdate && <UpdateButton />}
      {permissions.canDelete && <DeleteButton />}
    </div>
  );
}
```

---

## 🎯 总结

### 核心原则
1. **最小权限** - 只给必需的权限
2. **职责分离** - 不同职能不同权限
3. **双重验证** - 前后端都要验证
4. **定期审计** - 及时发现问题
5. **详细日志** - 记录关键操作

### 实施步骤
1. 分析业务需求，确定需要的资源和操作
2. 设计角色体系
3. 配置角色权限
4. 分配用户角色
5. 特殊情况使用自定义权限
6. 定期审计和优化

### 开发规范
1. 所有修改操作必须添加权限验证
2. 使用统一的权限代码格式
3. 前端使用 PermissionControl 组件
4. 后端使用 RequirePermission 特性
5. 记录权限相关的操作日志

---

**遵循这些最佳实践，您的权限系统将更安全、更易维护！** 🎉

