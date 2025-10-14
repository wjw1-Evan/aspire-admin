# v5.0 验收检查清单

## 📋 版本信息

**版本**: v5.0  
**发布日期**: 2025-01-14  
**检查日期**: _______  
**检查人**: _______

## ✅ 代码检查

### 编译和构建

- [ ] 后端编译无错误：`dotnet build Platform.ApiService/Platform.ApiService.csproj`
- [ ] 后端编译无警告（或只有已知的可接受警告）
- [ ] 前端构建无错误：`cd Platform.Admin && npm run build`
- [ ] 前端 lint 检查通过：`cd Platform.Admin && npm run lint`

### 代码质量

- [ ] Program.cs 初始化代码只有 5 行
- [ ] Scripts 目录只有 1 个文件：CreateAllIndexes.cs
- [ ] Menu 模型继承 BaseEntity（不是 MultiTenantEntity）
- [ ] MenuService 不使用 BaseRepository
- [ ] 没有菜单管理相关的前端页面
- [ ] routes.ts 中业务路由都标记 hideInMenu: true

## 🗄️ 数据库检查

### 空数据库启动

- [ ] 清空数据库：`mongo aspire-admin --eval "db.dropDatabase()"`
- [ ] 启动应用：`dotnet run --project Platform.AppHost`
- [ ] 检查菜单数量：`db.menus.countDocuments()` = 6
- [ ] 检查菜单无 CompanyId：`db.menus.findOne({}, {companyId: 1})` 无此字段
- [ ] 检查系统锁：`db.system_locks.countDocuments()` = 1
- [ ] 检查无默认企业：`db.companies.countDocuments()` = 0
- [ ] 启动时间 < 5秒

### 用户注册测试

- [ ] 访问注册页面正常
- [ ] 注册新用户成功
- [ ] 检查企业创建：`db.companies.countDocuments()` = 1
- [ ] 检查权限数量：`db.permissions.countDocuments()` = 24（不是32）
- [ ] 检查角色创建：`db.roles.countDocuments()` = 1
- [ ] 检查菜单不增加：`db.menus.countDocuments()` = 6（仍然）
- [ ] 检查 UserCompany 创建：`db.user_companies.countDocuments()` = 1

### 菜单显示测试

- [ ] 登录后看到菜单
- [ ] 左侧显示 6 个菜单项
- [ ] 控制台显示："✅ 使用数据库菜单"
- [ ] 控制台不显示："Using default menus"
- [ ] 所有菜单都能正确跳转
- [ ] 没有 404 错误

## 🔒 并发安全检查

### 多实例启动

- [ ] 运行测试脚本：`./test-concurrent-startup.sh`
- [ ] 只有 1 个实例执行初始化
- [ ] 其他实例日志显示："锁已被其他实例持有，跳过执行"
- [ ] 所有实例正常启动
- [ ] 数据库中只有 1 条锁记录
- [ ] 菜单数量仍为 6（无重复创建）

### 分布式锁测试

- [ ] 锁集合存在：`db.system_locks.find().pretty()`
- [ ] 锁有 TTL 索引：`db.system_locks.getIndexes()`
- [ ] 锁有 LockName 唯一索引
- [ ] 锁能自动过期

## 📊 索引检查

### 关键索引

- [ ] companies.code 唯一索引
- [ ] users.username 全局唯一索引
- [ ] users.email 全局唯一索引（sparse）
- [ ] menus.name 全局唯一索引
- [ ] roles.companyId + name 唯一索引
- [ ] permissions.companyId + code 唯一索引
- [ ] user_companies.userId + companyId 唯一索引

验证方法：
```javascript
db.companies.getIndexes()
db.users.getIndexes()
db.menus.getIndexes()
db.roles.getIndexes()
db.permissions.getIndexes()
```

## 🎯 功能测试

### 菜单相关

- [ ] 管理员看到所有菜单
- [ ] 创建受限角色，只分配部分 MenuIds
- [ ] 受限用户只看到分配的菜单
- [ ] 菜单管理页面已删除（访问 /system/menu-management 应 404）
- [ ] 尝试创建菜单返回 404（API 不存在）

### 权限相关

- [ ] 查看权限列表不包含 menu:* 权限
- [ ] 查看权限列表不包含 permission:* 权限
- [ ] 权限总数为 24（6资源 × 4操作）
- [ ] 权限控制正常工作

### 用户管理

- [ ] 创建用户成功
- [ ] 编辑用户成功
- [ ] 删除用户成功
- [ ] 用户列表显示正常
- [ ] 权限过滤正常

## 📝 文档检查

### 文档完整性

- [ ] 存在 `docs/V5-QUICK-REFERENCE.md`
- [ ] 存在 `docs/V5-ACCEPTANCE-CHECKLIST.md`（本文档）
- [ ] 存在 `docs/reports/V5-OPTIMIZATION-COMPLETE.md`
- [ ] 存在 `docs/features/GLOBAL-MENU-ARCHITECTURE.md`
- [ ] 存在 `docs/features/MENU-RENDERING-MECHANISM.md`
- [ ] 存在 `docs/features/DYNAMIC-MENU-ONLY.md`
- [ ] 存在 `docs/optimization/DATABASE-INITIALIZATION-OPTIMIZATION.md`

### Cursor Rules

- [ ] 存在 `.cursor/rules/database-initialization.mdc`
- [ ] 存在 `.cursor/rules/distributed-lock-usage.mdc`
- [ ] 存在 `.cursor/rules/mongodb-atomic-operations.mdc`
- [ ] 存在 `.cursor/rules/multi-instance-deployment.mdc`
- [ ] 存在 `.cursor/rules/global-menu-architecture.mdc`
- [ ] `.cursor/rules/README.md` 已更新为 32 个规则

## 🚀 部署检查

### 开发环境

- [ ] `dotnet run --project Platform.AppHost` 正常启动
- [ ] Aspire Dashboard 可访问：http://localhost:15003
- [ ] 管理后台可访问：http://localhost:15001
- [ ] API 网关可访问：http://localhost:15000
- [ ] API 文档可访问：http://localhost:15000/scalar/v1

### 生产环境准备

- [ ] Docker 镜像构建成功
- [ ] 环境变量配置完整
- [ ] MongoDB 连接字符串正确
- [ ] JWT SecretKey 已配置
- [ ] CORS 配置适合生产环境
- [ ] 日志级别适合生产环境

## 🎯 性能验证

### 启动性能

- [ ] 首次启动（空数据库）< 5秒
- [ ] 后续启动 < 1秒
- [ ] 多实例并发启动安全无冲突

### 运行性能

- [ ] 用户注册 < 1秒
- [ ] 用户登录 < 0.5秒
- [ ] 获取菜单 < 100ms
- [ ] API 响应正常

## 🔐 安全检查

### 数据隔离

- [ ] 不同企业数据完全隔离
- [ ] 无法跨企业访问数据
- [ ] 菜单虽是全局，但通过权限控制

### 权限系统

- [ ] 权限检查正常工作
- [ ] 无权限时返回 403
- [ ] 权限与菜单对应正确

## 📊 验收结论

### 检查结果

- 总检查项：约 70 项
- 通过项：_____ 项
- 失败项：_____ 项
- 通过率：_____ %

### 验收决定

- [ ] ✅ 通过验收，可以发布
- [ ] ⚠️ 有小问题，但可接受
- [ ] ❌ 不通过，需要修复

### 备注

```
___________________________________________________
___________________________________________________
___________________________________________________
```

---

**检查人签名**: __________  
**日期**: __________  
**状态**: [ ] 通过 [ ] 不通过

