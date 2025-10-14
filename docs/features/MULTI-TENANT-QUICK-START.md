# 多租户系统快速开始

## 🚀 5分钟快速上手

### 步骤 1: 启动应用

```bash
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet run --project Platform.AppHost
```

**访问地址:**
- 管理后台：http://localhost:15001
- API 文档：http://localhost:15000/scalar/v1

### 步骤 2: 注册企业

1. 访问：http://localhost:15001/company/register
2. 填写表单：
   ```
   企业名称：我的公司
   企业代码：my-company
   管理员用户名：admin
   管理员密码：Admin@123
   管理员邮箱：admin@mycompany.com
   ```
3. 点击"立即注册"
4. ✅ 自动登录，进入管理后台

### 步骤 3: 管理企业

1. 访问"系统设置" → "企业设置"
2. 查看企业统计信息
3. 点击"编辑企业信息"更新资料

### 步骤 4: 测试数据隔离

1. 在当前企业创建几个用户
2. 登出
3. 注册新企业（企业代码：`another-company`）
4. 登录新企业
5. 访问"用户管理"
6. ✅ 验证：只能看到新企业的用户

## 📝 默认企业

如果您有现有数据，系统会自动创建"默认企业"：

- **企业代码**: `default`
- **企业名称**: 默认企业
- **管理员**: `admin` / `admin123`

所有现有数据会自动关联到默认企业。

## 🔧 核心概念

### 1. 数据隔离

每个企业的数据完全独立：
- ✅ 用户互不可见
- ✅ 角色独立管理
- ✅ 菜单独立配置
- ✅ 权限独立分配
- ✅ 通知独立管理

### 2. 自动过滤

系统自动处理租户过滤，开发者无需关心：

```csharp
// 查询自动过滤到当前企业
var users = await _userRepository.GetAllAsync();
// 实际查询: WHERE companyId = 'current-company-id' AND isDeleted = false
```

### 3. 企业配额

每个企业有用户数量限制（默认100人）：
- 创建用户时自动检查配额
- 达到配额后无法继续创建
- 可在企业信息中查看剩余配额

## 📋 常用操作

### 注册新企业

**前端:**
```
访问: /company/register
填写表单 → 提交 → 自动登录
```

**API:**
```bash
curl -X POST http://localhost:15000/api/company/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "新公司",
    "companyCode": "new-company",
    "adminUsername": "admin",
    "adminPassword": "Admin@123",
    "adminEmail": "admin@new.com"
  }'
```

### 查看企业信息

**前端:**
```
系统设置 → 企业设置
```

**API:**
```bash
curl -X GET http://localhost:15000/api/company/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 更新企业信息

**前端:**
```
企业设置 → 编辑企业信息 → 保存
```

**API:**
```bash
curl -X PUT http://localhost:15000/api/company/current \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新企业名称",
    "description": "更新的描述"
  }'
```

## ⚠️ 注意事项

### 重要提示

1. **企业代码不可修改** - 注册后永久固定
2. **管理员权限** - 首个用户自动成为企业管理员
3. **用户配额** - 默认100人，创建用户时会检查
4. **数据隔离** - 企业间数据完全隔离，无法共享

### 最佳实践

1. ✅ 使用有意义的企业代码（如：`company-name`）
2. ✅ 设置准确的联系信息
3. ✅ 定期查看企业统计
4. ✅ 合理分配角色和权限
5. ✅ 注意用户配额限制

## 🐛 常见问题

### Q: 注册失败怎么办？

**A:** 检查：
- 企业代码是否重复
- 所有必填项是否填写
- 邮箱格式是否正确
- 密码是否至少6个字符

### Q: 看不到企业信息？

**A:** 确保：
- 已登录
- Token 有效
- 用户所属企业存在

### Q: 无法创建用户？

**A:** 可能原因：
- 用户名重复
- 邮箱重复
- 已达到用户配额限制

### Q: 看到其他企业的数据？

**A:** 这不应该发生！如果出现：
1. 检查 JWT Token 是否包含正确的 companyId
2. 检查 BaseRepository 是否正确过滤
3. 查看服务器日志
4. 联系技术支持

## 📚 更多文档

- [完整系统文档](MULTI-TENANT-SYSTEM.md) - 详细的技术文档
- [实施完成报告](../reports/MULTI-TENANT-IMPLEMENTATION-COMPLETE.md) - 实施总结
- [测试指南](MULTI-TENANT-TESTING-GUIDE.md) - 完整的测试文档

## 💬 获取帮助

遇到问题？
1. 查看[测试指南](MULTI-TENANT-TESTING-GUIDE.md)
2. 查看[故障排查](MULTI-TENANT-SYSTEM.md#故障排查)
3. 检查服务器日志
4. 查看 MongoDB 数据

---

**版本**: v3.0  
**更新时间**: 2025-01-13

