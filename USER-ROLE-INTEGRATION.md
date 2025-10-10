# 用户角色管理系统集成

## 概述

本文档描述了将新的角色管理系统集成到用户管理模块的改动。

## 实施内容

### 1. 后端改动

#### 数据模型更新

**`Platform.ApiService/Models/AuthModels.cs`**
- 为 `AppUser` 添加 `RoleIds` 字段，支持多角色：
  ```csharp
  [BsonElement("roleIds")]
  public List<string> RoleIds { get; set; } = new();
  ```

**`Platform.ApiService/Models/User.cs`**
- `CreateUserManagementRequest` 添加 `RoleIds` 字段
- `UpdateUserManagementRequest` 添加 `RoleIds` 字段

#### 服务层更新

**`Platform.ApiService/Services/UserService.cs`**
- `CreateUserManagementAsync` 方法支持 `RoleIds`
- `UpdateUserManagementAsync` 方法支持 `RoleIds`

```csharp
// 创建用户时保存角色
RoleIds = request.RoleIds ?? new List<string>(),

// 更新用户时更新角色
if (request.RoleIds != null)
    update = update.Set(user => user.RoleIds, request.RoleIds);
```

### 2. 前端改动

#### 类型定义更新

**`Platform.Admin/src/pages/user-management/types.ts`**
- `AppUser` 添加 `roleIds?: string[]` 字段
- `CreateUserRequest` 添加 `roleIds?: string[]` 字段
- `UpdateUserRequest` 添加 `roleIds?: string[]` 字段

#### 用户表单更新

**`Platform.Admin/src/pages/user-management/components/UserForm.tsx`**

主要改动：
1. **导入角色 API**：
   ```typescript
   import { getAllRoles } from '@/services/role/api';
   import type { Role } from '@/services/role/types';
   ```

2. **加载角色列表**：
   ```typescript
   useEffect(() => {
     const fetchRoles = async () => {
       const response = await getAllRoles();
       if (response.success && response.data) {
         setRoles(response.data.roles.filter(r => r.isActive));
       }
     };
     fetchRoles();
   }, []);
   ```

3. **新增角色选择器**：
   - 保留旧的单选角色字段（兼容性）
   - 添加新的多选角色字段：
     ```typescript
     <Form.Item
       name="roleIds"
       label="角色（新）"
       tooltip="从角色管理系统中选择角色，支持多选"
     >
       <Select
         mode="multiple"
         placeholder="请选择角色"
         loading={loadingRoles}
         allowClear
         showSearch
         options={roles.map(role => ({
           label: role.name,
           value: role.id!,
         }))}
       />
     </Form.Item>
     ```

4. **提交时包含角色数据**：
   ```typescript
   const createData: CreateUserRequest = {
     // ... 其他字段
     roleIds: values.roleIds || [],
   };
   ```

#### 用户列表更新

**`Platform.Admin/src/pages/user-management/index.tsx`**

主要改动：
1. **加载角色映射表**：
   ```typescript
   const [roleMap, setRoleMap] = useState<Record<string, string>>({});

   useEffect(() => {
     const fetchRoles = async () => {
       const response = await getAllRoles();
       if (response.success && response.data) {
         const map: Record<string, string> = {};
         response.data.roles.forEach(role => {
           if (role.id) {
             map[role.id] = role.name;
           }
         });
         setRoleMap(map);
       }
     };
     fetchRoles();
   }, []);
   ```

2. **添加新的角色列**：
   ```typescript
   {
     title: '角色（新）',
     dataIndex: 'roleIds',
     key: 'roleIds',
     width: 200,
     render: (_, record) => {
       if (!record.roleIds || record.roleIds.length === 0) {
         return <Tag color="default">未分配</Tag>;
       }
       return (
         <Space wrap>
           {record.roleIds.map(roleId => (
             <Tag key={roleId} color="blue">
               {roleMap[roleId] || roleId}
             </Tag>
           ))}
         </Space>
       );
     },
   }
   ```

## 功能特性

### ✅ 已实现

1. **多角色支持**
   - 用户可以被分配多个角色
   - 在用户表单中使用多选下拉框

2. **动态角色加载**
   - 从角色管理系统实时获取角色列表
   - 仅显示启用的角色

3. **角色名称显示**
   - 在用户列表中显示角色名称（而不是 ID）
   - 使用 Tag 组件美观展示多个角色

4. **向后兼容**
   - 保留旧的 `role` 字段
   - 同时支持新旧两种角色系统

5. **前后端同步**
   - 前端和后端都支持 `roleIds` 字段
   - 数据创建和更新都包含角色信息

## 使用说明

### 创建用户

1. 进入"系统管理" > "用户管理"
2. 点击"新增用户"
3. 填写用户信息
4. 在"角色（旧）"中选择兼容角色（必填）
5. 在"角色（新）"中选择一个或多个角色
6. 点击"创建"

### 编辑用户角色

1. 在用户列表中点击"编辑"按钮
2. 在"角色（新）"字段中修改角色
3. 可以添加或删除角色
4. 点击"更新"保存

### 查看用户角色

在用户列表中：
- "角色（旧）"列显示传统的单一角色
- "角色（新）"列显示所有新分配的角色（以标签形式）

## 数据结构

### 数据库中的用户文档

```json
{
  "_id": "user123",
  "username": "testuser",
  "email": "test@example.com",
  "role": "user",           // 旧系统兼容字段
  "roleIds": [              // 新角色系统
    "role_id_1",
    "role_id_2"
  ],
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

## 菜单权限

当用户登录时：
1. 系统读取用户的 `roleIds`
2. 查询每个角色的 `menuIds`
3. 合并所有可访问的菜单 ID
4. 自动包含父级菜单
5. 返回完整的菜单树

详见 `MenuService.GetUserMenusAsync()` 方法。

## 未来优化

1. **移除旧角色系统**
   - 完全迁移到新角色系统后
   - 可以考虑移除 `role` 字段

2. **批量角色分配**
   - 支持为多个用户同时分配角色

3. **角色继承**
   - 支持角色之间的继承关系

4. **角色模板**
   - 预设常用的角色组合

## 相关文档

- [菜单和角色管理系统](./MENU-ROLE-SYSTEM.md)
- [认证系统架构](./Platform.App/AUTH-ARCHITECTURE.md)

## 测试检查清单

- [ ] 创建用户时可以选择多个角色
- [ ] 编辑用户时可以修改角色
- [ ] 用户列表正确显示角色名称
- [ ] 用户登录后能看到对应角色的菜单
- [ ] 后端正确保存和更新 roleIds
- [ ] 向后兼容旧的 role 字段

## 总结

✅ 用户管理系统已成功集成新的角色管理系统
✅ 支持为用户分配多个角色
✅ 保持向后兼容性
✅ 前后端数据同步
✅ 用户界面友好且直观

现在管理员可以使用新的角色管理系统为用户灵活分配权限了！🎉

