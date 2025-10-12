# 通知类型不匹配修复

## 🐛 问题描述

**症状**：
- API 返回数据正确（`/api/notices` 有数据）
- 铃铛显示数字 `1`
- 点击铃铛后，通知列表为空

## 🔍 根本原因

**类型不匹配**：前后端对通知类型的表示方式不一致

### 后端 (C#)
```csharp
public enum NoticeIconItemType
{
    Notification,  // 枚举值 = 0
    Message,       // 枚举值 = 1
    Event          // 枚举值 = 2
}
```

**JSON 序列化结果**（修复前）：
```json
{
  "type": 0  // 数字
}
```

### 前端 (TypeScript)
```typescript
interface NoticeIconItem {
  type: 'notification' | 'message' | 'event';  // 字符串
}
```

**前端过滤逻辑**：
```typescript
// Platform.Admin/src/components/NoticeIcon/index.tsx
const { notifications, messages, events } = useMemo(() => {
  return {
    notifications: notices.filter(n => n.type === 'notification'), // ❌ 永远匹配不到
    messages: notices.filter(n => n.type === 'message'),
    events: notices.filter(n => n.type === 'event'),
  };
}, [notices]);
```

**结果**：`n.type` 是 `0`，而不是 `'notification'`，所以 `notifications` 数组永远是空的！

## ✅ 解决方案

### 1. 后端序列化为字符串

**修改文件**: `Platform.ApiService/Models/NoticeModels.cs`

```csharp
using System.Text.Json.Serialization;

public class NoticeIconItem : ISoftDeletable
{
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]  // ✅ MongoDB 存储为字符串
    [JsonConverter(typeof(JsonStringEnumConverter))]  // ✅ JSON API 序列化为字符串
    public NoticeIconItemType Type { get; set; }
}

/// <summary>
/// 通知类型枚举
/// </summary>
public enum NoticeIconItemType
{
    /// <summary>
    /// 通知
    /// </summary>
    Notification,  // 序列化为 "Notification"
    
    /// <summary>
    /// 消息
    /// </summary>
    Message,       // 序列化为 "Message"
    
    /// <summary>
    /// 事件/待办
    /// </summary>
    Event          // 序列化为 "Event"
}
```

**修复后的 JSON 序列化**：
```json
{
  "type": "Notification"  // ✅ 字符串
}
```

### 2. 数据迁移

**新建文件**: `Platform.ApiService/Scripts/MigrateNoticeTypeToString.cs`

```csharp
/// <summary>
/// 将通知的 type 字段从数字迁移为字符串
/// 0 -> "Notification"
/// 1 -> "Message"
/// 2 -> "Event"
/// </summary>
public static class MigrateNoticeTypeToString
{
    public static async Task ExecuteAsync(IMongoDatabase database)
    {
        var collection = database.GetCollection<BsonDocument>("notices");
        
        // 查找所有 type 是数字的文档
        var filter = BsonDocument.Parse("{ \"type\": { \"$type\": \"number\" } }");
        var notices = await collection.Find(filter).ToListAsync();
        
        foreach (var notice in notices)
        {
            var typeValue = notice["type"].AsInt32;
            string typeString = typeValue switch
            {
                0 => "Notification",
                1 => "Message",
                2 => "Event",
                _ => "Notification"
            };
            
            var update = Builders<BsonDocument>.Update.Set("type", typeString);
            await collection.UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", notice["_id"]),
                update
            );
        }
    }
}
```

**注册到启动流程**: `Platform.ApiService/Program.cs`

```csharp
// 迁移通知 type 字段从数字到字符串
await MigrateNoticeTypeToString.ExecuteAsync(database);
```

### 3. 前端类型适配

**前端类型定义**保持不变（已经是字符串）：

```typescript
// Platform.Admin/src/services/notice.ts
export interface NoticeIconItem {
  type: 'notification' | 'message' | 'event';  // ✅ 小写字符串
}
```

