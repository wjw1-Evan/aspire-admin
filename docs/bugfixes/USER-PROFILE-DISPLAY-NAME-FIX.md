# 个人中心用户信息显示和编辑功能修复

## 📋 问题描述

个人中心页面存在两个主要问题：

### 问题 1: 用户名未显示
- 用户访问个人中心页面
- 用户名显示区域为空白
- API 返回数据正常，包含 `username: "admin"` 字段

### 问题 2: 编辑资料功能异常
- 点击"编辑资料"时，username 字段为空
- username 字段可编辑，但后端不允许修改
- 用户误以为可以修改用户名，造成困惑

### API 返回数据
```json
{
  "success": true,
  "data": {
    "username": "admin",
    "id": "68ee22fee42a2c87bac960e4",
    "email": "...",
    "companyId": "",
    "currentCompanyId": "68ee22fee42a2c87bac960e5",
    "isActive": true,
    ...
  }
}
```

## 🔍 根因分析

### 1. 后端返回的数据结构
后端 `/api/user/profile` 接口返回的是 `AppUser` 模型：
```csharp
public class AppUser : MultiTenantEntity
{
    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;  // 用户名（必填）
    
    [BsonElement("name")]
    public string? Name { get; set; }  // 姓名（可选）
    
    // ...
}
```

返回的 JSON 数据：
- `username`: "admin" - ✅ 存在
- `name`: null 或不存在 - ❌ 为空

### 2. 前端期望的数据结构
个人中心页面期望 `API.CurrentUser` 类型：
```typescript
type CurrentUser = {
  name?: string;     // ❌ 期望 name 字段
  userid?: string;
  email?: string;
  access?: string;
  // ...
}
```

### 3. 数据映射错误
```typescript
// ❌ 错误的映射逻辑
const profile: UserProfile = {
  id: currentUser.userid || '',
  username: currentUser.name || '',  // ❌ name 为空，导致 username 为空字符串
  name: currentUser.name,            // ❌ name 为空
  // ...
};
```

显示逻辑：
```typescript
<Title level={4}>{userProfile.name || userProfile.username}</Title>
// name 是空，username 也是空字符串 → 显示为空白
```

## ✅ 解决方案

### 修复代码
修改 `Platform.Admin/src/pages/account/center/index.tsx` 的数据映射逻辑：

```typescript
// ✅ 修复后的映射逻辑
const fetchUserProfile = async () => {
  const response = await getCurrentUserProfile();
  if (response.success && response.data) {
    // API 返回的是 AppUser 对象，包含 username, name, email 等字段
    const apiUser = response.data as any;
    const profile: UserProfile = {
      id: apiUser.id || apiUser.userid || '',
      username: apiUser.username || '',  // ✅ 正确使用 username 字段
      name: apiUser.name || apiUser.username || '',  // ✅ name 降级到 username
      email: apiUser.email,
      age: apiUser.age || 18,
      role: apiUser.access || 'user',
      isActive: apiUser.isActive || apiUser.isLogin || false,
      createdAt: apiUser.createdAt || '',
      updatedAt: apiUser.updatedAt || apiUser.updateAt || '',
      lastLoginAt: apiUser.lastLoginAt || '',
    };
    setUserProfile(profile);
  }
};
```

### 修复要点

1. **正确读取 username 字段**
   ```typescript
   username: apiUser.username || '',  // ✅ 从正确的字段读取
   ```

2. **name 字段降级处理**
   ```typescript
   name: apiUser.name || apiUser.username || '',  // ✅ 如果没有 name，使用 username
   ```

3. **表单回填处理**
   ```typescript
   form.setFieldsValue({
     name: apiUser.name || apiUser.username,  // ✅ 优先 name，降级 username
     email: apiUser.email,
     age: apiUser.age || 18,
   });
   ```

## 🎯 数据流说明

### 后端 → 前端数据映射

| 后端字段 (AppUser) | 前端字段 (UserProfile) | 映射逻辑 |
|---|---|---|
| `username` | `username` | 直接映射 |
| `name` (可选) | `name` | 优先使用 name，降级到 username |
| `id` | `id` | 直接映射 |
| `email` | `email` | 直接映射 |
| `age` (可选) | `age` | 默认值 18 |
| `access` | `role` | 映射为角色 |
| `isActive` | `isActive` | 直接映射 |

### 显示逻辑
```typescript
// 显示优先级：name > username
<Title level={4}>{userProfile.name || userProfile.name}</Title>
// 结果：
// - 如果有 name，显示 name
// - 如果没有 name，显示 username
// - 不会再出现空白
```

## 🔧 编辑资料功能修复

### 发现的问题

1. **username 字段未初始化**
   - 点击"编辑资料"时，username 字段为空
   - 原因：`setFieldsValue` 没有设置 username 的值

