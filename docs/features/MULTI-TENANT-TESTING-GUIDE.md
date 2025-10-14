# 多租户系统测试指南

## 📋 测试概览

本文档提供多租户系统的完整测试指南，包括功能测试、数据隔离测试、性能测试等。

## 🚀 快速开始

### 前置条件

1. 启动应用：
```bash
dotnet run --project Platform.AppHost
```

2. 访问地址：
- 管理后台：http://localhost:15001
- API 文档：http://localhost:15000/scalar/v1
- MongoDB Express：http://localhost:8081

### 测试账户

**默认企业（迁移后的现有数据）:**
- 企业代码：`default`
- 管理员用户名：`admin`
- 管理员密码：`admin123`

## 📊 测试清单

### 1. 企业注册测试 ⭐ 核心功能

#### 测试场景 1.1：正常注册流程

**步骤:**
1. 访问：http://localhost:15001/company/register
2. 填写表单：
   ```
   企业名称：测试公司A
   企业代码：test-company-a
   企业描述：这是测试公司A
   所属行业：互联网
   
   管理员用户名：admin-a
   管理员密码：Admin@123
   确认密码：Admin@123
   管理员邮箱：admin-a@test.com
   
   联系人：张三
   联系电话：13800138000
   ```
3. 点击"立即注册"
4. 等待处理

**预期结果:**
- ✅ 显示"企业注册成功，已自动登录"
- ✅ 自动跳转到仪表板（`/welcome`）
- ✅ 右上角显示用户名"admin-a"
- ✅ Token 已保存到 localStorage

**验证:**
```bash
# 检查 MongoDB
db.companies.find({ code: "test-company-a" })
db.users.find({ username: "admin-a", companyId: "xxx" })
db.roles.find({ companyId: "xxx", name: "管理员" })
db.menus.find({ companyId: "xxx" }).count()  # 应该有5个菜单
db.permissions.find({ companyId: "xxx" }).count()  # 应该有32个权限
```

#### 测试场景 1.2：企业代码重复

**步骤:**
1. 访问企业注册页面
2. 填写企业代码：`test-company-a`（已存在）
3. 填写其他必填项
4. 点击"立即注册"

**预期结果:**
- ✅ 显示错误："企业代码已存在"
- ✅ 注册失败，留在注册页面

#### 测试场景 1.3：实时企业代码验证

**步骤:**
1. 在企业代码输入框输入：`test-company-a`
2. 失焦触发验证

**预期结果:**
- ✅ 显示错误提示："企业代码已被使用"

**步骤:**
1. 修改为：`new-company-code`
2. 失焦触发验证

**预期结果:**
- ✅ 验证通过，无错误提示

#### 测试场景 1.4：字段验证

**测试用例:**
| 字段 | 测试值 | 预期结果 |
|------|--------|----------|
| 企业名称 | 空 | ❌ "请输入企业名称" |
| 企业名称 | "A" | ❌ "企业名称长度必须在2-100个字符之间" |
| 企业代码 | 空 | ❌ "请输入企业代码" |
| 企业代码 | "AB" | ❌ "企业代码长度必须在3-20个字符之间" |
| 企业代码 | "公司代码" | ❌ "企业代码只能包含字母、数字、下划线和横线" |
| 管理员用户名 | 空 | ❌ "请输入管理员用户名" |
| 管理员密码 | "123" | ❌ "密码长度至少6个字符" |
| 管理员邮箱 | "invalid" | ❌ "邮箱格式不正确" |
| 确认密码 | "different" | ❌ "两次输入的密码不一致" |

### 2. 数据隔离测试 ⭐ 安全性核心

#### 测试场景 2.1：企业间数据隔离

**步骤:**
1. 注册企业A（`company-a`，管理员 `admin-a`）
2. 登录企业A，创建用户 `user-a1`, `user-a2`
3. 登录企业A，创建角色 `角色A`
4. 登出
5. 注册企业B（`company-b`，管理员 `admin-b`）
6. 登录企业B，创建用户 `user-b1`
7. 访问"用户管理"页面

**预期结果:**
- ✅ 企业B只能看到 `admin-b`, `user-b1`
- ✅ 看不到企业A的用户（`admin-a`, `user-a1`, `user-a2`）

**MongoDB 验证:**
```javascript
// 企业A的用户
db.users.find({ companyId: "company-a-id" })
// 结果: [admin-a, user-a1, user-a2]

// 企业B的用户
db.users.find({ companyId: "company-b-id" })
// 结果: [admin-b, user-b1]
```

