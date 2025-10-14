# 数据库清理指南 - v6.0权限系统重构

## ⚠️ 重要提示

v6.0权限系统重构后，数据结构发生重大变更，**必须删除旧数据库重新初始化**。

## 🗑️ 清理步骤

### 方法1: 使用MongoDB Shell（推荐）

```bash
# 1. 连接MongoDB
mongo aspire-admin

# 2. 删除数据库
> db.dropDatabase()

# 3. 验证删除
> show dbs

# 4. 退出
> exit
```

### 方法2: 使用MongoDB Compass

1. 打开MongoDB Compass
2. 连接到 `mongodb://localhost:27017`
3. 找到 `aspire-admin` 数据库
4. 右键点击数据库名称
5. 选择 "Drop Database"
6. 确认删除

### 方法3: 使用Mongo Express（Web界面）

1. 访问 http://localhost:8081
2. 点击 `aspire-admin` 数据库
3. 点击页面顶部的 "Delete Database" 按钮
4. 确认删除

## 🔄 重新初始化

### 启动系统

```bash
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet run --project Platform.AppHost
```

### 自动初始化内容

系统启动时会自动创建：

1. **数据库索引**
   - users集合索引
   - roles集合索引
   - menus集合索引
   - notices集合索引
   - activityLogs集合索引
   - companies集合索引
   - userCompanies集合索引

2. **全局菜单（4个）**
   - welcome - 欢迎页
   - user-management - 用户管理
   - role-management - 角色管理
   - user-log - 用户日志
   - company-settings - 企业设置

3. **用户注册时自动创建**
   - 个人企业
   - 管理员角色（拥有所有菜单权限）
   - 用户-企业关联

## 🧪 验证初始化

### 1. 检查菜单创建

```bash
mongo aspire-admin
> db.menus.countDocuments()
# 应该返回: 6（2个父菜单 + 4个子菜单）

> db.menus.find({}, {name: 1, title: 1})
# 应该看到所有菜单
```

### 2. 注册测试用户

```bash
curl -X POST http://localhost:15000/apiservice/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456",
    "email": "test@example.com"
  }'
```

### 3. 检查角色创建

```bash
> db.roles.find({}, {name: 1, menuIds: 1})
# 应该看到管理员角色，包含所有菜单ID
```

### 4. 登录测试

访问 http://localhost:15001 使用新注册的用户登录，应该能看到所有菜单。

## 🚨 常见问题

### Q: 启动时报错 "permissions collection not found"

A: 正常现象。Permission集合已经被完全移除，如果看到相关错误，忽略即可。

### Q: 用户看不到任何菜单

A: 检查：
1. 数据库中是否有菜单数据: `db.menus.countDocuments()`
2. 用户的角色是否有menuIds: `db.roles.find({})`
3. 检查日志中的菜单创建信息

### Q: API返回403错误

A: 这是正常的权限验证：
- 检查用户的角色是否有对应菜单权限
- 查看 `db.roles` 中的 `menuIds` 字段
- 确认菜单名称与Controller中的RequireMenu参数一致

### Q: 能否回退到v5.0？

A: 可以，但需要：
1. 使用git恢复代码到v5.0版本
2. 删除数据库
3. 使用v5.0重新初始化

## 📋 清理检查清单

启动新系统前，确保：

- [ ] 已删除旧数据库（`db.dropDatabase()`）
- [ ] 已停止旧版本的服务
- [ ] 已更新代码到v6.0
- [ ] 已阅读 [V6-REFACTORING-SUMMARY.md](V6-REFACTORING-SUMMARY.md)
- [ ] 已阅读 [菜单级权限使用指南](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md)

## 🎯 启动新系统

```bash
# 1. 删除数据库
mongo aspire-admin --eval "db.dropDatabase()"

# 2. 启动系统
dotnet run --project Platform.AppHost

# 3. 等待初始化完成（查看日志）
# 应该看到:
# - "数据库索引创建完成"
# - "全局系统菜单创建完成（6 个）"

# 4. 访问管理后台
# http://localhost:15001

# 5. 注册新用户测试
```

## 📚 相关文档

- [v6.0重构总结](V6-REFACTORING-SUMMARY.md)
- [菜单级权限使用指南](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md)
- [权限系统重构文档](docs/refactoring/MENU-LEVEL-PERMISSION-REFACTORING.md)

---

**注意**: 这是一次破坏性重构，请确保做好数据备份（如有必要）。

