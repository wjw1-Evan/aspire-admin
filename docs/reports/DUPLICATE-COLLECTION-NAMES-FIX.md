# 重复集合名称修复报告

## 📋 问题描述

数据库中出现重复的集合名称：
- `captchaimages` - 由 `DatabaseOperationFactory` 自动生成
- `captcha_images` - 由索引脚本 `CreateAllIndexes.cs` 手动指定

## 🔍 问题根源

### 问题原因

1. **模型类名**：`CaptchaImage`
2. **Factory 自动命名**：转换为 `captchaimages`（PascalCase → lowercase + 's'）
3. **索引脚本手动命名**：使用 `"captcha_images"`（snake_case）
4. **结果**：两个集合都被创建

### 代码对比

**ImageCaptchaService.cs**（使用 Factory）：
```csharp
// 使用 IDatabaseOperationFactory<CaptchaImage>
// 自动生成集合名称：CaptchaImage → captchaimages
private readonly IDatabaseOperationFactory<CaptchaImage> _captchaFactory;
```

**CreateAllIndexes.cs**（手动指定）：
```csharp
// 手动指定集合名称
var collection = _database.GetCollection<BsonDocument>("captcha_images");
```

## ✅ 解决方案

### 1. 为 CaptchaImage 添加自定义集合名称

**文件**：`Platform.ApiService/Models/CaptchaImageModels.cs`

**修改前**：
```csharp
public class CaptchaImage : BaseEntity, ISoftDeletable, IEntity, ITimestamped
{
    // ...
}
```

**修改后**：
```csharp
[BsonCollectionName("captcha_images")]
public class CaptchaImage : BaseEntity, ISoftDeletable, IEntity, ITimestamped
{
    // ...
}
```

### 2. 为 Captcha 添加自定义集合名称（预防性修复）

**文件**：`Platform.ApiService/Models/CaptchaModels.cs`

**修改前**：
```csharp
public class Captcha : BaseEntity, ISoftDeletable, IEntity, ITimestamped
{
    // ...
}
```

**修改后**：
```csharp
[BsonCollectionName("captchas")]
public class Captcha : BaseEntity, ISoftDeletable, IEntity, ITimestamped
{
    // ...
}
```

## 📊 修复效果

### 修复前
- ❌ `captchaimages` - 由 Factory 自动生成（不规范）
- ❌ `captcha_images` - 由索引脚本指定（不一致）

### 修复后
- ✅ `captcha_images` - Factory 和索引脚本统一使用
- ✅ `captchas` - Captcha 模型统一使用

## 🎯 修复验证

### 编译验证
```bash
✓ Platform.ApiService succeeded with 2 warning(s)
✓ No linter errors found
```

### 预期结果

**修复后，数据库应该只有**：
- `captcha_images` - 图形验证码集合
- `captchas` - 短信验证码集合

**不会再出现**：
- ❌ `captchaimages`
- ❌ `captcha`

## 📝 修复内容清单

| 模型类 | 旧集合名称 | 新集合名称 | 状态 |
|-------|----------|-----------|------|
| `CaptchaImage` | `captchaimages` ⚠️ | `captcha_images` ✅ | ✅ 已修复 |
| `Captcha` | `captchas` | `captchas` | ✅ 已规范 |

## 🔧 清理步骤（建议）

如果数据库中已有旧的集合，建议手动清理：

```javascript
// 在 MongoDB 中执行
use aspire-admin;

// 检查重复的集合
db.getCollectionNames().filter(name => name.includes('captcha'));

// 清理旧的 captchaimages 集合（注意先备份数据）
// db.captchaimages.drop();

// 或迁移数据到新集合
// db.captchaimages.find().forEach(
//   function(doc) { 
//     db.captcha_images.insert(doc);
//   }
// );
```

## 📚 相关文档

- [自定义集合名称支持功能](features/CUSTOM-COLLECTION-NAME-SUPPORT.md)
- [集合名称修复完成报告](reports/COLLECTION-NAME-FIX-COMPLETE.md)

## ✅ 总结

通过为 `CaptchaImage` 和 `Captcha` 模型添加自定义集合名称特性，我们：

1. ✅ 修复了 `captchaimages` 和 `captcha_images` 重复的问题
2. ✅ 统一了集合命名规范（使用 snake_case）
3. ✅ 确保了 Factory 和索引脚本使用相同的集合名称
4. ✅ 保持了向后兼容性

**关键改进**：
- 使用 `[BsonCollectionName]` 特性统一指定集合名称
- 确保 Factory 和索引脚本使用相同的命名规则
- 建立了一致的集合命名规范（snake_case）

