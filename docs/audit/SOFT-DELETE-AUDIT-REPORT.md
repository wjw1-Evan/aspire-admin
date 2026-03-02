# 软删除实现审计报告 (EF Core 版)

## 1. 审计概述
本报告旨在审计 **Aspire Admin** 平台及其微服务中软删除（Soft Delete）功能的实现情况。在目前基于 **EF Core (MongoDB Provider)** 的系统架构中，软删除不再依赖于手动构建过滤器，而是通过全局查询过滤器实现。

**审计时间**：2026-03-02
**系统架构**：.NET 10 + EF Core 9+ (MongoDB Provider)
**核心要求**：
- 所有业务实体必须支持软删除。
- 默认查询必须自动过滤已删除数据。
- 必须记录删除元数据（删除者、删除时间、原因）。

## 2. 技术实现审计

### 2.1 全局查询过滤器 (Global Query Filters)
**实现位置**：`Platform.ServiceDefaults/Services/PlatformDbContext.cs`

系统通过 `OnModelCreating` 自动为所有实现 `ISoftDeletable` 接口的实体应用查询过滤器：

```csharp
// 自动为所有实现 ISoftDeletable 的实体应用全局软删除过滤器
if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
{
    var parameter = Expression.Parameter(entityType.ClrType, "e");
    var filter = Expression.Lambda(
        Expression.Equal(
            Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted)),
            Expression.Constant(false)
        ),
        parameter
    );
    entityType.SetQueryFilter(filter);
}
```

**审计结论**：核心逻辑已标准化，避免了在各业务逻辑中手动添加过滤条件的遗漏风险。

### 2.2 自动审计跟踪
**实现位置**：`Platform.ServiceDefaults/Services/PlatformDbContext.cs` -> `ApplyAuditInfoAsync`

在 `SaveChangesAsync` 之前，系统会自动检测 `EntityState.Deleted`。如果实体支持软删除，则将其修改为 `Modified` 并填充删除元数据：

```csharp
if (entry.State == EntityState.Deleted && entry.Entity is ISoftDeletable softDeletable)
{
    entry.State = EntityState.Modified; // 拦截物理删除，转为修改
    softDeletable.IsDeleted = true;
    softDeletable.DeletedAt = DateTime.UtcNow;
    softDeletable.DeletedBy = currentUserId;
    // ... 
}
```

## 3. 覆盖率统计

经审计，系统中共有 **53** 个核心实体实现了 `ISoftDeletable` 接口（通过继承 `BaseEntity` 或 `MultiTenantEntity`）。

| 模块 | 实体数量 | 覆盖情况 |
| --- | --- | --- |
| 系统管理 (Auth/Role/Menu) | 12 | 100% |
| 云存储 (File/Share) | 5 | 100% |
| 物联网 (IoT/Device/Gateway) | 7 | 100% |
| 项目管理 (Project/Task) | 6 | 100% |
| 智慧园区 (Building/Lease) | 15 | 100% |
| 协作工具 (Chat/Workflow) | 8 | 100% |

## 4. 关键验证项

### 4.1 核心联查验证
在 EF Core 导航属性（如 `Include`）中，全局过滤器依然有效。
- **示例**：查询 `Building` 时，其关联的 `PropertyUnits` 如果已删除，将不会出现在结果列表中。

### 4.2 绕过过滤器
如需查询已删除数据（如回收站功能），需显式调用 `.IgnoreQueryFilters()`。
- **审计结论**：目前的回收站实现已正确使用该方法。

## 5. 发现与建议

### 发现 (Findings)
1. **数据工厂适配**：`EFCoreDataFactory<T>` 已全面集成 `PlatformDbContext`，所有 CRUD 操作均符合软删除规范。
2. **多租户集成**：软删除过滤器与多租户过滤器（`IMultiTenant`）在 `PlatformDbContext` 中协同工作，逻辑严密。

### 建议 (Recommendations)
1. **清理作业**：虽然软删除保证了数据不泄露，但随着时间推移，MongoDB 数据库体积会持续增长。建议增加后台作业（Background Job），根据配置（如保留 90 天）物理删除过期的软删除数据。
2. **性能监控**：由于 EF Core 在 MongoDB 上的查询解析可能存在性能差异，建议在大规模数据集上对 `IsDeleted: false` 索引的使用情况进行监控。

---
**审计员**：Antigravity AI
**结论**：**通过**。系统已建立健全的、基于数据访问层的自动软删除机制。
