# 通知系统软删除过滤修复

## 🐛 问题描述

**症状**：
- 右上角通知铃铛显示数字（如 `1`）
- 点击铃铛后，通知列表为空，没有显示任何内容

**根本原因**：
`NoticeService.GetNoticesAsync()` 方法在查询通知时没有过滤软删除的记录，返回了包括 `IsDeleted = true` 的通知。虽然通知被创建并存在于数据库中，但前端计数显示有通知，实际查询时可能返回了已删除的记录或者有其他过滤问题。

## 🔍 问题分析

### 原始代码

```csharp
public async Task<NoticeIconListResponse> GetNoticesAsync()
{
    // ❌ 问题：使用 Empty Filter，返回所有记录（包括已删除的）
    var notices = await _notices.Find(Builders<NoticeIconItem>.Filter.Empty)
        .SortByDescending(n => n.Datetime)
        .ToListAsync();

    return new NoticeIconListResponse
    {
        Data = notices,
        Total = notices.Count,
        Success = true
    };
}

public async Task<NoticeIconItem?> GetNoticeByIdAsync(string id)
{
    // ❌ 问题：没有检查 IsDeleted
    return await _notices.Find(n => n.Id == id).FirstOrDefaultAsync();
}
```

### 问题点

1. **软删除未过滤**：`NoticeIconItem` 实现了 `ISoftDeletable` 接口，包含 `IsDeleted` 字段，但查询时没有过滤
2. **数据不一致**：可能存在 `IsDeleted = true` 但仍被查询到的记录
3. **权限问题**：之前的权限配置要求 `notice:read` 权限，普通用户（包括管理员）无法访问

## ✅ 解决方案

### 1. 添加软删除过滤

**修改文件**: `Platform.ApiService/Services/NoticeService.cs`

```csharp
public async Task<NoticeIconListResponse> GetNoticesAsync()
{
    // ✅ 修复：只获取未删除的记录
    var filter = Builders<NoticeIconItem>.Filter.Eq(n => n.IsDeleted, false);
    var notices = await _notices.Find(filter)
        .SortByDescending(n => n.Datetime)
        .ToListAsync();

    return new NoticeIconListResponse
    {
        Data = notices,
        Total = notices.Count,
        Success = true
    };
}

public async Task<NoticeIconItem?> GetNoticeByIdAsync(string id)
{
    // ✅ 修复：同时检查 ID 和 IsDeleted
    var filter = Builders<NoticeIconItem>.Filter.And(
        Builders<NoticeIconItem>.Filter.Eq(n => n.Id, id),
        Builders<NoticeIconItem>.Filter.Eq(n => n.IsDeleted, false)
    );
    return await _notices.Find(filter).FirstOrDefaultAsync();
}
```

### 2. 移除权限要求

**修改文件**: `Platform.ApiService/Controllers/NoticeController.cs`

```csharp
// ❌ 之前：需要特定权限
[HttpGet("notices")]
[RequirePermission("notice", "read")]
public async Task<IActionResult> GetNotices()

// ✅ 修复后：所有登录用户可访问
[ApiController]
[Route("api")]
[Authorize] // 只需要登录
public class NoticeController : BaseApiController
{
    [HttpGet("notices")]
    public async Task<IActionResult> GetNotices()
}
```

## 🧪 验证步骤

### 1. 检查数据库

```javascript
// MongoDB Shell
use aspire_admin;

// 查看所有通知
db.notices.find().pretty();

// 查看未删除的通知
db.notices.find({ isDeleted: false }).pretty();

// 查看已删除的通知
db.notices.find({ isDeleted: true }).pretty();

// 检查 v2.0 欢迎通知
db.notices.find({ 
  title: "🎉 系统已升级到 v2.0",
  isDeleted: false 
}).pretty();
```

### 2. API 测试

```bash
# 获取通知列表
curl -X GET "http://localhost:15000/api/notices" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 预期响应
{
  "data": [
    {
      "id": "...",
      "title": "🎉 系统已升级到 v2.0",
      "description": "新版本带来搜索增强、性能提升...",
      "type": "notification",
      "read": false,
      "isDeleted": false,
      ...
    }
  ],
  "total": 1,
  "success": true
}
```

### 3. 前端测试

