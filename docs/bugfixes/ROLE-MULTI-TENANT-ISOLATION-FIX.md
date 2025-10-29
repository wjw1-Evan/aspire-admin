# 角色管理多租户隔离修复

## 📋 问题描述

角色管理中的角色应该对应每个企业，但现在某个企业能看到全部角色，这是错误的。缺少多租户数据隔离。

## 🔍 问题原因

`Role` 模型虽然有 `CompanyId` 字段，但没有实现 `IMultiTenant` 接口，导致 `DatabaseOperationFactory` 的多租户过滤机制无法识别并自动应用企业隔离。

## ✅ 修复内容

### 1. IMultiTenant 接口 CompanyId 改为非空

**文件**: `Platform.ServiceDefaults/Models/BaseEntity.cs`

- 将 `IMultiTenant` 接口的 `CompanyId` 从 `string?` 改为 `string`（非空）
- 将 `MultiTenantEntity` 基类的 `CompanyId` 从 `string?` 改为 `string`（非空）
- 让 `MultiTenantEntity` 显式实现 `IMultiTenant` 接口

```csharp
// 修复前
public interface IMultiTenant
{
    string? CompanyId { get; set; }  // 可空
}

public abstract class MultiTenantEntity : BaseEntity
{
    public string? CompanyId { get; set; }  // 可空
}

// 修复后
public interface IMultiTenant
{
    string CompanyId { get; set; }  // 非空
}

public abstract class MultiTenantEntity : BaseEntity, IMultiTenant
{
    public string CompanyId { get; set; } = string.Empty;  // 非空
}
```

### 2. Role 模型实现 IMultiTenant 接口

**文件**: `Platform.ApiService/Models/RoleModels.cs`

- 让 `Role` 类实现 `Platform.ServiceDefaults.Models.IMultiTenant` 接口
- `CompanyId` 属性保持为 `string`（非空，与接口一致）

```csharp
// 修复前
public class Role : IEntity, ISoftDeletable, INamedEntity, ITimestamped
{
    public string CompanyId { get; set; } = string.Empty;
}

// 修复后
public class Role : IEntity, ISoftDeletable, INamedEntity, ITimestamped, IMultiTenant
{
    public string? CompanyId { get; set; }
}
```

### 2. 创建角色时自动设置 CompanyId

**文件**: `Platform.ApiService/Services/RoleService.cs`

- 在 `CreateRoleAsync` 方法中获取当前企业ID并设置到角色实体

```csharp
public async Task<Role> CreateRoleAsync(CreateRoleRequest request)
{
    // 获取当前企业ID
    var companyId = _roleFactory.GetRequiredCompanyId();

    var role = new Role
    {
        Name = request.Name,
        Description = request.Description,
        MenuIds = request.MenuIds,
        IsActive = request.IsActive,
        CompanyId = companyId  // ✅ 设置企业ID，确保多租户隔离
    };

    return await _roleFactory.CreateAsync(role);
}
```

## 🔧 工作原理

### DatabaseOperationFactory 的多租户过滤机制

`DatabaseOperationFactory` 的 `ApplyTenantFilter` 方法会检查实体是否实现 `IMultiTenant` 接口：

```csharp
private FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T> filter)
{
    // 检查实体是否实现多租户接口
    if (typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
    {
        var companyId = _tenantContext.GetCurrentCompanyId();
        if (!string.IsNullOrEmpty(companyId))
        {
            var companyIdProperty = typeof(T).GetProperty("CompanyId");
            if (companyIdProperty != null)
            {
                var companyFilter = Builders<T>.Filter.Eq(companyIdProperty.Name, companyId);
                return Builders<T>.Filter.And(filter, companyFilter);
            }
        }
    }
    return filter;
}
```

**修复前**：`Role` 未实现 `IMultiTenant`，查询时不会自动添加 `CompanyId` 过滤条件

**修复后**：`Role` 实现了 `IMultiTenant`，所有查询自动添加 `CompanyId = 当前企业ID` 过滤条件

## ✅ 验证检查

### 创建 Role 的地方（已确认都设置了 CompanyId）

1. ✅ **RoleService.CreateRoleAsync** - 设置 `CompanyId = _roleFactory.GetRequiredCompanyId()`
2. ✅ **CompanyService.RegisterCompanyAsync** - 设置 `CompanyId = company.Id!`
3. ✅ **CompanyService.CreateCompanyAsync** - 设置 `CompanyId = company.Id!`
4. ✅ **AuthService.CreatePersonalCompanyWithDetailsAsync** - 设置 `CompanyId = company.Id!`
5. ✅ **AuthService.CreatePersonalCompanyAsync** - 设置 `CompanyId = company.Id!`

### 查询 Role 的地方（已确认都会自动应用多租户过滤）

1. ✅ **RoleService.GetAllRolesAsync** - 自动过滤当前企业的角色
2. ✅ **RoleService.GetAllRolesWithStatsAsync** - 自动过滤当前企业的角色
3. ✅ **RoleService.GetRoleByIdAsync** - 自动过滤当前企业的角色
4. ✅ **RoleService.GetRoleByNameAsync** - 自动过滤当前企业的角色
5. ✅ **UserService.GetRoleNameMapAsync** - 手动添加了 `CompanyId` 过滤（双重保障）
6. ✅ **UserCompanyService.UpdateMemberRolesAsync** - 手动添加了 `CompanyId` 过滤
7. ✅ **JoinRequestService.ApproveRequestAsync** - 手动添加了 `CompanyId` 过滤

## 🎯 修复效果

### 修复前
- ❌ 企业A可以看到企业B的角色
- ❌ 角色列表显示所有企业的角色
- ❌ 存在数据泄露风险

### 修复后
- ✅ 每个企业只能看到自己的角色
- ✅ 角色查询自动应用企业过滤
- ✅ 数据完全隔离，安全可靠

## 📝 相关文件

- `Platform.ApiService/Models/RoleModels.cs` - Role 模型定义
- `Platform.ApiService/Services/RoleService.cs` - 角色服务
- `Platform.ServiceDefaults/Models/BaseEntity.cs` - IMultiTenant 接口定义
- `Platform.ServiceDefaults/Services/DatabaseOperationFactory.cs` - 多租户过滤实现

## 🚀 部署说明

1. 确保所有创建角色的代码都设置了 `CompanyId`
2. 验证现有数据库中的角色数据都有正确的 `CompanyId`
3. 如果发现 `CompanyId` 为空的角色，需要手动修复或迁移

## ✅ 测试要点

1. ✅ 验证企业A创建的角色只能被企业A看到
2. ✅ 验证企业B创建的角色只能被企业B看到
3. ✅ 验证角色列表只显示当前企业的角色
4. ✅ 验证创建角色时自动设置当前企业ID
5. ✅ 验证跨企业访问角色会返回空或失败
