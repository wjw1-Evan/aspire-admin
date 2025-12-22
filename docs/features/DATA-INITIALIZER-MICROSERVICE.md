# 数据初始化微服务说明

> 本文档说明 `Platform.DataInitializer` 微服务的作用、运行机制和使用方式。

## 📋 概述

`Platform.DataInitializer` 是一个独立的微服务，负责在系统启动时执行必要的数据库初始化操作。它会在所有其他服务启动之前运行，确保数据库索引和系统菜单已正确创建。

## 🎯 主要职责

### 1. 创建数据库索引

为所有集合创建必要的索引，提升查询性能：

- **用户集合**：用户名、邮箱、手机号等唯一索引
- **企业集合**：企业名称、企业代码等索引
- **角色集合**：角色名称、企业ID等索引
- **菜单集合**：菜单名称、父菜单ID等索引
- **日志集合**：用户ID、操作时间等索引
- **其他业务集合**：根据业务需求创建相应索引

### 2. 同步全局系统菜单

创建和同步全局系统菜单，确保所有企业都能访问基础功能：

- **欢迎页菜单**：系统首页
- **系统管理菜单**：用户管理、角色管理、企业设置等
- **其他全局菜单**：根据系统功能动态添加

## 🏗 架构设计

### 服务特点

1. **幂等性**：可以安全地多次运行，不会重复创建索引或菜单
2. **单实例运行**：无需分布式锁，设计为单实例运行
3. **优雅停止**：初始化完成后自动停止，不占用资源
4. **增量同步**：菜单按名称识别，已存在的菜单不会重复创建

### 运行流程

```
启动 → 连接 MongoDB → 创建索引 → 同步菜单 → 记录统计 → 优雅停止
```

## 📝 菜单同步机制

### 菜单定义

菜单在 `DataInitializerService.GetExpectedMenus()` 方法中定义：

```csharp
private List<Menu> GetExpectedMenus(DateTime now)
{
    var menus = new List<Menu>();
    
    // 顶级菜单
    menus.Add(new Menu
    {
        Name = "welcome",
        Title = "欢迎",
        Path = "/welcome",
        Component = "./Welcome",
        Icon = "smile",
        SortOrder = 1,
        IsEnabled = true
    });
    
    // 子菜单
    menus.Add(new Menu
    {
        Name = "user-management",
        Title = "用户管理",
        Path = "/system/user-management",
        Component = "./user-management",
        Icon = "user",
        ParentId = "system", // 父菜单名称
        SortOrder = 1
    });
    
    return menus;
}
```

### 同步逻辑

1. **处理顶级菜单**：先创建所有无 `ParentId` 的菜单
2. **建立映射关系**：记录菜单名称到ID的映射
3. **处理子菜单**：使用父菜单名称查找ID，设置 `ParentId`
4. **增量更新**：已存在的菜单检查 `ParentId` 是否正确，必要时更新

### 菜单特性

- **全局资源**：菜单是全局资源，没有 `CompanyId`
- **权限控制**：企业通过角色的 `MenuIds` 控制可见菜单
- **按名称识别**：使用 `Name` 字段识别菜单，避免重复创建

## 🚀 使用方式

### 自动启动

在 `Platform.AppHost` 中，`DataInitializer` 会自动启动：

```csharp
var dataInitializer = builder.AddProject<Projects.Platform_DataInitializer>("data-initializer")
    .WithReference(mongoDb)
    .AsHttpService();
```

### 手动运行

如果需要手动运行初始化：

```bash
cd Platform.DataInitializer
dotnet run
```

### 查看日志

初始化过程的详细信息会记录在日志中：

```
========== 开始数据初始化 ==========
开始创建数据库索引...
✅ 创建索引: users.username
✅ 创建索引: users.email
...
数据库索引创建完成
开始同步全局系统菜单...
✅ 创建菜单: welcome (欢迎)
✅ 创建菜单: system (系统管理)
✅ 创建菜单: user-management (用户管理)，父菜单: system
...
========== 数据初始化完成 ==========
🎉 所有数据库索引和系统菜单已成功创建
✅ DataInitializer 任务完成，服务可以安全停止
```

## 🔧 添加新菜单

### 步骤

1. **编辑 `DataInitializerService.cs`**
2. **在 `GetExpectedMenus()` 方法中添加菜单定义**
3. **重启服务**：服务会自动检测并创建新菜单

### 示例

```csharp
// 添加新的顶级菜单
menus.Add(new Menu
{
    Name = "new-feature",
    Title = "新功能",
    Path = "/new-feature",
    Component = "./NewFeature",
    Icon = "star",
    SortOrder = 10,
    IsEnabled = true,
    IsDeleted = false,
    CreatedAt = now,
    UpdatedAt = now
});

// 添加子菜单
menus.Add(new Menu
{
    Name = "new-feature-sub",
    Title = "子功能",
    Path = "/new-feature/sub",
    Component = "./NewFeature/Sub",
    Icon = "sub",
    ParentId = "new-feature", // 父菜单名称
    SortOrder = 1,
    IsEnabled = true,
    IsDeleted = false,
    CreatedAt = now,
    UpdatedAt = now
});
```

## 📊 索引管理

### 索引创建脚本

索引创建逻辑在 `Platform.DataInitializer/Scripts/CreateAllIndexes.cs` 中：

```csharp
public class CreateAllIndexes
{
    public async Task ExecuteAsync()
    {
        // 用户集合索引
        await CreateUserIndexesAsync();
        
        // 企业集合索引
        await CreateCompanyIndexesAsync();
        
        // 角色集合索引
        await CreateRoleIndexesAsync();
        
        // ... 其他集合索引
    }
}
```

### 添加新索引

1. **编辑 `CreateAllIndexes.cs`**
2. **添加索引创建方法**
3. **在 `ExecuteAsync()` 中调用**

### 索引类型

- **唯一索引**：确保字段值唯一（如用户名、邮箱）
- **复合索引**：多个字段组合索引（如企业ID + 状态）
- **文本索引**：全文搜索（如内容搜索）
- **TTL索引**：自动删除过期数据（如临时数据）

## ⚠️ 注意事项

1. **幂等性保证**：确保所有操作都是幂等的，可以安全重复执行
2. **菜单名称唯一性**：菜单 `Name` 必须全局唯一
3. **父菜单依赖**：子菜单的 `ParentId` 必须指向已存在的父菜单
4. **索引命名**：索引名称应清晰描述其用途
5. **性能考虑**：大量数据时，索引创建可能需要较长时间

## 🔍 故障排查

### 问题：菜单未创建

**可能原因**：
- 菜单定义中的 `Name` 与现有菜单冲突
- 父菜单不存在或名称错误
- 数据库连接失败

**解决方法**：
- 检查日志中的错误信息
- 确认菜单名称唯一性
- 检查父菜单是否正确创建

### 问题：索引创建失败

**可能原因**：
- 索引定义冲突（如重复的唯一索引）
- 数据中存在违反唯一约束的记录
- MongoDB 连接问题

**解决方法**：
- 检查现有数据是否符合索引约束
- 清理冲突数据
- 检查 MongoDB 连接状态

## 📚 相关文档

- [后端核心与中间件规范](BACKEND-RULES.md)
- [数据访问工厂使用指南](DATABASE-OPERATION-FACTORY-GUIDE.md)
