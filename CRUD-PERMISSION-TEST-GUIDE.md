# CRUD 权限系统测试指南

## 🎯 测试目标

验证 CRUD 权限系统的完整功能，包括：
- ✅ 权限初始化
- ✅ 角色权限配置
- ✅ 用户自定义权限
- ✅ 前端权限控制
- ✅ 后端权限验证
- ✅ 权限继承和合并

## 🚀 准备工作

### 1. 启动系统

```bash
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet run --project Platform.AppHost
```

等待系统完全启动后，访问：
- 管理后台：http://localhost:15001
- API 文档：http://localhost:15000/scalar/v1

### 2. 登录系统

使用默认管理员账户登录：
- 用户名：`admin`
- 密码：`admin123`

## 📋 测试场景

### 测试 1：验证权限初始化

#### 目的
确认系统启动时自动创建了所有默认权限

#### 步骤
1. 登录后，访问「系统管理」→「权限管理」
2. 查看是否显示了7个资源分组
3. 每个资源应该有4个权限（创建、查看、修改、删除）
4. 总共应该有 28 个权限

#### 预期结果
✅ 显示 7 个资源分组：用户、角色、菜单、公告、标签、权限、活动日志  
✅ 每个资源有 4 个权限  
✅ 权限代码格式正确（如 `user:create`）

#### 调试
如果没有看到权限数据：
```bash
# 手动调用初始化接口
curl -X POST http://localhost:15000/api/permission/initialize \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 测试 2：超级管理员权限

#### 目的
验证超级管理员自动拥有所有权限

#### 步骤
1. 以 admin 用户登录
2. 打开浏览器开发者工具，在 Console 中执行：
   ```javascript
   // 查看当前用户权限
   fetch('/api/user/my-permissions', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
   })
   .then(r => r.json())
   .then(data => console.log('我的权限:', data));
   ```
3. 检查返回的 `allPermissionCodes` 数组

#### 预期结果
✅ `allPermissionCodes` 包含所有 28 个权限  
✅ 可以访问所有管理页面  
✅ 所有按钮都显示（新建、编辑、删除等）

---

### 测试 3：创建受限角色

#### 目的
创建一个只有部分权限的角色并验证权限控制

#### 步骤

**3.1 创建「查看者」角色**
1. 进入「角色管理」页面
2. 点击「新增角色」
3. 填写信息：
   - 角色名称：`viewer`
   - 描述：`只能查看数据的角色`
4. 保存角色

**3.2 配置角色权限**
1. 在角色列表找到「viewer」角色
2. 点击「操作权限」按钮
3. 只勾选以下权限：
   - 用户 → 查看 ✓
   - 角色 → 查看 ✓
   - 公告 → 查看 ✓
   - 标签 → 查看 ✓
4. 保存配置

**3.3 配置菜单权限**
1. 点击「菜单权限」按钮
2. 勾选以下菜单：
   - 欢迎 ✓
   - 系统管理 ✓
   - 用户管理 ✓
   - 角色管理 ✓
3. 保存配置

#### 预期结果
✅ 角色创建成功  
✅ 权限配置成功  
✅ 菜单权限配置成功

---

### 测试 4：创建测试用户

#### 目的
创建一个测试用户并分配受限角色

#### 步骤
1. 进入「用户管理」页面
2. 点击「新增用户」
3. 填写信息：
   - 用户名：`testuser`
   - 密码：`test123456`
   - 邮箱：`test@example.com`
   - 角色：`viewer`
   - 状态：启用
4. 保存用户

#### 预期结果
✅ 用户创建成功  
✅ 用户分配了 viewer 角色

---

### 测试 5：验证受限角色权限

#### 目的
验证受限角色的权限控制是否生效

#### 步骤

**5.1 退出并重新登录**
1. 点击右上角头像，选择「退出登录」
2. 使用测试用户登录：
   - 用户名：`testuser`
   - 密码：`test123456`

**5.2 检查菜单显示**
- 应该只能看到：欢迎、系统管理、用户管理、角色管理
- 不应该看到：菜单管理、用户日志、权限管理

**5.3 检查用户管理页面**
1. 进入「用户管理」
2. 检查页面按钮：
   - ❌ 「新增用户」按钮不显示（无 `user:create` 权限）
   - ✅ 可以看到用户列表（有 `user:read` 权限）
3. 检查操作列：
   - ✅ 「查看」按钮显示
   - ❌ 「编辑」按钮不显示（无 `user:update` 权限）
   - ❌ 「配置权限」按钮不显示（无 `user:update` 权限）
   - ❌ 「删除」按钮不显示（无 `user:delete` 权限）

**5.4 检查角色管理页面**
1. 进入「角色管理」
2. 检查页面按钮：
   - ❌ 「新增角色」按钮不显示（无 `role:create` 权限）
   - ✅ 可以看到角色列表（有 `role:read` 权限）
3. 检查操作列：
   - ❌ 所有按钮都不显示（无 `role:update` 和 `role:delete` 权限）

**5.5 测试 API 权限验证**
1. 打开浏览器开发者工具
2. 尝试调用创建用户 API：
   ```javascript
   fetch('/api/user/management', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
     },
     body: JSON stringify({
       username: 'test2',
       password: 'test123456',
       email: 'test2@example.com'
     })
   })
   .then(r => r.json())
   .then(data => console.log(data));
   ```
3. 应该返回 403 Forbidden 错误

#### 预期结果
✅ 菜单正确显示/隐藏  
✅ 按钮根据权限显示/隐藏  
✅ API 调用返回 403 Forbidden

---

### 测试 6：用户自定义权限

#### 目的
验证用户自定义权限功能

#### 步骤

**6.1 切换回管理员账户**
1. 退出 testuser 账户
2. 使用 admin 登录

**6.2 为测试用户添加自定义权限**
1. 进入「用户管理」
2. 找到 testuser 用户
3. 点击「配置权限」按钮
4. 在弹出的模态框中：
   - 查看灰色「继承」标签标记的权限（来自 viewer 角色）
   - 勾选「公告」的「创建」权限
   - 勾选「公告」的「修改」权限
5. 保存配置

**6.3 验证自定义权限**
1. 退出 admin，重新以 testuser 登录
2. 访问公告管理页面（如果有的话）
3. 检查权限：
   - ✅ 可以查看公告（来自角色）
   - ✅ 可以创建公告（自定义权限）
   - ✅ 可以修改公告（自定义权限）
   - ❌ 不能删除公告（无权限）

**6.4 验证权限合并**
打开开发者工具，查看权限列表：
```javascript
fetch('/api/user/my-permissions', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
})
.then(r => r.json())
.then(data => {
  console.log('角色权限:', data.data.rolePermissions);
  console.log('自定义权限:', data.data.customPermissions);
  console.log('所有权限:', data.data.allPermissionCodes);
});
```

#### 预期结果
✅ 用户权限 = 角色权限 + 自定义权限  
✅ 前端按钮正确显示  
✅ 后端 API 验证正确

---

### 测试 7：权限验证失败场景

#### 目的
验证无权限时的错误提示

#### 步骤

**7.1 前端测试**
1. 以 testuser 登录
2. 在用户管理页面，应该看不到「新增用户」按钮
3. 在角色管理页面，应该看不到任何操作按钮

**7.2 后端 API 测试**
在开发者工具中直接调用受保护的 API：
```javascript
// 尝试创建用户（应该失败）
fetch('/api/user/management', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  },
  body: JSON.stringify({
    username: 'unauthorized',
    password: 'test123456'
  })
})
.then(r => r.json())
.then(data => console.log('创建用户结果:', data));

