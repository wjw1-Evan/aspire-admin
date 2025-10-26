# 集合名称修复完成报告

## 📋 任务概述

修复了后端 Model 定义与数据库集合名称不匹配的问题，特别是 `UserCompany` 模型集合名称不规范的问题。

## ✨ 完成的工作

### 1. 创建 BsonCollectionName 特性类

**文件**：`Platform.ServiceDefaults/Attributes/BsonCollectionNameAttribute.cs`

新增特性类，支持在模型上指定自定义集合名称：

```csharp
[BsonCollectionName("user_companies")]
public class UserCompany : BaseEntity
{
    // ...
}
```

### 2. 修改 DatabaseOperationFactory 支持自定义集合名称

**文件**：`Platform.ServiceDefaults/Services/DatabaseOperationFactory.cs`

**改动**：
- 添加了 `System.Reflection` 命名空间引用
- 添加了 `Platform.ServiceDefaults.Attributes` 命名空间引用
- 修改构造函数，优先使用 `BsonCollectionName` 特性指定的名称
- 向后兼容，未指定特性时仍使用默认命名规则

**代码变更**：
```diff
- var collectionName = typeof(T).Name.ToLowerInvariant() + "s";
+ var collectionNameAttribute = typeof(T).GetCustomAttribute<BsonCollectionNameAttribute>();
+ var collectionName = collectionNameAttribute?.Name ?? typeof(T).Name.ToLowerInvariant() + "s";
```

### 3. 修复 UserCompany 集合名称

**文件**：`Platform.ApiService/Models/UserCompanyModels.cs`

**改动**：
- 添加了 `Platform.ServiceDefaults.Attributes` 命名空间引用
- 在 `UserCompany` 类上添加 `[BsonCollectionName("user_companies")]` 特性
- 更新了类注释，标注了 v6.1 版本变更

**集合名称变更**：
- 旧：`usercompanys` ⚠️ 复数形式不规范
- 新：`user_companies` ✅ 符合英语复数规则和命名规范

### 4. 创建功能文档

**文件**：`docs/features/CUSTOM-COLLECTION-NAME-SUPPORT.md`

详细记录了：
- 功能实现细节
- 使用方法
- 集合命名规范建议
- 后续优化建议
- 数据迁移方案

## 📊 集合名称对照表

| 模型类型 | 旧集合名称 | 新集合名称 | 状态 |
|---------|----------|-----------|------|
| `UserCompany` | `usercompanys` | `user_companies` | ✅ 已修复 |

**注意**：其他集合名称暂时保持原样，如有需要可以后续优化。

## ✅ 验证结果

### 编译测试

```bash
# Platform.ServiceDefaults
✓ Build succeeded with 2 warning(s) in 1.8s

# Platform.ApiService
✓ Build succeeded with 2 warning(s) in 1.3s
```

**警告说明**：
- ServiceDefaults 的警告：使用了已废弃的 `Render` 方法（不影响功能）
- ApiService 的警告：可能的空引用（现有警告，非本次引入）

### 代码检查

✓ 无 Linter 错误  
✓ 所有文件编译通过  
✓ 向后兼容性保持  

## 🎯 影响范围

### 已确认无影响的地方

1. **Scripts**：`FixMissingUserCompanyRecords.cs` 已使用正确的集合名称 `user_companies`
2. **向后兼容**：未使用特性的模型仍按原规则命名
3. **现有数据**：不影响已存在的数据，可逐步迁移

### 需要注意的事项

1. **数据库迁移**：如果已有 `usercompanys` 集合，需要将其重命名为 `user_companies`
2. **逐步迁移**：可以根据需要，逐步为其他模型添加自定义集合名称

## 📚 相关文档

- [自定义集合名称支持功能](features/CUSTOM-COLLECTION-NAME-SUPPORT.md)
- [数据库操作工厂使用规范](features/DATABASE-OPERATION-FACTORY-GUIDE.md)
- [BaseApiController 统一标准](BASEAPICONTROLLER-STANDARDIZATION.md)

## 🔮 后续计划

### 建议的集合名称优化

可以考虑为以下模型添加自定义集合名称，以符合命名规范：

| 模型类型 | 当前集合名称 | 建议新名称 |
|---------|-------------|-----------|
| `NoticeIconItem` | `noticeiconitems` | `notice_icon_items` |
| `TagItem` | `tagitems` | `tag_items` |
| `RuleListItem` | `rulelistitems` | `rule_list_items` |
| `UserActivityLog` | `useractivitylogs` | `user_activity_logs` |
| `CompanyJoinRequest` | `companyjoinrequests` | `company_join_requests` |

### 命名规范建议

1. **使用 Snake Case**：单词之间用下划线分隔
2. **使用复数形式**：集合名称应该是复数
3. **简短且有意义**：避免过长的集合名称
4. **与业务领域保持一致**

## ✅ 总结

通过本次修复，我们：

1. ✅ 修复了 `UserCompany` 集合名称不规范的问题
2. ✅ 引入了自定义集合名称的机制
3. ✅ 保持了向后兼容性
4. ✅ 为后续集合命名优化奠定了基础
5. ✅ 创建了完整的功能文档

**主要改进**：
- 支持自定义集合名称，解决了自动命名不规范的问题
- 修复了 `usercompanys` → `user_companies` 的命名问题
- 建立了可扩展的命名机制

**下一步**：
- 根据实际需要，逐步优化其他模型的集合名称
- 建立统一的集合命名规范文档