2. **username 应该禁止编辑**
   - 后端明确不允许修改用户名（UserController.cs 第298行）
   - 但前端表单允许编辑 username 字段
   - 导致用户误以为可以修改用户名

3. **提交数据包含无效字段**
   - 表单提交包含 username 字段
   - 但 `UpdateProfileParams` 类型不包含 username
   - 可能导致类型错误

4. **第二次打开编辑表单为空** ⭐ 新发现
   - 第一次编辑：表单正确填充
   - 点击"取消"：`form.resetFields()` 清空表单
   - 第二次编辑：表单仍然是空的（未重新填充）
   - 原因：只在 `fetchUserProfile()` 时设置了一次表单值，取消后没有重新设置

### 修复方案

#### 1. 初始化 username 字段
```typescript
form.setFieldsValue({
  username: apiUser.username,  // ✅ 设置 username（只读，不可修改）
  name: apiUser.name || apiUser.username,
  email: apiUser.email,
  age: apiUser.age || 18,
});
```

#### 2. 禁用 username 编辑
```typescript
<ProFormText
  name="username"
  label={<FormattedMessage id="pages.account.center.username" defaultMessage="用户名" />}
  disabled  // ✅ 禁止编辑
  tooltip="用户名不可修改"  // ✅ 提示用户
  fieldProps={{
    style: { color: 'rgba(0, 0, 0, 0.45)' }  // ✅ 灰色显示
  }}
/>
```

#### 3. 过滤提交数据
```typescript
const handleUpdateProfile = async (values: any) => {
  // ✅ 过滤掉 username 字段
  const { username, ...updateData } = values;
  
  const response = await updateUserProfile(updateData);
  // ...
};
```

#### 4. 监听编辑状态，自动重新填充表单
```typescript
// 当打开编辑模式时，重新设置表单值
useEffect(() => {
  if (editing && userProfile) {
    form.setFieldsValue({
      username: userProfile.username,
      name: userProfile.name,
      email: userProfile.email,
      age: userProfile.age,
    });
  }
}, [editing, userProfile, form]);
```

**为什么这样修复？**
- ✅ 每次打开编辑模式（editing = true）时自动填充表单
- ✅ 无论是第一次还是第N次打开，表单都会正确填充
- ✅ 用户修改数据后保存，下次打开会显示最新数据
- ✅ 不需要手动管理表单状态，自动化处理

## 🧪 测试验证

### 测试场景 1: 用户有 username，无 name
```json
{
  "username": "admin",
  "name": null
}
```
**预期结果**: 
- 显示 "admin" ✅
- 编辑时 username 字段显示 "admin" 且为灰色（禁用状态）✅

### 测试场景 2: 用户有 username 和 name
```json
{
  "username": "admin",
  "name": "管理员"
}
```
**预期结果**: 
- 显示 "管理员" ✅
- 编辑时 username 显示 "admin"（禁用），name 显示 "管理员"（可编辑）✅

### 测试场景 3: 编辑表单功能
1. **打开编辑表单**
   - ✅ username 字段正确显示且为禁用状态
   - ✅ username 字段有提示文字"用户名不可修改"
   - ✅ name、email、age 字段可以正常编辑

2. **修改信息并保存**
   - ✅ 只提交 name、email、age 字段
   - ✅ username 不包含在提交数据中
   - ✅ 保存成功后刷新显示最新数据

3. **取消编辑**
   - ✅ 表单重置为原始值
   - ✅ 退出编辑模式

## 📝 相关文件

### 修改的文件
- [个人中心页面](mdc:Platform.Admin/src/pages/account/center/index.tsx)

### 相关组件
- [UserController.cs](mdc:Platform.ApiService/Controllers/UserController.cs) - 后端 API
- [AppUser 模型](mdc:Platform.ApiService/Models/AuthModels.cs) - 数据模型
- [API 类型定义](mdc:Platform.Admin/src/services/ant-design-pro/typings.d.ts) - 前端类型

## 🔄 API 数据结构说明

### AppUser 模型字段说明
```csharp
public class AppUser : MultiTenantEntity
{
    // 用户名 - 登录时使用，必填，全局唯一
    public string Username { get; set; }
    
    // 姓名 - 显示名称，可选
    public string? Name { get; set; }
    
    // 邮箱 - 可选
    public string? Email { get; set; }
    
    // 年龄 - 可选
    public int? Age { get; set; }
    
    // 其他字段...
}
```

### 字段使用建议
- **Username**: 用户唯一标识，用于登录
- **Name**: 用户显示名称，优先使用此字段显示
- **显示逻辑**: `Name || Username`（优先 Name，降级 Username）

## 🎯 最佳实践

### 1. 数据映射时的降级策略
```typescript
// ✅ 推荐：提供降级值
name: apiUser.name || apiUser.username || '',

// ❌ 不推荐：不提供降级
name: apiUser.name,  // 可能为 null/undefined
```

