# 软删除功能快速使用指南

## 快速开始

### 1. 为新实体添加软删除支持

创建新实体时，只需实现 `ISoftDeletable` 接口：

```csharp
using Platform.ApiService.Models;

public class MyEntity : ISoftDeletable
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    
    // 你的业务字段
    public string Name { get; set; } = string.Empty;
    
    // 软删除字段（由接口提供）
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;
    
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }
    
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }
    
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}
```

### 2. 在 Service 中使用软删除

#### 查询时排除已删除数据

```csharp
using Platform.ApiService.Services;

public class MyEntityService
{
    private readonly IMongoCollection<MyEntity> _collection;
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    public MyEntityService(IMongoDatabase database, IHttpContextAccessor httpContextAccessor)
    {
        _collection = database.GetCollection<MyEntity>("my_entities");
        _httpContextAccessor = httpContextAccessor;
    }
    
    private string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }
    
    // 获取所有未删除的实体
    public async Task<List<MyEntity>> GetAllAsync()
    {
        var filter = SoftDeleteExtensions.NotDeleted<MyEntity>();
        return await _collection.Find(filter).ToListAsync();
    }
    
    // 根据ID获取（排除已删除）
    public async Task<MyEntity?> GetByIdAsync(string id)
    {
        var filter = Builders<MyEntity>.Filter.And(
            Builders<MyEntity>.Filter.Eq(x => x.Id, id),
            SoftDeleteExtensions.NotDeleted<MyEntity>()
        );
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }
    
    // 搜索（排除已删除）
    public async Task<List<MyEntity>> SearchByNameAsync(string name)
    {
        var filter = Builders<MyEntity>.Filter.And(
            Builders<MyEntity>.Filter.Regex(x => x.Name, new BsonRegularExpression(name, "i")),
            SoftDeleteExtensions.NotDeleted<MyEntity>()
        );
        return await _collection.Find(filter).ToListAsync();
    }
}
```

#### 实现软删除方法

```csharp
// 单个删除
public async Task<bool> DeleteAsync(string id, string? reason = null)
{
    var currentUserId = GetCurrentUserId();
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.Eq(x => x.Id, id),
        SoftDeleteExtensions.NotDeleted<MyEntity>()
    );
    return await _collection.SoftDeleteOneAsync(filter, currentUserId, reason);
}

// 批量删除
public async Task<long> DeleteManyAsync(List<string> ids, string? reason = null)
{
    var currentUserId = GetCurrentUserId();
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.In(x => x.Id, ids),
        SoftDeleteExtensions.NotDeleted<MyEntity>()
    );
    return await _collection.SoftDeleteManyAsync(filter, currentUserId, reason);
}
```

### 3. 在 Controller 中使用

```csharp
[ApiController]
[Route("api/[controller]")]
public class MyEntityController : ControllerBase
{
    private readonly MyEntityService _service;
    
    public MyEntityController(MyEntityService service)
    {
        _service = service;
    }
    
    /// <summary>
    /// 获取所有实体
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entities = await _service.GetAllAsync();
        return Ok(entities);
    }
    
    /// <summary>
    /// 软删除实体
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(string id, [FromQuery] string? reason = null)
    {
        var success = await _service.DeleteAsync(id, reason);
        if (!success)
            return NotFound($"Entity with ID {id} not found");
        
        return NoContent();
    }
    
    /// <summary>
    /// 批量软删除
    /// </summary>
    [HttpPost("bulk-delete")]
    [Authorize]
    public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteRequest request)
    {
        if (request.Ids == null || !request.Ids.Any())
            return BadRequest("ID列表不能为空");
        
        var count = await _service.DeleteManyAsync(request.Ids, request.Reason);
        return Ok(new { deletedCount = count });
    }
}
```

### 4. API 调用示例

#### 单个删除
```http
DELETE /api/myentity/507f1f77bcf86cd799439011?reason=数据过期
Authorization: Bearer {your-jwt-token}
```

#### 批量删除
```http
POST /api/myentity/bulk-delete
Authorization: Bearer {your-jwt-token}
Content-Type: application/json

{
  "ids": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ],
  "reason": "批量清理测试数据"
}
```

## 高级用法

### 1. 查询已删除的数据（仅管理员）

```csharp
// 获取所有数据（包括已删除）
public async Task<List<MyEntity>> GetAllIncludingDeletedAsync()
{
    return await _collection.Find(_ => true).ToListAsync();
}

// 仅获取已删除的数据
public async Task<List<MyEntity>> GetDeletedOnlyAsync()
{
    var filter = Builders<MyEntity>.Filter.Eq(x => x.IsDeleted, true);
    return await _collection.Find(filter).ToListAsync();
}

// 获取特定时间范围内删除的数据
public async Task<List<MyEntity>> GetDeletedInRangeAsync(DateTime startDate, DateTime endDate)
{
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.Eq(x => x.IsDeleted, true),
        Builders<MyEntity>.Filter.Gte(x => x.DeletedAt, startDate),
        Builders<MyEntity>.Filter.Lte(x => x.DeletedAt, endDate)
    );
    return await _collection.Find(filter).ToListAsync();
}
```

### 2. 恢复已删除的数据（可选实现）

