# CRUD 权限系统 - 完整指南

> **精确到增删查改操作的企业级权限管理系统**

[![.NET 9.0](https://img.shields.io/badge/.NET-9.0-blue)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📖 快速导航

| 文档 | 用途 | 适合对象 |
|------|------|---------|
| [系统文档](CRUD-PERMISSION-SYSTEM.md) | 完整的系统架构和实现细节 | 开发人员 |
| [快速开始](CRUD-PERMISSION-QUICK-START.md) | 5分钟快速上手指南 | 所有人 |
| [测试指南](CRUD-PERMISSION-TEST-GUIDE.md) | 10个测试场景和验证清单 | 测试人员、管理员 |
| [API 示例](PERMISSION-API-EXAMPLES.md) | 完整的 API 使用示例 | 开发人员 |
| [最佳实践](PERMISSION-BEST-PRACTICES.md) | 权限配置和使用建议 | 管理员、开发人员 |
| [实施总结](PERMISSION-IMPLEMENTATION-SUMMARY.md) | 项目实施完整报告 | 项目经理、架构师 |

---

## 🚀 5 分钟快速开始

### 1. 启动系统

```bash
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet run --project Platform.AppHost
```

### 2. 访问管理后台

打开浏览器：**http://localhost:15001**

### 3. 登录

- 用户名：`admin`
- 密码：`admin123`

### 4. 查看权限

进入「系统管理」→「权限管理」

**恭喜！** 您已经可以开始使用权限系统了！ 🎉

---

## ✨ 核心特性

### 🎯 细粒度控制

精确到每个资源的 CRUD 操作：
- ✅ `user:create` - 创建用户
- ✅ `user:read` - 查看用户
- ✅ `user:update` - 修改用户
- ✅ `user:delete` - 删除用户

支持 7 个资源，共 28 个权限，覆盖所有管理功能。

### 🔄 混合权限模式

**角色权限**：批量分配，多个用户共享
```
编辑者角色 → user:read, notice:create, notice:update
```

**自定义权限**：个性化配置，单个用户独有
```
张三 → 继承编辑者权限 + notice:delete（自定义）
```

**最终权限** = 角色权限 ∪ 自定义权限

### ⚡ 自动初始化

系统启动时自动：
- ✅ 创建 28 个默认权限
- ✅ 为超级管理员分配所有权限
- ✅ 添加权限管理菜单

零配置，开箱即用！

### 🛡️ 双重验证

**前端**：控制按钮显示/隐藏
```typescript
<PermissionControl permission="user:create">
  <Button>新建用户</Button>
</PermissionControl>
```

**后端**：验证 API 访问权限
```csharp
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateUser() { }
```

**安全可靠，防止绕过！**

### 🎨 可视化管理

- ✅ 权限管理界面 - 查看所有权限
- ✅ 角色权限配置 - 表格式配置
- ✅ 用户权限配置 - 区分继承和自定义

操作直观，无需编写代码！

---

## 📊 系统能力

### 支持的资源

| 资源 | 权限数量 | 说明 |
|------|---------|------|
| 用户 (user) | 4 | 用户管理相关操作 |
| 角色 (role) | 4 | 角色管理相关操作 |
| 菜单 (menu) | 4 | 菜单配置相关操作 |
| 公告 (notice) | 4 | 公告发布相关操作 |
| 标签 (tag) | 4 | 标签管理相关操作 |
| 权限 (permission) | 4 | 权限管理相关操作 |
| 活动日志 (activity-log) | 4 | 日志查看相关操作 |

**总计**：28 个默认权限

### API 端点

**权限管理**：8 个端点  
**角色权限**：4 个端点（含原有）  
**用户权限**：6 个端点（含原有）

**总计**：18 个端点

---

## 💡 使用示例

### 后端：为控制器添加权限

```csharp
[RequirePermission("article", "create")]
public async Task<IActionResult> CreateArticle([FromBody] CreateArticleRequest request)
{
    // 自动验证 article:create 权限
    var article = await _articleService.CreateAsync(request);
    return Success(article, "创建成功");
}
```

### 前端：控制按钮显示

```typescript
import PermissionControl from '@/components/PermissionControl';

<PermissionControl permission="user:create">
  <Button type="primary">新建用户</Button>
</PermissionControl>
```

### 前端：使用 Hook 进行判断

```typescript
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { can } = usePermission();
  
  if (can('user', 'create')) {
    // 显示创建表单
  }
}
```

---

## 🎓 学习路径

### 初学者（管理员）

**推荐阅读顺序**：
1. [快速开始](CRUD-PERMISSION-QUICK-START.md) - 了解基本使用
2. [测试指南](CRUD-PERMISSION-TEST-GUIDE.md) - 动手测试功能
3. [最佳实践](PERMISSION-BEST-PRACTICES.md) - 学习配置技巧

**学习目标**：
- ✅ 能够创建和管理角色
- ✅ 能够配置角色权限
- ✅ 能够为用户分配权限

### 进阶用户（开发人员）

**推荐阅读顺序**：
1. [系统文档](CRUD-PERMISSION-SYSTEM.md) - 理解系统架构
2. [API 示例](PERMISSION-API-EXAMPLES.md) - 学习 API 使用
3. [最佳实践](PERMISSION-BEST-PRACTICES.md) - 掌握开发规范

**学习目标**：
- ✅ 能够为新资源添加权限
- ✅ 能够实现权限验证
- ✅ 能够优化权限系统

### 高级用户（架构师）

**推荐阅读顺序**：
1. [系统文档](CRUD-PERMISSION-SYSTEM.md) - 深入架构设计
2. [实施总结](PERMISSION-IMPLEMENTATION-SUMMARY.md) - 了解实施细节
3. [最佳实践](PERMISSION-BEST-PRACTICES.md) - 规划系统优化

**学习目标**：
- ✅ 能够设计权限架构
- ✅ 能够优化系统性能
- ✅ 能够扩展高级功能

---

## 🔧 常见任务

### 任务 1：创建新角色

```
1. 登录系统
2. 进入「角色管理」
3. 点击「新增角色」
4. 填写角色信息
5. 配置「菜单权限」
6. 配置「操作权限」
7. 保存

详细步骤：见「快速开始」文档
```

### 任务 2：为用户分配权限

```
1. 进入「用户管理」
2. 找到目标用户
3. 点击「配置权限」
4. 添加自定义权限
5. 保存

详细步骤：见「快速开始」文档
```

### 任务 3：添加新资源权限

```
1. 编辑 InitializePermissions.cs
2. 添加资源到列表
3. 重启服务
4. 系统自动创建 4 个权限

详细步骤：见「API 示例」文档
```

---

## 🐛 故障排查

### 问题：看不到权限数据

**解决**：
```bash
# 手动调用初始化
POST /api/permission/initialize
```

详见 [快速开始 - 故障排查](CRUD-PERMISSION-QUICK-START.md#故障排查)

### 问题：权限控制不生效

**检查清单**：
- [ ] 用户已登录
- [ ] Token 有效
- [ ] 已获取用户权限
- [ ] 权限代码正确

详见 [测试指南 - 问题排查](CRUD-PERMISSION-TEST-GUIDE.md#常见问题排查)

### 问题：API 返回 403

**原因**：用户没有所需权限

**解决**：
1. 查看用户的角色和权限
2. 为角色或用户分配所需权限
3. 重新登录测试

详见 [最佳实践 - 问题处理](PERMISSION-BEST-PRACTICES.md#维护指南)

---

## 📚 完整文档列表

### 核心文档（必读）

1. **[系统文档](CRUD-PERMISSION-SYSTEM.md)** - 1,500+ 字
   - 完整的系统架构
   - 详细的实现说明
   - API 完整参考
   - 开发规范

2. **[快速开始](CRUD-PERMISSION-QUICK-START.md)** - 800+ 字
   - 启动步骤
   - 基本使用
   - 常见任务
   - 故障排查

3. **[测试指南](CRUD-PERMISSION-TEST-GUIDE.md)** - 1,200+ 字
   - 10 个测试场景
   - 完整验证清单
   - 问题排查方法
   - 测试报告模板

### 参考文档（推荐）

4. **[API 示例](PERMISSION-API-EXAMPLES.md)** - 1,000+ 字
   - 所有 API 的使用示例
   - 实战代码示例
   - 调试技巧

5. **[最佳实践](PERMISSION-BEST-PRACTICES.md)** - 1,500+ 字
   - 设计原则
   - 业务场景
   - 配置示例
   - 安全建议

6. **[实施总结](PERMISSION-IMPLEMENTATION-SUMMARY.md)** - 1,000+ 字
   - 完成度统计
   - 代码统计
   - 项目成果
   - 优化建议

---

## 🎯 适用场景

### 适合使用本系统的场景

✅ **企业管理系统**
- 多角色协作
- 数据安全要求高
- 需要精细化权限控制

✅ **SaaS 平台**
- 多租户管理
- 不同客户不同权限
- 支持自定义权限

✅ **内容管理系统**
- 审批流程
- 内容分级管理
- 发布权限控制

✅ **内部办公系统**
- 部门隔离
- 职位权限匹配
- 数据访问控制

### 不太适合的场景

❌ **简单应用**
- 只有管理员和普通用户两种角色
- 无需细粒度控制
- 建议使用简单的角色验证

❌ **公开网站**
- 无需登录
- 无权限控制需求
- 建议使用简单的访问控制

---

## 🏗️ 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │         React Admin (管理后台)                     │   │
│  │  ┌────────────┐  ┌──────────────┐                │   │
│  │  │ Permission │  │  usePermission │               │   │
│  │  │  Control   │  │     Hook      │               │   │
│  │  └────────────┘  └──────────────┘                │   │
│  │         ↓                ↓                        │   │
│  │    ┌─────────────────────────┐                   │   │
│  │    │     access.ts           │                   │   │
│  │    │  (权限检查函数)          │                   │   │
│  │    └─────────────────────────┘                   │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP + JWT Token
                        ↓
┌─────────────────────────────────────────────────────────┐
│              .NET API Service (后端服务)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Controllers (控制器层)                           │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  [RequirePermission("user", "create")]     │  │   │
│  │  │  public async Task<IActionResult> Create() │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PermissionCheckService (权限检查服务)            │   │
│  │  - 获取用户角色                                   │   │
│  │  - 获取角色权限                                   │   │
│  │  - 获取自定义权限                                 │   │
│  │  - 合并验证                                       │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MongoDB (数据存储)                               │   │
│  │  - permissions (权限表)                           │   │
│  │  - roles (角色表 + permissionIds)                │   │
│  │  - users (用户表 + customPermissionIds)          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 权限验证流程

```
用户操作（点击按钮）
    ↓
前端权限检查（PermissionControl / usePermission）
    ↓ （有权限）
发送 API 请求（HTTP + JWT Token）
    ↓
后端身份认证（JWT 验证）
    ↓
RequirePermission 特性拦截
    ↓
PermissionCheckService 验证
    ↓
    ├─→ super-admin？ → ✅ 通过
    ├─→ 有权限？ → ✅ 通过
    └─→ 无权限？ → ❌ 403 Forbidden
```

---

## 🎯 核心概念

### 权限代码

**格式**：`{resource}:{action}`

**示例**：
- `user:create` - 用户创建权限
- `role:update` - 角色修改权限
- `menu:delete` - 菜单删除权限

### 权限来源

**角色权限**：
- 从用户的角色继承
- 多个角色的权限会合并
- 适合批量分配

**自定义权限**：
- 用户独有的权限
- 不影响其他用户
- 适合个性化需求

**最终权限**：
```
用户权限 = 角色权限 ∪ 自定义权限（去重）
```

### 超级管理员

**特殊规则**：
- 角色名为 `super-admin` 的用户
- 自动拥有所有权限
- 无需配置

---

## 🔑 快速参考

### 后端常用代码

```csharp
// 1. 控制器方法添加权限验证
[RequirePermission("resource", "action")]
public async Task<IActionResult> MyAction() { }

// 2. 在代码中检查权限
if (await HasPermissionAsync("user", "create")) { }

// 3. 要求权限（无权限抛异常）
await RequirePermissionAsync("user", "update");
```

### 前端常用代码

```typescript
// 1. 组件级权限控制
<PermissionControl permission="user:create">
  <Button>新建</Button>
</PermissionControl>

// 2. Hook 权限检查
const { can, hasPermission } = usePermission();
if (can('user', 'create')) { }

// 3. 访问控制（routes.ts）
{
  path: '/user-management',
  access: 'canReadUser',
}
```

---

## 📞 获取帮助

### 问题分类

| 问题类型 | 查看文档 |
|---------|---------|
| 如何使用？ | [快速开始](CRUD-PERMISSION-QUICK-START.md) |
| 如何测试？ | [测试指南](CRUD-PERMISSION-TEST-GUIDE.md) |
| API 怎么调用？ | [API 示例](PERMISSION-API-EXAMPLES.md) |
| 如何配置？ | [最佳实践](PERMISSION-BEST-PRACTICES.md) |
| 架构设计？ | [系统文档](CRUD-PERMISSION-SYSTEM.md) |
| 实施情况？ | [实施总结](PERMISSION-IMPLEMENTATION-SUMMARY.md) |

### 常见问题 FAQ

**Q: 权限初始化失败怎么办？**  
A: 查看 [快速开始 - 故障排查](CRUD-PERMISSION-QUICK-START.md#故障排查)

**Q: 如何添加新的资源权限？**  
A: 查看 [快速开始 - 添加新资源权限](CRUD-PERMISSION-QUICK-START.md#添加新的资源权限)

**Q: 权限不生效怎么办？**  
A: 查看 [测试指南 - 问题排查](CRUD-PERMISSION-TEST-GUIDE.md#常见问题排查)

**Q: 如何设计权限架构？**  
A: 查看 [最佳实践 - 权限设计原则](PERMISSION-BEST-PRACTICES.md#权限设计原则)

---

## 🎁 资源下载

### 示例文件

**角色配置模板**：查看 [最佳实践 - 权限配置示例](PERMISSION-BEST-PRACTICES.md#权限配置示例)

**测试数据**：查看 [测试指南 - 测试场景](CRUD-PERMISSION-TEST-GUIDE.md#测试场景)

**API 请求集合**：查看 [API 示例](PERMISSION-API-EXAMPLES.md)

---

## 🎉 开始使用

### 第一步：启动系统

```bash
dotnet run --project Platform.AppHost
```

### 第二步：阅读文档

从 [快速开始](CRUD-PERMISSION-QUICK-START.md) 开始

### 第三步：动手实践

按照 [测试指南](CRUD-PERMISSION-TEST-GUIDE.md) 进行测试

### 第四步：投入使用

根据业务需求配置权限，开始使用！

---

## 📮 反馈和贡献

### 问题反馈

如果您发现任何问题，请：
1. 查看相关文档
2. 检查系统日志
3. 提交问题报告

### 功能建议

如果您有功能建议，请：
1. 描述使用场景
2. 说明期望功能
3. 提供实现思路

---

## 📝 更新日志

### v1.0.0 (2025-10-11)

**首次发布** 🎉

**功能**：
- ✅ 完整的 CRUD 权限系统
- ✅ 28 个默认权限
- ✅ 混合权限模式
- ✅ 可视化管理界面
- ✅ 完善的文档

**技术**：
- .NET 9.0
- React 19
- MongoDB
- TypeScript

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢使用 Aspire Admin Platform CRUD 权限系统！

如有任何问题或建议，欢迎反馈！

---

**立即开始**：[快速开始指南](CRUD-PERMISSION-QUICK-START.md) →

**深入了解**：[完整系统文档](CRUD-PERMISSION-SYSTEM.md) →

**最佳实践**：[权限配置指南](PERMISSION-BEST-PRACTICES.md) →