#### 测试场景 2.2：角色隔离

**步骤:**
1. 登录企业A，访问"角色管理"
2. 记录角色列表
3. 登出
4. 登录企业B，访问"角色管理"
5. 对比角色列表

**预期结果:**
- ✅ 企业A和企业B的角色列表完全不同
- ✅ 企业A看不到企业B的角色

#### 测试场景 2.3：菜单隔离

**步骤:**
1. 登录企业A，访问"菜单管理"
2. 修改某个菜单（如修改"仪表板"的标题为"企业A仪表板"）
3. 登出
4. 登录企业B，访问"菜单管理"

**预期结果:**
- ✅ 企业B的菜单仍显示原始标题"仪表板"
- ✅ 企业B看不到企业A的菜单修改

#### 测试场景 2.4：通知隔离

**步骤:**
1. 登录企业A
2. 查看通知（右上角铃铛）
3. 登出
4. 登录企业B
5. 查看通知

**预期结果:**
- ✅ 企业A和企业B的通知完全独立
- ✅ 企业A看不到企业B的通知

### 3. 企业管理测试

#### 测试场景 3.1：查看企业信息

**步骤:**
1. 登录任意企业的管理员
2. 访问"系统设置" → "企业设置"

**预期结果:**
- ✅ 显示当前企业信息
- ✅ 显示企业统计数据（用户数、角色数、菜单数、权限数）
- ✅ 显示用户配额进度条
- ✅ 显示企业状态标签

#### 测试场景 3.2：编辑企业信息

**步骤:**
1. 在企业设置页面，点击"编辑企业信息"
2. 修改企业名称为"新企业名称"
3. 修改企业描述
4. 点击"确定"

**预期结果:**
- ✅ 显示"企业信息更新成功"
- ✅ 页面自动刷新，显示新信息
- ✅ MongoDB 中数据已更新

#### 测试场景 3.3：企业统计准确性

**步骤:**
1. 登录企业A，创建3个用户
2. 创建2个角色
3. 刷新企业设置页面

**预期结果:**
- ✅ 用户总数：4（包括管理员）
- ✅ 活跃用户：4
- ✅ 角色数量：3（包括默认管理员角色）
- ✅ 剩余用户数：96（100 - 4）

### 4. 用户配额测试

#### 测试场景 4.1：达到配额限制

**步骤:**
1. 创建测试企业，设置 `MaxUsers = 3`（需要手动修改数据库）
   ```javascript
   db.companies.updateOne(
     { code: "test-company" },
     { $set: { maxUsers: 3 } }
   )
   ```
2. 登录该企业
3. 创建用户直到达到3个（含管理员）
4. 尝试创建第4个用户

**预期结果:**
- ✅ 显示错误："已达到最大用户数限制"
- ✅ 用户创建失败

**实施状态:** ⚠️ 后端逻辑需要添加配额检查

### 5. 企业状态测试

#### 测试场景 5.1：企业停用

**步骤:**
1. 手动停用企业：
   ```javascript
   db.companies.updateOne(
     { code: "test-company" },
     { $set: { isActive: false } }
   )
   ```
2. 尝试登录该企业的用户

**预期结果:**
- ✅ 登录失败或显示"企业未激活"错误

**实施状态:** ⚠️ 后端逻辑需要在登录时检查企业状态

#### 测试场景 5.2：企业过期

**步骤:**
1. 设置企业过期时间为过去：
   ```javascript
   db.companies.updateOne(
     { code: "test-company" },
     { $set: { expiresAt: new Date("2024-01-01") } }
   )
   ```
2. 尝试登录该企业的用户

**预期结果:**
- ✅ 登录失败或显示"企业已过期"错误

**实施状态:** ⚠️ 后端逻辑需要在登录时检查企业过期

### 6. 数据迁移测试

#### 测试场景 6.1：首次迁移

**步骤:**
1. 确保数据库中有旧数据（没有 companyId）
2. 启动应用
3. 查看启动日志

**预期结果:**
- ✅ 日志显示："开始多租户数据迁移..."
- ✅ 日志显示："创建默认企业成功"
- ✅ 日志显示每个集合的迁移结果
- ✅ 日志显示："多租户数据迁移完成！"

**MongoDB 验证:**
```javascript
// 检查默认企业
db.companies.find({ code: "default" })

// 检查所有用户都有 companyId
db.users.find({ companyId: { $exists: false } }).count()  // 应该为 0

// 检查所有角色都有 companyId
db.roles.find({ companyId: { $exists: false } }).count()  // 应该为 0
```

