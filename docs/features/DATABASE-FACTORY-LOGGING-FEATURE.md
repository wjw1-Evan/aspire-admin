# 数据工厂日志功能

## 📋 概述

为 `DatabaseOperationFactory<T>` 添加了详细的日志输出功能，让开发者能够实时监控和调试数据操作的详细情况。

## ✨ 功能特性

### 🎯 全面的操作日志

- **创建操作** - 记录实体创建过程
- **批量创建** - 记录批量实体创建
- **查找并替换** - 记录原子替换操作
- **查找并更新** - 记录原子更新操作
- **查找并软删除** - 记录原子软删除操作
- **查找并硬删除** - 记录原子硬删除操作
- **批量更新** - 记录批量更新操作
- **批量软删除** - 记录批量软删除操作
- **查询操作** - 记录查询过程和结果
- **分页查询** - 记录分页查询详情
- **根据ID获取** - 记录单个实体获取
- **存在性检查** - 记录实体存在性验证
- **数量统计** - 记录实体数量统计

### 📊 详细的性能监控

- **执行时间** - 每个操作都记录耗时（毫秒）
- **操作结果** - 记录操作是否成功
- **数据统计** - 记录影响的数据量
- **错误详情** - 记录异常和错误信息

### 🔍 多级别日志输出

- **Debug 级别** - 操作开始信息
- **Information 级别** - 成功操作详情
- **Warning 级别** - 未找到记录等警告
- **Error 级别** - 操作失败和异常

## 🎯 日志格式

### 成功操作日志

```
✅ 成功创建 User 实体: 507f1f77bcf86cd799439011, 耗时: 15ms
✅ 成功批量创建 Role 实体: 3 个, 耗时: 8ms
✅ 成功查找并更新 User 实体: 507f1f77bcf86cd799439011, 耗时: 12ms
✅ 成功查询 User 实体: 25 个, 耗时: 45ms
✅ 成功分页查询 User 实体: 10 个/共 25 个, 页码: 1, 耗时: 38ms
```

### 警告日志

```
⚠️ 查找并更新 User 实体未找到匹配记录, 耗时: 5ms
⚠️ 根据ID获取 User 实体未找到: 507f1f77bcf86cd799439011, 耗时: 3ms
```

### 错误日志

```
❌ 创建 User 实体失败: new, 耗时: 2ms
❌ 查询 User 实体失败, 耗时: 1ms
❌ 批量更新 Role 实体失败, 耗时: 5ms
```

### Debug 日志

```
开始创建 User 实体: new
开始批量创建 Role 实体: 3 个
开始查找并更新 User 实体
开始查询 User 实体, 限制: 10
开始分页查询 User 实体, 页码: 1, 页大小: 10
```

## 🔧 技术实现

### 日志记录器注入

```csharp
public class DatabaseOperationFactory<T> : IDatabaseOperationFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly ILogger<DatabaseOperationFactory<T>> _logger;

    public DatabaseOperationFactory(
        IMongoDatabase database,
        ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor,
        ILogger<DatabaseOperationFactory<T>> logger)
    {
        _logger = logger;
        // ...
    }
}
```

### 性能监控实现

```csharp
public async Task<T> CreateAsync(T entity)
{
    var stopwatch = System.Diagnostics.Stopwatch.StartNew();
    var entityType = typeof(T).Name;
    var entityId = entity.Id ?? "new";
    
    try
    {
        _logger.LogDebug("开始创建 {EntityType} 实体: {EntityId}", entityType, entityId);
        
        // 执行操作
        await _collection.InsertOneAsync(entity);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功创建 {EntityType} 实体: {EntityId}, 耗时: {ElapsedMs}ms", 
            entityType, entity.Id, elapsed);
        
        return entity;
    }
    catch (Exception ex)
    {
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogError(ex, "❌ 创建 {EntityType} 实体失败: {EntityId}, 耗时: {ElapsedMs}ms", 
            entityType, entityId, elapsed);
        throw;
    }
}
```

### 结构化日志参数