// 尝试删除角色（应该失败）
fetch('/api/role/SOME_ROLE_ID', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
})
.then(r => r.json())
.then(data => console.log('删除角色结果:', data));
```

#### 预期结果
✅ 返回 403 状态码  
✅ 错误消息：「无权执行此操作」  
✅ errorCode: "FORBIDDEN"

---

### 测试 8：角色权限修改

#### 目的
验证角色权限修改后立即生效

#### 步骤

**8.1 修改 viewer 角色权限**
1. 切换回 admin 登录
2. 进入「角色管理」
3. 找到 viewer 角色，点击「操作权限」
4. 额外勾选：
   - 用户 → 创建 ✓
   - 用户 → 修改 ✓
5. 保存配置

**8.2 验证权限立即生效**
1. 切换回 testuser 登录（或刷新页面）
2. 进入「用户管理」
3. 现在应该能看到：
   - ✅ 「新增用户」按钮显示
   - ✅ 「编辑」按钮显示
   - ❌ 「删除」按钮仍然不显示

#### 预期结果
✅ 角色权限修改后，用户权限立即更新  
✅ 前端按钮正确显示/隐藏

---

### 测试 9：权限管理页面功能

#### 目的
验证权限管理页面的所有功能

#### 步骤

**9.1 访问权限管理**
1. 以 admin 登录
2. 进入「系统管理」→「权限管理」

**9.2 测试功能**
1. 点击「刷新」按钮 - 应该重新加载权限列表
2. 点击「初始化默认权限」 - 应该显示成功消息
3. 展开/折叠各个资源分组
4. 查看每个权限的详细信息

#### 预期结果
✅ 页面正常显示  
✅ 所有按钮功能正常  
✅ 权限分组清晰

---

### 测试 10：边缘情况

#### 测试 10.1：无权限用户
1. 创建一个新角色「guest」，不分配任何权限
2. 创建新用户，分配 guest 角色
3. 使用该用户登录
4. 应该只能看到个人中心，无法访问任何管理页面

#### 测试 10.2：Token 过期
1. 登录后等待 token 过期（默认60分钟）
2. 或者手动清除 localStorage 中的 token
3. 刷新页面
4. 应该自动跳转到登录页

#### 测试 10.3：删除用户的角色
1. 以 admin 登录
2. 删除某个用户的角色分配
3. 该用户应该失去角色的所有权限
4. 但保留自定义权限

## ✅ 验证清单

### 后端验证
- [ ] 系统启动时自动初始化 28 个权限
- [ ] 超级管理员自动获得所有权限
- [ ] RequirePermission 特性正确拦截请求
- [ ] 无权限返回 403 状态码
- [ ] 权限代码格式正确（resource:action）
- [ ] 软删除的权限不参与验证

### 前端验证
- [ ] app.tsx 初始化时获取用户权限
- [ ] currentUser.permissions 包含权限代码
- [ ] PermissionControl 组件正确显示/隐藏内容
- [ ] usePermission Hook 正确检查权限
- [ ] access.ts 的权限函数工作正常
- [ ] 权限管理页面正常显示
- [ ] 角色权限配置模态框正常工作
- [ ] 用户权限配置模态框正常工作

### 权限控制验证
- [ ] 用户管理页面按钮权限控制
- [ ] 角色管理页面按钮权限控制
- [ ] 菜单管理页面权限验证
- [ ] 公告管理页面权限验证
- [ ] 标签管理页面权限验证

### 数据验证
- [ ] 角色的 permissionIds 字段正确保存
- [ ] 用户的 customPermissionIds 字段正确保存
- [ ] 权限合并逻辑正确（角色权限 + 自定义权限）
- [ ] 权限去重正确

## 🐛 常见问题排查

### 问题 1：看不到权限数据

**原因**：权限初始化失败或未执行

**解决**：
1. 检查后端控制台日志，查找「权限系统初始化」相关信息
2. 手动调用初始化 API：
   ```bash
   POST /api/permission/initialize
   ```
3. 检查 MongoDB 数据库中 permissions 集合是否有数据

### 问题 2：权限控制不生效

**原因**：前端未获取到用户权限

**解决**：
1. 打开浏览器控制台，检查是否有错误
2. 查看 Network 标签，确认 `/api/user/my-permissions` 请求成功
3. 在 Console 中执行：
   ```javascript
   JSON.parse(localStorage.getItem('umi_initial_state') || '{}')?.currentUser?.permissions
   ```
4. 如果没有权限数据，尝试刷新页面

### 问题 3：所有按钮都不显示

**原因**：可能是 super-admin 角色配置问题

**解决**：
1. 检查用户的角色是否正确
2. 查看数据库中角色的 permissionIds 字段
3. 确认权限初始化脚本已执行

### 问题 4：API 返回 500 错误

**原因**：PermissionCheckService 注入失败

**解决**：
1. 检查 Program.cs 中是否注册了服务：
   ```csharp
   builder.Services.AddScoped<IPermissionCheckService, PermissionCheckService>();
   ```
2. 检查 UserService 构造函数是否正确注入

## 📊 数据库验证

### 查询权限数据

```javascript
// MongoDB 查询示例
db.permissions.find({ isDeleted: false }).pretty()

