# 索引创建时重复数据清理修复

## 📋 问题描述

在创建唯一索引时遇到 `E11000 duplicate key error`，因为数据库中存在重复数据：

**错误日志**：
```
E11000 duplicate key error collection: mongodb.companies 
index: idx_company_code_unique dup key: { code: "default" }

E11000 duplicate key error collection: mongodb.roles 
index: idx_company_name_unique dup key: { companyId: "", name: "admin" }
```

**原因**：旧数据或测试数据导致唯一字段存在重复值。

## ✅ 解决方案

在创建唯一索引前，自动检测并清理重复数据：

### 1. 清理重复企业代码

```csharp
private async Task CleanupDuplicateCompanyCodesAsync(IMongoCollection<Company> collection)
{
    // 1. 使用聚合查询找出重复的 code
    // 2. 保留最新创建的记录
    // 3. 删除旧的重复记录
}
```

### 2. 清理重复角色

```csharp
private async Task CleanupDuplicateRolesAsync(IMongoCollection<Role> collection)
{
    // 1. 使用聚合查询找出重复的 (companyId, name) 组合
    // 2. 保留最新创建的记录
    // 3. 删除旧的重复记录
}
```

## 🔧 实现逻辑

**清理策略**：
- ✅ 使用聚合查询 `$group` 找出重复数据
- ✅ 按 `createdAt` 排序，保留最新记录
- ✅ 删除旧的重复记录
- ✅ 详细的日志输出

**执行时机**：
- 在创建唯一索引**之前**执行清理
- 只有检测到重复数据时才执行删除

## 📊 影响范围

**修改文件**：
- `Platform.ApiService/Scripts/CreateAllIndexes.cs`

**新增方法**：
- `CleanupDuplicateCompanyCodesAsync()` - 清理重复企业代码
- `CleanupDuplicateRolesAsync()` - 清理重复角色

## 🧪 测试验证

启动应用后，检查日志输出：

```
发现 1 个重复的企业代码，正在清理...
删除重复企业记录: code=default, id=xxx
发现 2 组重复的角色，正在清理...
删除重复角色记录: companyId=, name=admin, id=xxx
✅ 创建索引: companies.code (唯一)
✅ 创建索引: roles.companyId + name (企业内唯一)
```

## 🎯 预防措施

为避免未来出现重复数据：

1. ✅ 使用原子操作插入数据
2. ✅ 捕获 `DuplicateKey` 异常
3. ✅ 尽早创建唯一索引
4. ✅ 在应用层进行唯一性验证

## 📚 相关文档

- [CreateAllIndexes 实现](mdc:Platform.ApiService/Scripts/CreateAllIndexes.cs)
- [数据库初始化优化](../optimization/DATABASE-INITIALIZATION-OPTIMIZATION.md)
- [MongoDB 原子操作规范](mdc:.cursor/rules/mongodb-atomic-operations.mdc)

---

**修复日期**: 2025-01-14  
**修复版本**: v5.0  
**状态**: ✅ 已修复