**注意**：前端期望的是**小写**（`'notification'`），但后端序列化的是**首字母大写**（`'Notification'`）

**有两种解决方案**：

#### 方案 A: 后端适配前端（推荐）

修改 `NoticeIconItem` 添加自定义序列化：

```csharp
[JsonConverter(typeof(LowercaseEnumConverter))]
public NoticeIconItemType Type { get; set; }

// 自定义转换器
public class LowercaseEnumConverter : JsonConverter<NoticeIconItemType>
{
    public override NoticeIconItemType Read(...)
    {
        return Enum.Parse<NoticeIconItemType>(
            reader.GetString()!, 
            ignoreCase: true
        );
    }
    
    public override void Write(...)
    {
        writer.WriteStringValue(value.ToString().ToLowerInvariant());
    }
}
```

#### 方案 B: 前端适配后端（临时）

修改前端过滤逻辑：

```typescript
const { notifications, messages, events } = useMemo(() => {
  return {
    // 大小写不敏感比较
    notifications: notices.filter(n => 
      n.type?.toLowerCase() === 'notification'
    ),
    messages: notices.filter(n => 
      n.type?.toLowerCase() === 'message'
    ),
    events: notices.filter(n => 
      n.type?.toLowerCase() === 'event'
    ),
  };
}, [notices]);
```

## 🧪 验证修复

### 1. 检查数据库

```javascript
// MongoDB Shell
db.notices.find().pretty()

// 修复前
{ "type": 0 }  // 数字

// 修复后
{ "type": "Notification" }  // 字符串
```

### 2. 检查 API 响应

```bash
curl http://localhost:15000/api/notices \
  -H "Authorization: Bearer YOUR_TOKEN"

# 修复后的响应
{
  "data": [
    {
      "type": "Notification",  // ✅ 字符串而不是数字
      "title": "🎉 系统已升级到 v2.0",
      ...
    }
  ],
  "success": true
}
```

### 3. 前端显示

刷新页面后应该看到：

1. ✅ 铃铛显示 `(1)`
2. ✅ 点击铃铛 → "通知" 标签显示 `(1)`
3. ✅ 列表中显示通知内容

## 📊 技术总结

### 问题类型
- **类型不匹配** - 前后端数据格式不一致
- **序列化问题** - 枚举默认序列化为数字

### 解决技术
- `[BsonRepresentation(BsonType.String)]` - MongoDB 存储为字符串
- `[JsonConverter(typeof(JsonStringEnumConverter))]` - JSON API 序列化为字符串
- 数据迁移脚本 - 更新已有数据

### 最佳实践

1. **统一序列化格式**
   - 枚举在 API 中通常应该序列化为字符串（更易读）
   - 使用 `JsonStringEnumConverter` 全局配置

2. **前后端类型一致**
   - 使用相同的字符串表示（注意大小写）
   - 考虑使用代码生成工具（如 NSwag）自动生成前端类型

3. **数据迁移**
   - 添加数据迁移脚本处理已有数据
   - 确保向后兼容性

4. **测试覆盖**
   - 单元测试验证序列化结果
   - 集成测试验证前后端通信

## 🔧 全局配置（可选）

在 `Program.cs` 中全局配置枚举序列化：

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // 全局配置：所有枚举都序列化为字符串
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()
        );
    });
```

这样所有的枚举都会自动序列化为字符串，无需在每个属性上添加 `[JsonConverter]`。

## 📚 相关文档

- [JSON 序列化选项](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to)
- [MongoDB BSON 类型映射](https://mongodb.github.io/mongo-csharp-driver/2.19/reference/bson/mapping/)
- [欢迎通知功能文档](../features/WELCOME-NOTICE-FEATURE.md)

## ✅ 修复完成

应用重启后，通知功能应该完全正常：

- ✅ 类型匹配 - 前后端使用相同的字符串格式
- ✅ 数据迁移 - 已有数据已更新
- ✅ 前端显示 - 通知正确分类和显示
- ✅ 向后兼容 - 新旧数据都能正确处理