### 2. 显示逻辑的健壮性
```typescript
// ✅ 推荐：多层降级
{userProfile.name || userProfile.username || '未设置'}

// ❌ 不推荐：单层判断
{userProfile.name}  // 可能为空
```

### 3. 类型定义的准确性
```typescript
// ✅ 推荐：使用 any 或正确的类型
const apiUser = response.data as any;

// 或者定义正确的接口
interface ApiUserResponse {
  username: string;
  name?: string;
  // ...
}
```

## 🔧 后续优化建议

### 1. 统一前后端类型定义
创建共享的类型定义，确保前后端一致：
```typescript
// 生成自后端模型的类型定义
export interface AppUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  // ...
}
```

### 2. API 响应规范化
后端可以考虑添加 DTO 层，统一返回格式：
```csharp
public class UserProfileResponse
{
    public string Id { get; set; }
    public string Username { get; set; }
    public string DisplayName { get; set; }  // Name ?? Username
    // ...
}
```

### 3. 前端类型守卫
添加运行时类型检查：
```typescript
function isAppUser(data: any): data is AppUser {
  return typeof data.username === 'string';
}
```

## 📚 参考文档

- [用户资料多租户修复](mdc:docs/bugfixes/USER-PROFILE-MULTI-TENANT-FIX.md)
- [个人资料更新多租户过滤问题修复](mdc:docs/bugfixes/USER-PROFILE-UPDATE-MULTI-TENANT-FIX.md) - 保存个人资料报错修复
- [API 集成规范](mdc:.cursor/rules/api-integration.mdc)
- [TypeScript 编码规范](mdc:.cursor/rules/typescript-coding-standards.mdc)

## ✅ 修复验证

### 验证步骤

#### 步骤 1: 启动应用
```bash
dotnet run --project Platform.AppHost
```

#### 步骤 2: 登录系统
- 访问：http://localhost:15001
- 用户名：`admin`
- 密码：`admin123`

#### 步骤 3: 检查用户信息显示
1. 点击右上角头像
2. 选择"个人中心"
3. **验证点**：
   - ✅ 用户名显示为 "admin"（不再是空白）
   - ✅ 个人信息卡片正确显示所有字段

#### 步骤 4: 测试编辑资料功能
1. 点击"编辑资料"按钮
2. **验证点**：
   - ✅ username 字段显示 "admin" 且为灰色（禁用状态）
   - ✅ 鼠标悬停 username 字段时显示提示"用户名不可修改"
   - ✅ name、email、age 字段可以正常编辑

3. 修改姓名为"系统管理员"
4. 点击"保存"按钮
5. **验证点**：
   - ✅ 显示"个人信息更新成功"提示
   - ✅ 退出编辑模式
   - ✅ 用户名显示为"系统管理员"（如果有 name 则显示 name）
   - ✅ username 仍然是 "admin"（未被修改）

6. 再次点击"编辑资料"
7. **验证点**：
   - ✅ 所有字段正确回填，包括刚修改的姓名

#### 步骤 5: 测试取消编辑
1. 点击"编辑资料"按钮
2. 修改某些字段（如修改姓名）
3. 点击"取消"按钮
4. **验证点**：
   - ✅ 退出编辑模式
   - ✅ 数据未改变（显示的仍是修改前的数据）

#### 步骤 6: 测试第二次编辑（重要）
1. 再次点击"编辑资料"按钮
2. **验证点**：
   - ✅ 表单正确填充（不是空的）
   - ✅ username 显示正确且为禁用状态
   - ✅ name、email、age 显示当前的值
   - ✅ 可以正常编辑和保存

3. 修改某个字段并保存
4. 第三次点击"编辑资料"
5. **验证点**：
   - ✅ 表单仍然正确填充
   - ✅ 显示最新保存的数据

### 预期结果总结
- ✅ 用户名正确显示（不再空白）
- ✅ 编辑时 username 字段正确初始化
- ✅ username 字段禁止编辑并有明确提示
- ✅ 只提交可修改的字段（name、email、age）
- ✅ 保存后正确刷新显示
- ✅ 取消编辑功能正常
- ✅ **第二次及后续编辑表单都正确填充**（不再是空的）

---

**修复日期**: 2025-10-14  
**影响范围**: 个人中心用户信息显示和编辑  
**优先级**: 高（影响用户体验）  
**状态**: ✅ 已修复

## 📊 修复影响

### 修复的功能
1. ✅ 用户名显示（从空白到正确显示）
2. ✅ 编辑表单初始化（username 字段正确回填）
3. ✅ 用户体验改进（明确标识 username 不可修改）
4. ✅ 数据提交优化（过滤无效字段）
5. ✅ **多次编辑表单状态管理**（第二次及后续编辑表单正确填充）

### 相关组件
- **前端**: 个人中心页面数据映射和表单处理
- **后端**: 无需修改（后端逻辑正确）
- **类型定义**: 已正确定义（UpdateProfileParams 不包含 username）