// 应该返回 28 个文档
db.permissions.countDocuments({ isDeleted: false })

// 查看某个角色的权限
db.roles.findOne({ name: "viewer" })
```

### 查询用户权限

```javascript
// 查看用户的角色和权限
db.users.findOne({ username: "testuser" })

// 应该看到 roleIds 和 customPermissionIds 字段
```

## 🎉 测试完成标准

完成以下所有验证项即表示测试通过：

✅ **后端**
- 权限初始化成功
- 所有控制器添加了权限验证
- 权限验证逻辑正确
- API 返回正确的错误代码

✅ **前端**
- 权限获取成功
- 按钮权限控制生效
- 权限管理页面正常
- 权限配置功能正常

✅ **业务逻辑**
- 角色权限正确分配
- 用户自定义权限正确添加
- 权限继承和合并正确
- 权限修改立即生效

## 📝 测试报告模板

```markdown
# CRUD 权限系统测试报告

测试时间：YYYY-MM-DD HH:mm:ss
测试人员：XXX

## 测试环境
- 后端版本：.NET 9.0
- 前端版本：React 19
- 数据库：MongoDB

## 测试结果

### 功能测试
- [ ] 权限初始化：通过/失败
- [ ] 角色权限配置：通过/失败
- [ ] 用户自定义权限：通过/失败
- [ ] 前端权限控制：通过/失败
- [ ] 后端权限验证：通过/失败

### 问题记录
1. 问题描述
   - 原因：...
   - 解决：...

## 总体评价
系统权限控制功能完整，运行稳定。
```

---

**祝测试顺利！** 如有任何问题，请参考 `CRUD-PERMISSION-SYSTEM.md` 详细文档。

