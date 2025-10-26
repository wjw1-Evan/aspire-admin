# 自定义集合名称支持功能

## 📋 概述

为了解决 MongoDB 集合名称自动生成不规范的问题，新增了自定义集合名称的支持机制。

## ✨ 实现内容

### 1. 创建 BsonCollectionName 特性类

**文件**：`Platform.ServiceDefaults/Attributes/BsonCollectionNameAttribute.cs`

```csharp
/// <summary>
/// 自定义 MongoDB 集合名称特性
/// 用于指定实体类对应的数据库集合名称
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
public class BsonCollectionNameAttribute : Attribute
{
    public string Name { get; }
    
    public BsonCollectionNameAttribute(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Collection name cannot be null or empty", nameof(name));
        
        Name = name;
    }
}
```

### 2. 修改 DatabaseOperationFactory 支持自定义集合名称

**文件**：`Platform.ServiceDefaults/Services/DatabaseOperationFactory.cs`

**修改前**：
```csharp
// 使用默认的集合命名约定：类型名转小写复数形式
var collectionName = typeof(T).Name.ToLowerInvariant() + "s";
_collection = database.GetCollection<T>(collectionName);
```

**修改后**：
```csharp
// 支持自定义集合名称，优先使用 BsonCollectionName 特性
var collectionNameAttribute = typeof(T).GetCustomAttribute<BsonCollectionNameAttribute>();
var collectionName = collectionNameAttribute?.Name ?? typeof(T).Name.ToLowerInvariant() + "s";

_collection = database.GetCollection<T>(collectionName);
```

### 3. 为需要自定义集合名称的模型添加特性

**示例**：`UserCompany` 模型

```csharp
using Platform.ServiceDefaults.Attributes;

/// <summary>
/// 用户-企业关联表（多对多关系）
/// v6.1: 使用自定义集合名称修复命名规范问题
/// </summary>
[BsonCollectionName("user_companies")]
public class UserCompany : BaseEntity, IEntity, ISoftDeletable, ITimestamped
{
    // ...
}
```

## 🔧 使用方法

### 基本用法

对于任何模型类，如果需要指定自定义的集合名称，只需添加 `[BsonCollectionName]` 特性：

```csharp
using Platform.ServiceDefaults.Attributes;

[BsonCollectionName("my_custom_collection")]
public class MyModel : BaseEntity
{
    // ...
}
```

### 集合命名约定建议

1. **使用 Snake Case**：单词之间用下划线分隔
   - ✅ `user_companies`
   - ❌ `userCompanies` 或 `usercompanys`

2. **使用复数形式**：集合名称应该是复数
   - ✅ `user_companies`
   - ❌ `user_company`

3. **简短且有意义的名称**：避免过长的集合名称
   - ✅ `notification_items`
   - ❌ `system_notification_icon_items`

## 📊 已修复的问题

### UserCompany 集合名称修复

**问题**：
- 自动生成：`usercompanys`（复数形式不规范）
- 应该：`user_companies`（符合英文复数规则和 Snake Case）

**解决**：
```csharp
[BsonCollectionName("user_companies")]
public class UserCompany : BaseEntity
{
    // ...
}
```

## 🎯 集合名称对照表

| 模型类型 | 旧集合名称 | 新集合名称 | 修复状态 |
|---------|----------|-----------|---------|
| `AppUser` | `appusers` | `appusers` | ✅ 已规范 |
| `Role` | `roles` | `roles` | ✅ 已规范 |
| `Company` | `companies` | `companies` | ✅ 已规范 |
| `Menu` | `menus` | `menus` | ✅ 已规范 |
| `UserCompany` | `usercompanys` ⚠️ | `user_companies` ✅ | ✅ 已修复 |
| `NoticeIconItem` | `noticeiconitems` | `noticeiconitems` | ⚠️ 可优化 |
| `TagItem` | `tagitems` | `tagitems` | ⚠️ 可优化 |
| `RuleListItem` | `rulelistitems` | `rulelistitems` | ⚠️ 可优化 |

## 🔍 后续优化建议

### 1. 批量优化集合名称

对于其他模型，可以考虑添加自定义集合名称以符合命名规范：

```csharp
// 建议的集合名称
[BsonCollectionName("notice_icon_items")]
public class NoticeIconItem : BaseEntity { }

[BsonCollectionName("tag_items")]
public class TagItem : BaseEntity { }

[BsonCollectionName("rule_list_items")]
public class RuleListItem : BaseEntity { }
```

### 2. 建立命名规范文档

建议创建集合命名规范文档，确保团队遵循统一的命名约定：

- 使用 **Snake Case** 格式
- 使用 **复数形式**
- 简短且有意义的名称
- 与业务领域保持一致

### 3. 自动命名规则优化

可以考虑改进默认的自动命名规则，支持更智能的复数形式处理：

```csharp
private string ConvertToSnakeCasePlural(string name)
{
    // 将 PascalCase 转换为 snake_case + 复数形式
    var snakeCase = Regex.Replace(name, @"([A-Z])", "_$1")
        .ToLower()
        .Trim('_');
    
    // 处理复数形式（如 company -> companies）
    // ...
    
    return snakeCase;
}
```

## ✅ 测试验证

### 验证步骤

1. 启动应用，验证 `UserCompany` 模型使用新集合名称 `user_companies`
2. 检查数据库中是否存在 `user_companies` 集合
3. 确认原有的 `usercompanys` 集合不再使用（可以逐步迁移数据）

### 数据迁移（如需要）

如果需要从旧的集合名称迁移到新名称：

```bash
# 在 MongoDB 中重命名集合
db.usercompanys.renameCollection("user_companies")
```

或者在代码中添加迁移脚本：

```csharp
// 检查是否存在旧的集合名称
var oldCollection = database.GetCollection<UserCompany>("usercompanys");
if (await oldCollection.CountDocumentsAsync(FilterDefinition<UserCompany>.Empty) > 0)
{
    // 迁移数据到新集合
    var documents = await oldCollection.Find(FilterDefinition<UserCompany>.Empty).ToListAsync();
    await newCollection.InsertManyAsync(documents);
}
```

## 📚 相关文档

- [数据库操作工厂使用规范](DATABASE-OPERATION-FACTORY-GUIDE.md)
- [BaseApiController 统一标准](BASEAPICONTROLLER-STANDARDIZATION.md)
- [用户注册流程和企业自动创建规范](USER-REGISTRATION-FLOW.md)

## 🎯 总结

通过引入 `BsonCollectionName` 特性，我们解决了集合名称自动生成不规范的问题，使得集合名称可以更灵活地自定义，符合 MongoDB 命名规范。

**主要改进**：
1. ✅ 支持自定义集合名称
2. ✅ 修复 `UserCompany` 集合名称不规范问题
3. ✅ 为后续集合命名优化奠定了基础
4. ✅ 保持向后兼容性

**未来计划**：
1. 逐步优化其他模型的集合名称
2. 建立统一的集合命名规范
3. 考虑实现更智能的自动命名规则