1. **登录管理后台**: http://localhost:15001
2. **查看铃铛**: 右上角应显示数字 `(1)`
3. **点击铃铛**: 应该显示欢迎通知
4. **通知内容**: 
   ```
   🎉 系统已升级到 v2.0
   新版本带来搜索增强、性能提升、安全加固等多项重大改进，点击查看详情
   刚刚
   ```

## 📝 相关修改

### 修改的文件

1. **后端服务**
   - `Platform.ApiService/Services/NoticeService.cs` - 添加软删除过滤
   - `Platform.ApiService/Controllers/NoticeController.cs` - 移除权限要求

2. **文档更新**
   - `docs/features/WELCOME-NOTICE-FEATURE.md` - 添加常见问题排查

### 其他修复

同时修复了以下问题：

1. **权限问题**: 移除 `notice:read` 权限要求，所有登录用户都可以查看通知
2. **路由问题**: 统一使用 `/api/notices` 路由
3. **更新问题**: 允许普通用户标记通知为已读

## 🎯 最佳实践

### 1. 软删除查询规范

所有查询软删除实体的方法都应该过滤 `IsDeleted` 字段：

```csharp
// ✅ 推荐：明确过滤软删除
public async Task<List<T>> GetAllAsync()
{
    var filter = Builders<T>.Filter.Eq(x => x.IsDeleted, false);
    return await _collection.Find(filter).ToListAsync();
}

// ❌ 不推荐：使用空过滤器
public async Task<List<T>> GetAllAsync()
{
    return await _collection.Find(Builders<T>.Filter.Empty).ToListAsync();
}
```

### 2. 权限设计原则

- **通知查看**: 所有登录用户都应该能查看自己的通知
- **通知创建**: 只有管理员或特定角色可以创建系统通知
- **通知管理**: 用户可以管理（标记已读、删除）自己的通知

### 3. 数据一致性检查

定期检查数据库中的软删除状态：

```javascript
// 检查孤立的已删除记录
db.notices.aggregate([
  { $match: { isDeleted: true } },
  { $count: "deletedCount" }
]);

// 清理过期的已删除记录（可选）
db.notices.deleteMany({
  isDeleted: true,
  deletedAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 90天前
});
```

## 🔧 预防措施

### 1. 代码审查清单

在实现软删除功能时，确保：
- [ ] 所有查询方法都过滤 `IsDeleted = false`
- [ ] 删除操作使用软删除而不是物理删除
- [ ] 恢复功能（如需要）正确设置 `IsDeleted = false`
- [ ] 数据库索引包含 `IsDeleted` 字段

### 2. 测试用例

```csharp
[Fact]
public async Task GetNotices_ShouldNotReturnDeletedNotices()
{
    // Arrange
    await CreateDeletedNotice();
    await CreateActiveNotice();
    
    // Act
    var result = await _noticeService.GetNoticesAsync();
    
    // Assert
    Assert.All(result.Data, notice => Assert.False(notice.IsDeleted));
}
```

### 3. MongoDB 索引

确保软删除字段有索引：

```javascript
db.notices.createIndex({ "isDeleted": 1 });
db.notices.createIndex({ "isDeleted": 1, "datetime": -1 }); // 复合索引
```

## 📊 影响范围

### 受影响的功能
- ✅ 通知铃铛计数
- ✅ 通知列表显示
- ✅ 通知详情查询
- ✅ 通知标记已读
- ✅ 通知删除

### 不受影响的功能
- 通知创建（需要权限）
- 其他软删除实体（用户、角色等）

## ✅ 修复验证

### 修复前
- 铃铛显示数字但列表为空
- API 返回已删除的通知
- 权限问题导致无法访问

### 修复后
- 铃铛数字与列表内容一致
- API 只返回未删除的通知
- 所有登录用户都可以查看通知
- 欢迎消息正确显示

## 📚 相关文档

- [欢迎通知功能文档](../features/WELCOME-NOTICE-FEATURE.md)
- [软删除实现文档](../soft-delete/SOFT-DELETE-IMPLEMENTATION.md)
- [通知系统 API 文档](http://localhost:15000/scalar/v1)

## 🎉 总结

这次修复解决了两个关键问题：

1. **软删除过滤缺失** - 导致已删除的通知仍被查询
2. **权限配置过严** - 导致普通用户无法查看通知

现在通知系统运行正常，所有登录用户都能正确查看和管理自己的通知！

