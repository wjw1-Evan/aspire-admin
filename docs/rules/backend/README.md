# 后端规则

> 本目录包含 .NET/ASP.NET Core 后端开发的详细规范。

## 文件索引

| 文件 | 内容 |
|------|------|
| [`01-控制器与权限.md`](./01-控制器与权限.md) | 控制器继承、权限控制、菜单定义 |
| [`02-数据访问与审计.md`](./02-数据访问与审计.md) | IDataFactory、数据访问、审计字段 |
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
    return SuccessPaged(items, total, page, pageSize);
    return ValidationError("参数错误");
    return NotFoundError("用户", id);
}

// ❌ 禁止：直接继承 ControllerBase
public class WrongController : ControllerBase { }
```

### 权限控制必读
```csharp
// ✅ 正确：使用 RequireMenu
[HttpGet("list")]
[RequireMenu("user-management:list")]
public async Task<IActionResult> GetUsers() { }

// ❌ 禁止：使用废弃方法
[RequirePermission("users.view")]
public async Task<IActionResult> GetUsers() { }
```

### 数据访问必读
```csharp
// ✅ 正确：使用 IDataFactory
private readonly IDataFactory<User> _userFactory;

// ❌ 禁止：直接注入 MongoDB 对象
private readonly IMongoCollection<User> _collection;
```

## 相关文档

- [`00-通用原则.md`](../00-通用原则.md) - 核心架构原则
- [`docs/features/BACKEND-RULES.md`](../features/BACKEND-RULES.md) - 后端核心与中间件规范（详细）
- [`docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md`](../features/DATABASE-OPERATION-FACTORY-GUIDE.md) - 数据访问工厂指南
