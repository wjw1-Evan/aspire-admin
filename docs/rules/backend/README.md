# 后端规则

> 本目录包含 .NET/ASP.NET Core 后端开发的详细规范。

## 文件索引

| 文件 | 内容 |
|------|------|
| [`01-控制器与权限.md`](./01-控制器与权限.md) | 控制器继承、权限控制、菜单定义 |
| [`02-数据访问与审计.md`](./02-数据访问与审计.md) | DbContext、数据访问、审计字段 |
| [`03-中间件与响应.md`](./03-中间件与响应.md) | 中间件顺序、响应格式 |
| [`04-分页处理规范.md`](./04-分页处理规范.md) | 分页参数、验证、响应格式 |
| [`05-实时通信SSE.md`](./05-实时通信SSE.md) | SSE 连接管理、消息广播、心跳 |
| [`06-批量查询规范.md`](./06-批量查询规范.md) | N+1 防护、批量用户查询 |
| [`07-类型命名规范.md`](./07-类型命名规范.md) | 禁止别名写法、使用完整类型名 |

## 快速参考

### 控制器必读
```csharp
// ✅ 正确：继承 BaseApiController
public class UserController : BaseApiController
{
    // 使用统一响应方法
    return Success(data);
    return ValidationError("参数错误");
    return NotFoundError("用户", id);
}

// ❌ 禁止：直接继承 ControllerBase
public class WrongController : ControllerBase { }
```

### 权限控制必读
```csharp
// ✅ 正确：使用 RequireMenu（菜单名称使用连字符格式）
[HttpGet("list")]
[RequireMenu("user-management")]
public async Task<IActionResult> GetUsers() { }

// ❌ 禁止：使用废弃方法
[RequirePermission("users.view")]
public async Task<IActionResult> GetUsers() { }
```

### 数据访问必读
```csharp
// ✅ 正确：注入 DbContext 并使用 Set<T>() 操作
private readonly DbContext _context;

// ❌ 禁止：直接注入 MongoDB 特定对象
private readonly IMongoCollection<User> _collection;
```

### 分页处理必读

```csharp
// ✅ 正确：控制器使用 PageParams
using Platform.ServiceDefaults.Models;

[HttpGet("list")]
public async Task<IActionResult> GetUsers([FromQuery] PageParams request)
{
    var result = await _service.GetUsersAsync(request);
    return Success(result);
}

// ✅ 正确：服务层使用 ToPagedList
using Platform.ServiceDefaults.Extensions;

public async Task<PagedResult<UserDto>> GetUsersAsync(PageParams request)
{
    var query = _context.Set<User>().Where(u => u.IsActive);
    return query.ToPagedList(request);  // 自动搜索 + 排序 + 分页
}

// ❌ 禁止：手动定义分页参数
[HttpGet("list")]
public async Task<IActionResult> GetUsers(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10)  // 不允许
```

> **注意**：控制器层不应处理分页逻辑，分页应在服务层完成。

### 统计与分页分离必读

```csharp
// ✅ 正确：分离统计和分页接口
[HttpGet]
public async Task<IActionResult> GetRoles([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
{
    var result = await _roleService.GetRolesPaginatedAsync(page, pageSize);
    return Success(result);
}

[HttpGet("statistics")]
public async Task<IActionResult> GetRoleStatistics()
{
    var statistics = await _roleService.GetRoleStatisticsAsync();
    return Success(statistics);
}

// ❌ 禁止：在分页接口中计算统计数据
public async Task<IActionResult> GetRoles([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
{
    var allRoles = await _roleService.GetAllRolesAsync();
    // 在控制器中计算统计 - 这是错误的做法
    var stats = new {
        Total = allRoles.Count,
        Active = allRoles.Count(r => r.IsActive)
    };
    var paged = allRoles.Skip((page - 1) * pageSize).Take(pageSize);
    return Success(new { Data = paged, Statistics = stats });
}
```

> **原因**：统计应基于全部数据计算，分页接口只返回当前页数据。

## 相关文档

- [`00-通用原则.md`](../00-通用原则.md) - 核心架构原则
- [`00-分页规范.md`](../00-分页规范.md) - 统一分页规范（前后端通用）
- [`AGENTS.md`](../../../AGENTS.md) - 项目总纲与 AI 交互指南
- [`frontend-admin/04-TypeScript类型安全.md`](../frontend-admin/04-TypeScript类型安全.md) - 前端分页类型规范