#### 测试场景 6.2：重复迁移（幂等性）

**步骤:**
1. 重启应用
2. 查看启动日志

**预期结果:**
- ✅ 日志显示："默认企业已存在，跳过迁移"
- ✅ 不会创建重复的默认企业
- ✅ 不会重复迁移数据

### 7. 索引创建测试

#### 测试场景 7.1：索引创建

**步骤:**
1. 启动应用
2. 查看日志

**预期结果:**
- ✅ 日志显示："开始创建多租户索引..."
- ✅ 日志显示："Company 索引创建完成"
- ✅ 日志显示："AppUser 索引创建完成"
- ✅ 日志显示："多租户索引创建完成！"

**MongoDB 验证:**
```javascript
// 检查 Company 索引
db.companies.getIndexes()
// 应该包含: idx_company_code_unique

// 检查 AppUser 索引
db.users.getIndexes()
// 应该包含: 
// - idx_user_company_username_unique
// - idx_user_company_email
// - idx_user_company_status

// 检查 Role 索引
db.roles.getIndexes()
// 应该包含: idx_role_company_name_unique
```

### 8. API 接口测试

#### 测试场景 8.1：企业注册 API

**请求:**
```bash
curl -X POST http://localhost:15000/api/company/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "API测试公司",
    "companyCode": "api-test-company",
    "companyDescription": "通过API注册的测试公司",
    "industry": "软件开发",
    "adminUsername": "admin-api",
    "adminPassword": "Admin@123",
    "adminEmail": "admin@api-test.com",
    "contactName": "测试联系人",
    "contactPhone": "13900139000"
  }'
```

**预期响应:**
```json
{
  "success": true,
  "data": {
    "company": {
      "id": "xxx",
      "name": "API测试公司",
      "code": "api-test-company",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-14T12:00:00Z"
  },
  "errorMessage": "企业注册成功，已自动登录"
}
```

#### 测试场景 8.2：获取当前企业信息

**请求:**
```bash
curl -X GET http://localhost:15000/api/company/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**预期响应:**
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "API测试公司",
    "code": "api-test-company",
    "isActive": true,
    "maxUsers": 100,
    ...
  }
}
```

#### 测试场景 8.3：获取企业统计

**请求:**
```bash
curl -X GET http://localhost:15000/api/company/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**预期响应:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1,
    "activeUsers": 1,
    "totalRoles": 1,
    "totalMenus": 5,
    "totalPermissions": 32,
    "maxUsers": 100,
    "remainingUsers": 99,
    "isExpired": false,
    "expiresAt": null
  }
}
```

### 9. 性能测试

#### 测试场景 9.1：索引性能验证

**步骤:**
1. 创建多个企业（10个企业）
2. 每个企业创建大量用户（每个企业50个用户）
3. 执行查询并使用 explain

**MongoDB 性能验证:**
```javascript
// 检查查询是否使用索引
db.users.find({ 
  companyId: "test-company-id", 
  isDeleted: false, 
  isActive: true 
}).explain("executionStats")

// 预期结果:
// - totalDocsExamined 应该接近 nReturned（表示使用了索引）
// - executionTimeMillis 应该 < 10ms
```

#### 测试场景 9.2：并发注册

**步骤:**
使用测试工具并发注册10个企业

**预期结果:**
- ✅ 所有注册都成功
- ✅ 没有数据冲突
- ✅ CompanyId 正确设置

### 10. 完整业务流程测试

#### 测试场景 10.1：完整的企业使用流程

**步骤:**
1. 企业注册
2. 自动登录
3. 查看企业统计
4. 创建部门角色（如：财务部、技术部）
5. 为角色分配权限和菜单
6. 创建普通用户并分配角色
7. 登出管理员
8. 登录普通用户
9. 验证菜单权限
10. 修改个人资料
11. 查看活动日志

**预期结果:**
- ✅ 所有操作正常
- ✅ 权限控制正确
- ✅ 数据隔离正确

## 🔍 调试工具

### MongoDB 查询模板

