# Cursor Rules 使用指南

## 📋 概述

本项目已配置 4 个 Cursor Rules，用于在开发时自动提供代码规范指导。这些规则基于 v5.0 后端优化的最佳实践。

## 📚 已配置的规则

### 1. backend-service-pattern
**文件**: `.cursor/rules/backend-service-pattern.mdc`  
**适用范围**: `Platform.ApiService/Services/*.cs`  
**描述**: Backend 服务层开发规范 - 使用 BaseService 和 BaseRepository

**主要内容**:
- ✅ 所有服务必须继承 `BaseService`
- ✅ 必须使用 `BaseRepository<T>` 进行数据访问
- ✅ 实体必须实现 `IEntity`, `ISoftDeletable`, `ITimestamped` 接口
- ❌ 禁止重复实现 `GetCurrentUserId()` 方法
- ❌ 禁止手动设置时间戳和软删除字段

### 2. validation-extensions
**文件**: `.cursor/rules/validation-extensions.mdc`  
**适用范围**: `Platform.ApiService/Controllers/*.cs`, `Platform.ApiService/Services/*.cs`  
**描述**: 参数验证规范 - 使用 ValidationExtensions 扩展方法

**主要内容**:
- ✅ 使用 `EnsureNotEmpty()` 验证字符串/集合
- ✅ 使用 `EnsureValidEmail()` 验证邮箱
- ✅ 使用 `EnsureValidUsername()` 验证用户名
- ✅ 使用 `EnsureValidPassword()` 验证密码
- ❌ 禁止使用冗长的 if-else 判断
- ❌ 禁止硬编码验证逻辑

### 3. error-messages-usage
**文件**: `.cursor/rules/error-messages-usage.mdc`  
**适用范围**: `Platform.ApiService/Controllers/*.cs`, `Platform.ApiService/Services/*.cs`  
**描述**: 错误消息规范 - 使用 ErrorMessages 常量类

**主要内容**:
- ✅ 使用 `ErrorMessages` 常量类管理所有消息
- ✅ 格式化消息使用 `string.Format()`
- ❌ 禁止硬编码字符串消息
- ❌ 禁止直接拼接错误消息

### 4. resource-extensions-usage
**文件**: `.cursor/rules/resource-extensions-usage.mdc`  
**适用范围**: `Platform.ApiService/Controllers/*.cs`, `Platform.ApiService/Services/*.cs`  
**描述**: 资源检查规范 - 使用 ResourceExtensions 扩展方法

**主要内容**:
- ✅ 使用 `EnsureFound()` 检查资源是否存在
- ✅ 使用 `EnsureSuccess()` 检查操作是否成功
- ✅ 支持链式调用
- ❌ 禁止手动 null 检查和抛异常
- ❌ 禁止不一致的错误消息

## 🎯 规则如何工作

### 自动激活
当你编辑匹配 `globs` 模式的文件时，相应的规则会自动加载，AI 助手会根据规则提供建议。

### 手动调用
你也可以通过 `@规则名` 来手动调用特定规则。

## 💡 使用示例

### 场景 1: 创建新服务

当你在 `Platform.ApiService/Services/` 目录创建新服务时：

1. **backend-service-pattern** 规则自动激活
2. AI 会提示你继承 `BaseService`
3. AI 会建议你使用 `BaseRepository<T>`

**示例**:
```csharp
// AI 会建议这样写
public class ProductService : BaseService, IProductService
{
    private readonly BaseRepository<Product> _productRepository;
    
    public ProductService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ProductService> logger)
        : base(database, httpContextAccessor, logger)
    {
        _productRepository = new BaseRepository<Product>(database, "products", httpContextAccessor);
    }
}
```

### 场景 2: 添加参数验证

当你在控制器中添加参数验证时：

1. **validation-extensions** 规则自动激活
2. AI 会建议使用扩展方法而不是 if-else

**示例**:
```csharp
// AI 会建议改成
request.Username.EnsureNotEmpty("用户名");
request.Email.EnsureValidEmail();

// 而不是
if (string.IsNullOrEmpty(request.Username))
    throw new ArgumentException("用户名不能为空");
```

### 场景 3: 处理错误消息

当你需要返回错误消息时：

1. **error-messages-usage** 规则自动激活
2. AI 会建议使用 `ErrorMessages` 常量

**示例**:
```csharp
// AI 会建议改成
return Success(ErrorMessages.CreateSuccess);
throw new KeyNotFoundException(string.Format(ErrorMessages.ResourceNotFound, "用户"));

// 而不是
return Success("创建成功");
throw new KeyNotFoundException($"用户 {id} 不存在");
```

### 场景 4: 检查资源

当你检查资源是否存在时：

1. **resource-extensions-usage** 规则自动激活
2. AI 会建议使用 `EnsureFound()` 或 `EnsureSuccess()`

**示例**:
```csharp
// AI 会建议改成
return Success(user.EnsureFound("用户", id));

// 而不是
if (user == null)
    throw new KeyNotFoundException($"用户 {id} 不存在");
return Success(user);
```

## 🎨 规则组合使用

在实际开发中，多个规则会同时生效：

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductController : BaseApiController  // BaseApiController 规则
{
    private readonly IProductService _productService;
    
    [HttpPost]
    [RequirePermission("product", "create")]  // 权限控制规则
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        // validation-extensions 规则
        request.Name.EnsureNotEmpty("产品名称");
        request.Price.EnsureInRange("价格", 0.01m, 999999.99m);
        
        var product = await _productService.CreateAsync(request);
        
        // error-messages-usage 规则
        return Success(product, ErrorMessages.CreateSuccess);
    }
    
    [HttpGet("{id}")]
    [RequirePermission("product", "read")]
    public async Task<IActionResult> GetById(string id)
    {
        var product = await _productService.GetByIdAsync(id);
        
        // resource-extensions-usage 规则
        return Success(product.EnsureFound("产品", id));
    }
}
```

## 📖 规则优先级

1. **Always Apply Rules** (高优先级)
   - BaseApiController 规范
   - 权限控制规范
   - 文档组织规范
   
2. **Glob Pattern Rules** (中优先级)
   - backend-service-pattern
   - validation-extensions
   - error-messages-usage
   - resource-extensions-usage

3. **Manual Rules** (手动激活)
   - 按需使用的专项规则

## 🔧 如何添加新规则

### 步骤 1: 创建规则文件
在 `.cursor/rules/` 目录创建新的 `.mdc` 文件：

```bash
touch .cursor/rules/my-new-rule.mdc
```

### 步骤 2: 编写规则内容
```markdown
---
description: 我的新规则描述
globs: *.cs
---

# 我的新规则

## 规则内容...
```

### 步骤 3: 测试规则
编辑匹配的文件，验证规则是否生效。

## 📚 相关文档

- [v5.0 优化完成摘要](OPTIMIZATION-V5-SUMMARY.md)
- [基础组件使用指南](BASE-COMPONENTS-GUIDE.md)
- [v5.0 优化前后对比](V5-BEFORE-AFTER-COMPARISON.md)
- [后端代码优化报告](BACKEND-CODE-OPTIMIZATION-REPORT.md)

## 🎯 最佳实践

1. **遵循规则提示** - AI 根据规则提供的建议都是经过验证的最佳实践
2. **保持一致性** - 所有代码应遵循相同的模式
3. **及时更新规则** - 当发现新的模式时，及时更新规则
4. **团队共享** - 确保团队成员都了解这些规则

---

**创建时间**: 2025-10-13  
**基于版本**: v5.0 后端优化  
**规则数量**: 4 个  
**适用范围**: Platform.ApiService 后端服务

