# v5.0 权限系统文档归档

## ⚠️ 已废弃

这些文档属于 v5.0 的 CRUD 权限系统，已在 v6.0 中完全移除并替换为更简单的菜单级权限系统。

## 📋 归档文档列表

### 权限系统核心文档
- CRUD-PERMISSION-QUICK-START.md - CRUD 权限快速开始
- CRUD-PERMISSION-SYSTEM.md - CRUD 权限系统
- CRUD-PERMISSION-TEST-GUIDE.md - 权限测试指南
- PERMISSION-API-EXAMPLES.md - 权限 API 示例
- PERMISSION-BEST-PRACTICES.md - 权限最佳实践
- PERMISSION-QUICK-REFERENCE.md - 权限快速参考
- PERMISSION-SYSTEM-GUIDE.md - 权限系统使用指南
- PERMISSION-SYSTEM-README.md - 权限系统说明
- PERMISSIONS-INDEX.md - 权限系统概述

### 权限功能相关文档
- REMOVE-PERMISSION-MANAGEMENT-MENU.md - 移除权限管理菜单功能
- UNIFIED-PERMISSION-CONTROL.md - 统一权限控制实现方式

## 🔄 迁移指南

v6.0 使用菜单级权限系统替代了复杂的 CRUD 权限：

### v5.0 → v6.0 功能对照

| v5.0 功能 | v6.0 功能 | 说明 |
|-----------|-----------|------|
| `[RequirePermission("user", "create")]` | `[RequireMenu("user-management")]` | 使用菜单权限 |
| `HasPermissionAsync("user", "read")` | `HasMenuAccessAsync("user-management")` | 检查菜单访问 |
| Permission管理页面 | ❌ 已删除 | 不再需要 |
| Role.PermissionIds | ❌ 已删除 | 只保留MenuIds |

### 新的权限文档

- [菜单级权限使用指南](../../features/MENU-LEVEL-PERMISSION-GUIDE.md) - v6.0 菜单级权限系统
- [菜单级权限重构文档](../../refactoring/MENU-LEVEL-PERMISSION-REFACTORING.md) - 架构重构说明
- [v6.0 重构总结](../../reports/V6-REFACTORING-SUMMARY.md) - 完整重构报告

## 📚 相关文档

- [v6.0 菜单权限快速入门](../../features/MENU-PERMISSION-V6-README.md)
- [数据库清理指南](../../optimization/DATABASE-CLEANUP-GUIDE.md)
- [项目文档索引](../../INDEX.md)

---

**归档日期**: 2025-10-14  
**废弃版本**: v6.0  
**替代方案**: 菜单级权限系统