- `{EntityType}` - 实体类型名称
- `{EntityId}` - 实体ID
- `{Count}` - 操作影响的数据量
- `{ElapsedMs}` - 操作耗时（毫秒）
- `{Page}` - 分页页码
- `{PageSize}` - 分页大小
- `{Total}` - 总数据量
- `{Exists}` - 存在性检查结果
- `{ModifiedCount}` - 修改的记录数

## 📈 性能影响

### 日志开销

- **Debug 级别** - 最小开销，适合开发环境
- **Information 级别** - 中等开销，适合生产环境监控
- **Warning/Error 级别** - 低开销，关键信息记录

### 性能优化

- 使用结构化日志减少字符串拼接
- 只在需要时计算耗时
- 异常情况下才记录详细错误信息

## 🎯 使用场景

### 开发调试

```csharp
// 开发环境 - 启用 Debug 级别日志
"Logging": {
  "LogLevel": {
    "Default": "Information",
    "Platform.ServiceDefaults.Services.DatabaseOperationFactory": "Debug"
  }
}
```

### 生产监控

```csharp
// 生产环境 - 启用 Information 级别日志
"Logging": {
  "LogLevel": {
    "Default": "Warning",
    "Platform.ServiceDefaults.Services.DatabaseOperationFactory": "Information"
  }
}
```

### 性能分析

```csharp
// 性能分析 - 监控慢查询
// 日志中会显示每个操作的耗时，便于识别性能瓶颈
✅ 成功查询 User 实体: 1000 个, 耗时: 1250ms  // 慢查询
✅ 成功查询 User 实体: 10 个, 耗时: 5ms        // 正常查询
```

## 🔍 日志分析示例

### 用户创建流程

```
[DEBUG] 开始创建 User 实体: new
[INFO]  ✅ 成功创建 User 实体: 507f1f77bcf86cd799439011, 耗时: 15ms
```

### 批量操作流程

```
[DEBUG] 开始批量创建 Role 实体: 3 个
[INFO]  ✅ 成功批量创建 Role 实体: 3 个, 耗时: 8ms
```

### 查询操作流程

```
[DEBUG] 开始查询 User 实体, 限制: 10
[INFO]  ✅ 成功查询 User 实体: 10 个, 耗时: 25ms
```

### 分页查询流程

```
[DEBUG] 开始分页查询 User 实体, 页码: 1, 页大小: 10
[INFO]  ✅ 成功分页查询 User 实体: 10 个/共 25 个, 页码: 1, 耗时: 38ms
```

### 更新操作流程

```
[DEBUG] 开始查找并更新 User 实体
[INFO]  ✅ 成功查找并更新 User 实体: 507f1f77bcf86cd799439011, 耗时: 12ms
```

### 删除操作流程

```
[DEBUG] 开始查找并软删除 User 实体
[INFO]  ✅ 成功查找并软删除 User 实体: 507f1f77bcf86cd799439011, 耗时: 8ms
```

## 🚀 优势

### 1. **开发效率提升**
- 快速定位数据操作问题
- 实时监控操作性能
- 详细的错误信息便于调试

### 2. **生产环境监控**
- 监控数据库操作性能
- 识别慢查询和性能瓶颈
- 异常情况快速定位

### 3. **运维支持**
- 操作审计和追踪
- 性能指标收集
- 问题排查支持

### 4. **代码质量**
- 统一的日志格式
- 结构化的日志参数
- 完整的异常处理

## 📚 相关文档

- [数据库操作工厂使用指南](DATABASE-OPERATION-FACTORY-GUIDE.md)
- [数据库操作工厂迁移指南](DATABASE-FACTORY-MIGRATION.md)
- [日志记录和监控规范](../.cursor/rules/logging-monitoring.mdc)

## 🎯 总结

数据工厂日志功能为开发者提供了：

1. **完整的操作追踪** - 每个数据库操作都有详细记录
2. **性能监控** - 实时监控操作耗时和性能
3. **错误诊断** - 详细的错误信息和异常处理
4. **生产支持** - 适合生产环境的监控和运维

通过这些日志，开发者可以更好地理解数据操作的行为，快速定位问题，优化性能，确保系统的稳定运行。