```javascript
// 1. 查看所有企业
db.companies.find({ isDeleted: false })

// 2. 查看特定企业的所有用户
db.users.find({ companyId: "xxx", isDeleted: false })

// 3. 查看企业的所有角色
db.roles.find({ companyId: "xxx", isDeleted: false })

// 4. 查看企业的所有权限
db.permissions.find({ companyId: "xxx", isDeleted: false })

// 5. 检查数据迁移状态
db.users.find({ companyId: { $exists: false } })  // 应该为空

// 6. 统计各企业用户数
db.users.aggregate([
  { $match: { isDeleted: false } },
  { $group: { _id: "$companyId", count: { $sum: 1 } } }
])
```

### 浏览器开发者工具

```javascript
// 1. 检查 Token
localStorage.getItem('auth_token')

// 2. 解码 JWT Token（使用 jwt.io）
// 检查 claims 中是否包含 companyId

// 3. 检查网络请求
// Network → 查看 API 请求
// 验证 Authorization header
```

## ✅ 测试通过标准

### 功能完整性

- ✅ 企业注册流程完整
- ✅ 企业信息管理正常
- ✅ 企业统计准确

### 数据隔离

- ✅ 用户数据完全隔离
- ✅ 角色数据完全隔离
- ✅ 菜单数据完全隔离
- ✅ 权限数据完全隔离
- ✅ 通知数据完全隔离
- ✅ 活动日志完全隔离

### 安全性

- ✅ 无法访问其他企业数据
- ✅ 企业代码唯一性
- ✅ JWT Token 包含 CompanyId
- ✅ 自动租户过滤工作正常

### 性能

- ✅ 查询使用正确的索引
- ✅ 查询响应时间 < 100ms
- ✅ 并发操作无冲突

## 🐛 常见问题排查

### 问题1：注册后看不到数据

**原因:** 可能是前端未正确保存 Token

**排查:**
```javascript
// 检查 localStorage
localStorage.getItem('auth_token')
localStorage.getItem('auth_refresh_token')
```

**解决:** 确保注册成功后正确保存 Token

### 问题2：看到其他企业的数据

**原因:** BaseRepository 的租户过滤未生效

**排查:**
```csharp
// 检查 TenantContext 是否正确获取 CompanyId
var companyId = _tenantContext.GetCurrentCompanyId();
Console.WriteLine($"Current CompanyId: {companyId}");
```

**解决:** 确保 JWT Token 包含 companyId claim

### 问题3：数据迁移未执行

**原因:** 迁移脚本未调用或失败

**排查:**
查看应用启动日志，搜索"多租户数据迁移"

**解决:** 确保 Program.cs 中正确调用迁移脚本

### 问题4：索引未创建

**原因:** 索引创建失败或未调用

**排查:**
```javascript
// 检查索引
db.companies.getIndexes()
db.users.getIndexes()
```

**解决:** 手动执行索引创建或检查错误日志

## 📊 测试报告模板

### 测试记录

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| 企业注册 - 正常流程 | ✅ | 注册成功，自动登录正常 |
| 企业注册 - 代码重复 | ✅ | 正确拒绝重复代码 |
| 数据隔离 - 用户 | ✅ | 企业间用户完全隔离 |
| 数据隔离 - 角色 | ✅ | 企业间角色完全隔离 |
| 企业信息查看 | ✅ | 信息显示正确 |
| 企业信息编辑 | ✅ | 更新成功 |
| 数据迁移 | ✅ | 迁移成功，幂等性正常 |
| 索引创建 | ✅ | 所有索引创建成功 |

### 性能指标

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 企业注册时间 | < 3s | 2.1s | ✅ |
| 用户列表查询 | < 100ms | 45ms | ✅ |
| 索引命中率 | > 95% | 98% | ✅ |
| 并发注册 | 10 QPS | 12 QPS | ✅ |

## 🎯 下一步

### 必须完成（阻塞性）

1. ⚠️ **添加用户配额检查** - 在 UserService.CreateUserManagementAsync 中
2. ⚠️ **添加企业状态检查** - 在 AuthService.LoginAsync 中
3. ⚠️ **添加企业过期检查** - 在 AuthService.LoginAsync 中

### 可选增强

4. 企业Logo上传功能
5. 企业数据导出功能
6. 超级管理员后台
7. 企业计费系统

## 📚 相关文档

- [多租户系统完整文档](MULTI-TENANT-SYSTEM.md)
- [实施状态文档](MULTI-TENANT-IMPLEMENTATION-STATUS.md)
- [实施完成报告](../reports/MULTI-TENANT-IMPLEMENTATION-COMPLETE.md)

---

**最后更新**: 2025-01-13  
**版本**: v3.0  
**测试状态**: 待执行