```csharp
public async Task<bool> RestoreAsync(string id)
{
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.Eq(x => x.Id, id),
        Builders<MyEntity>.Filter.Eq(x => x.IsDeleted, true)
    );
    
    var update = Builders<MyEntity>.Update
        .Set(x => x.IsDeleted, false)
        .Set(x => x.DeletedAt, null)
        .Set(x => x.DeletedBy, null)
        .Set(x => x.DeletedReason, null);
    
    var result = await _collection.UpdateOneAsync(filter, update);
    return result.ModifiedCount > 0;
}
```

### 3. 物理删除（永久删除）

```csharp
// 物理删除已软删除的数据
public async Task<bool> PermanentlyDeleteAsync(string id)
{
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.Eq(x => x.Id, id),
        Builders<MyEntity>.Filter.Eq(x => x.IsDeleted, true)
    );
    
    var result = await _collection.DeleteOneAsync(filter);
    return result.DeletedCount > 0;
}

// 清理超过指定天数的软删除数据
public async Task<long> CleanupOldDeletedDataAsync(int daysOld = 30)
{
    var cutoffDate = DateTime.UtcNow.AddDays(-daysOld);
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.Eq(x => x.IsDeleted, true),
        Builders<MyEntity>.Filter.Lt(x => x.DeletedAt, cutoffDate)
    );
    
    var result = await _collection.DeleteManyAsync(filter);
    return result.DeletedCount;
}
```

### 4. 级联软删除

```csharp
// 删除父实体时级联软删除子实体
public async Task<bool> DeleteWithChildrenAsync(string parentId, string? reason = null)
{
    var currentUserId = GetCurrentUserId();
    
    // 软删除父实体
    var parentDeleted = await DeleteAsync(parentId, reason);
    if (!parentDeleted)
        return false;
    
    // 软删除所有子实体
    var childrenFilter = Builders<ChildEntity>.Filter.And(
        Builders<ChildEntity>.Filter.Eq(x => x.ParentId, parentId),
        SoftDeleteExtensions.NotDeleted<ChildEntity>()
    );
    
    await _childCollection.SoftDeleteManyAsync(
        childrenFilter, 
        currentUserId, 
        $"Parent deleted: {reason}"
    );
    
    return true;
}
```

## 注意事项

### ✅ 推荐做法

1. **始终使用扩展方法** - 使用 `SoftDeleteExtensions.NotDeleted<T>()` 构建过滤器
2. **记录删除原因** - 在重要操作中提供清晰的删除原因
3. **添加索引** - 在 `isDeleted` 字段上创建索引以提高查询性能
4. **日志记录** - 记录删除操作到活动日志
5. **权限控制** - 确保只有授权用户才能执行删除操作

### ❌ 避免的做法

1. **不要直接修改 IsDeleted** - 使用扩展方法而不是手动设置字段
2. **不要忘记过滤** - 所有查询都应该排除已删除数据
3. **不要硬编码** - 使用 `GetCurrentUserId()` 获取当前用户而不是硬编码
4. **不要跳过唯一性检查** - 检查唯一字段时要排除已删除数据
5. **不要物理删除** - 除非有明确的数据清理策略，否则不要物理删除数据

## 常见问题

### Q: 如何在 MongoDB 中创建索引？

```javascript
// 连接到 MongoDB
use platform_db

// 为 isDeleted 字段创建索引
db.my_entities.createIndex({ "isDeleted": 1 })

// 创建复合索引（提高查询性能）
db.my_entities.createIndex({ "isDeleted": 1, "name": 1 })
```

### Q: 如何处理唯一约束？

软删除会影响唯一约束的检查。确保在检查唯一性时排除已删除的数据：

```csharp
public async Task<bool> IsNameUniqueAsync(string name, string? excludeId = null)
{
    var filter = Builders<MyEntity>.Filter.And(
        Builders<MyEntity>.Filter.Eq(x => x.Name, name),
        SoftDeleteExtensions.NotDeleted<MyEntity>()
    );
    
    if (!string.IsNullOrEmpty(excludeId))
    {
        filter = Builders<MyEntity>.Filter.And(
            filter,
            Builders<MyEntity>.Filter.Ne(x => x.Id, excludeId)
        );
    }
    
    var count = await _collection.CountDocumentsAsync(filter);
    return count == 0;
}
```

### Q: 如何统计已删除的数据？

```csharp
public async Task<DeletedDataStats> GetDeletedStatsAsync()
{
    var deletedFilter = Builders<MyEntity>.Filter.Eq(x => x.IsDeleted, true);
    var total = await _collection.CountDocumentsAsync(deletedFilter);
    
    var last30Days = DateTime.UtcNow.AddDays(-30);
    var recentFilter = Builders<MyEntity>.Filter.And(
        deletedFilter,
        Builders<MyEntity>.Filter.Gte(x => x.DeletedAt, last30Days)
    );
    var recent = await _collection.CountDocumentsAsync(recentFilter);
    
    return new DeletedDataStats
    {
        TotalDeleted = total,
        DeletedLast30Days = recent
    };
}
```

## 相关文档

- [完整实现文档](./SOFT-DELETE-IMPLEMENTATION.md)
- [API 文档](http://localhost:15000/scalar/v1)

## 技术支持

如果遇到问题，请检查：
1. 实体是否实现了 `ISoftDeletable` 接口
2. Service 是否注入了 `IHttpContextAccessor`
3. 查询是否使用了 `SoftDeleteExtensions.NotDeleted<T>()`
4. MongoDB 索引是否已创建

