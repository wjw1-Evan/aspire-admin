# 用户注册数据完整性检查指南

## 🎯 快速开始

如果你遇到新注册用户无法访问系统功能（如角色管理）的问题，请按以下步骤检查和修复：

### 1️⃣ 快速诊断

```bash
cd /Volumes/thinkplus/Projects/aspire-admin

# 运行快速修复脚本（推荐）
./quick-fix.sh
```

### 2️⃣ 全面检查

```bash
# 数据库完整性检查
mongosh aspire-admin < check-user-registration-integrity.js

# 端到端注册测试
./test-user-registration-complete.sh
```

### 3️⃣ 彻底重置（如果问题严重）

```bash
# 删除数据库，重新初始化
mongosh aspire-admin --eval "db.dropDatabase()"

# 重启服务
dotnet run --project Platform.AppHost
```

## 📋 检查工具说明

### 🔧 quick-fix.sh
- **用途**: 自动修复常见的数据完整性问题
- **功能**: 
  - 检查菜单是否存在
  - 修复角色的菜单权限分配
  - 修复用户的角色关联
  - 验证修复结果

### 📊 check-user-registration-integrity.js
- **用途**: 全面的数据库数据完整性检查
- **功能**:
  - 分析所有用户的数据完整性
  - 检查权限链：用户→企业→角色→菜单
  - 识别具体的数据问题
  - 提供修复建议

### 🧪 test-user-registration-complete.sh
- **用途**: 端到端注册流程测试
- **功能**:
  - 创建新测试用户
  - 验证数据库中的所有相关数据
  - 测试登录和API访问
  - 验证JWT Token完整性

## 🔍 常见问题和解决方案

### 问题 1: "无权访问菜单: role-management"

**症状**: 新用户登录后无法访问角色管理等功能
**原因**: 菜单权限链中某个环节缺失
**解决**: 
```bash
./quick-fix.sh  # 优先尝试
# 或
mongosh aspire-admin < check-user-registration-integrity.js
```

### 问题 2: "用户注册成功但无法登录"

**症状**: 注册API返回成功，但登录失败
**原因**: 用户数据创建不完整
**解决**:
```bash
./test-user-registration-complete.sh  # 测试完整流程
```

### 问题 3: "系统中没有菜单"

**症状**: 数据库 menus 表为空
**原因**: DatabaseInitializerService 未执行或失败
**解决**:
```bash
# 检查服务启动日志，应该看到：
# [DatabaseInitializerService] 全局系统菜单创建完成（6 个）

# 如果没有，重启服务
dotnet run --project Platform.AppHost
```

## 📊 用户注册数据结构

每个成功注册的用户应该创建以下数据：

### 1. 用户记录 (users 表)
```javascript
{
  username: "testuser",
  email: "test@example.com",
  currentCompanyId: "企业ObjectId",
  personalCompanyId: "企业ObjectId", 
  isActive: true,
  isDeleted: false
}
```

### 2. 个人企业 (companies 表)
```javascript
{
  name: "testuser 的企业",
  code: "personal-用户ObjectId",
  isActive: true,
  maxUsers: 50,
  isDeleted: false
}
```

### 3. 管理员角色 (roles 表)
```javascript
{
  name: "管理员",
  companyId: "企业ObjectId",
  menuIds: ["菜单ID1", "菜单ID2", ...], // 所有菜单ID
  isActive: true,
  isDeleted: false
}
```

### 4. 用户企业关联 (userCompanies 表)
```javascript
{
  userId: "用户ObjectId",
  companyId: "企业ObjectId", 
  roleIds: ["角色ObjectId"],
  isAdmin: true,
  status: "active",
  isDeleted: false
}
```

## 🎯 权限检查链

用户访问功能时的检查流程：

```
1. JWT Token → 提取 userId, currentCompanyId
2. UserCompany → 根据 userId + companyId 获取 roleIds  
3. Role → 根据 roleIds 获取 menuIds
4. Menu → 检查 menuName 是否在 menuIds 中
5. 通过 → 允许访问 / 失败 → 返回403
```

任何一个环节缺失都会导致权限检查失败。

## 🚨 预防措施

### 1. 监控启动日志
确保看到以下关键日志：
```
[DatabaseInitializerService] 开始数据库初始化...
[DatabaseInitializerService] 全局系统菜单创建完成（6 个）
[DatabaseInitializerService] 所有初始化操作执行完成
```

### 2. 定期检查数据完整性
```bash
# 每周或重大更新后运行
mongosh aspire-admin < check-user-registration-integrity.js
```

### 3. 用户反馈快速响应
如果用户报告无法访问功能，立即运行：
```bash
./quick-fix.sh
```

## 📚 详细文档

- **详细分析**: [用户注册数据完整性分析](docs/bugfixes/USER-REGISTRATION-DATA-INTEGRITY-ANALYSIS.md)
- **菜单权限问题**: [新用户菜单访问权限修复](docs/bugfixes/NEW-USER-MENU-ACCESS-FIX.md)
- **多租户规范**: [多租户数据隔离规范](.cursor/rules/multi-tenant-data-isolation.mdc)

## 🎯 记住

1. **数据完整性是关键** - 缺失任何一环都会导致权限失败
2. **优先使用自动修复** - quick-fix.sh 能解决大部分问题  
3. **彻底重置是最后手段** - 只在数据严重不一致时使用
4. **监控是预防的关键** - 关注启动日志和用户反馈

确保每个用户注册后都能完整使用系统功能！
