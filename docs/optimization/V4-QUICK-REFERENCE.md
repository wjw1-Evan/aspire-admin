# ⚡ v4.0 优化快速参考

## 🎯 一分钟上手

v4.0 引入了3个通用工具类，让代码更简洁。

---

## 📦 新增工具类

### 1. ResourceExtensions - 资源检查

**用途**: 简化null检查和资源验证

#### 基本用法

```csharp
// ✅ 检查资源是否存在
var user = await _service.GetUserByIdAsync(id);
return Success(user.EnsureFound("用户", id));

// ✅ 检查操作是否成功
var success = await _service.UpdateAsync(id, request);
success.EnsureSuccess("资源", id);
```

#### 替代模式

```csharp
// ❌ 优化前
var user = await _service.GetUserByIdAsync(id);
if (user == null)
    throw new KeyNotFoundException($"用户 {id} 不存在");
return Success(user);

// ✅ 优化后
var user = await _service.GetUserByIdAsync(id);
return Success(user.EnsureFound("用户", id));
```

---

### 2. UniquenessChecker - 唯一性检查

**用途**: 统一用户名、邮箱唯一性检查

#### 基本用法

```csharp
// ✅ 确保用户名唯一
await _uniquenessChecker.EnsureUsernameUniqueAsync(username);

// ✅ 确保邮箱唯一（排除当前用户）
await _uniquenessChecker.EnsureEmailUniqueAsync(email, excludeUserId: id);

// ✅ 仅检查，不抛异常
bool isUnique = await _uniquenessChecker.IsUsernameUniqueAsync(username);
```

#### 替代模式

```csharp
// ❌ 优化前 (8-10行)
var filter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.Eq(u => u.Username, username),
    Builders<AppUser>.Filter.Ne(u => u.Id, id)
).AndNotDeleted();
var existing = await _users.Find(filter).FirstOrDefaultAsync();
if (existing != null)
    throw new InvalidOperationException("用户名已存在");

// ✅ 优化后 (1行)
await _uniquenessChecker.EnsureUsernameUniqueAsync(username, excludeUserId: id);
```

---

### 3. FieldValidationService - 字段验证

**用途**: 统一所有字段验证逻辑

#### 基本用法

```csharp
// ✅ 验证用户名（自动检查长度和格式）
_validationService.ValidateUsername(username);

// ✅ 验证密码（自动检查长度）
_validationService.ValidatePassword(password);

// ✅ 验证邮箱（自动检查格式）
_validationService.ValidateEmail(email);

// ✅ 验证必填字段
_validationService.ValidateRequired(value, "字段名");

// ✅ 验证字符串长度
_validationService.ValidateStringLength(value, "字段名", 3, 50);
```

#### 替代模式

```csharp
// ❌ 优化前 (10-15行)
if (string.IsNullOrWhiteSpace(username))
    throw new ArgumentException("用户名不能为空");
if (username.Length < 3 || username.Length > 50)
    throw new ArgumentException("用户名长度必须在3-50个字符之间");

// ✅ 优化后 (1行)
_validationService.ValidateUsername(username);
```

---

## 🔧 如何使用

### 1. 在服务中注入

```csharp
public class MyService
{
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;

    public MyService(
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
    {
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
    }
}
```

### 2. 在控制器中使用

```csharp
using Platform.ApiService.Extensions; // 导入扩展方法

public class MyController : BaseApiController
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var item = await _service.GetByIdAsync(id);
        return Success(item.EnsureFound("资源", id)); // 使用扩展方法
    }
}
```

---

## 📝 完整示例

### 控制器示例

```csharp
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions; // ✅ 导入扩展

[ApiController]
[Route("api/[controller]")]
public class ProductController : BaseApiController
{
    private readonly IProductService _service;

    public ProductController(IProductService service)
    {
        _service = service;
    }

    /// <summary>
    /// 获取产品
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var product = await _service.GetByIdAsync(id);
        return Success(product.EnsureFound("产品", id)); // ✅ 简洁
    }

    /// <summary>
    /// 更新产品
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, UpdateRequest request)
    {
        var success = await _service.UpdateAsync(id, request);
        success.EnsureSuccess("产品", id); // ✅ 简洁
        return Success("更新成功");
    }
}
```

### 服务示例

```csharp
public class ProductService
{
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;

    public ProductService(
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
    {
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
    }

    public async Task<Product> CreateAsync(CreateProductRequest request)
    {
        // ✅ 统一验证
        _validationService.ValidateRequired(request.Name, "产品名称");
        _validationService.ValidateStringLength(request.Name, "产品名称", 2, 50);
        
        // ✅ 统一唯一性检查（如果需要）
        // await _uniquenessChecker.EnsureUniqueAsync(...);
        
        // 创建产品...
    }
}
```

---

## ⚡ 常用模式

### 模式 1: GetById
```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetById(string id)
{
    var item = await _service.GetByIdAsync(id);
    return Success(item.EnsureFound("资源名", id));
}
```

### 模式 2: Update
```csharp
[HttpPut("{id}")]
public async Task<IActionResult> Update(string id, UpdateRequest request)
{
    var success = await _service.UpdateAsync(id, request);
    success.EnsureSuccess("资源名", id);
    return Success("更新成功");
}
```

### 模式 3: Delete
```csharp
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(string id)
{
    var success = await _service.DeleteAsync(id);
    success.EnsureSuccess("资源名", id);
    return Success("删除成功");
}
```

### 模式 4: Create with Validation
```csharp
public async Task<Resource> CreateAsync(CreateRequest request)
{
    // 验证
    _validationService.ValidateRequired(request.Name, "名称");
    
    // 唯一性检查
    await _uniquenessChecker.EnsureUniqueAsync(...);
    
    // 创建资源...
}
```

---

## 🚨 错误处理

### 自动异常处理

工具类会自动抛出合适的异常，由 `GlobalExceptionMiddleware` 统一处理：

```csharp
// 这些会自动抛出异常
item.EnsureFound("用户", id);           // → KeyNotFoundException
success.EnsureSuccess("角色", id);      // → KeyNotFoundException
_validationService.ValidateUsername(x); // → ArgumentException
_uniquenessChecker.EnsureUniqueAsync(x);// → InvalidOperationException
```

### 特殊场景：ApiResponse格式

```csharp
// 在返回ApiResponse的方法中
try
{
    _validationService.ValidateUsername(username);
    await _uniquenessChecker.EnsureUsernameUniqueAsync(username);
}
catch (ArgumentException ex)
{
    return ApiResponse.ValidationErrorResult(ex.Message);
}
catch (InvalidOperationException ex)
{
    return ApiResponse.ErrorResult("ERROR_CODE", ex.Message);
}
```

---

## ✅ 检查清单

在编写新代码时，问自己：

- [ ] 需要检查null吗？ → 使用 `EnsureFound()`
- [ ] 需要检查布尔结果吗？ → 使用 `EnsureSuccess()`
- [ ] 需要验证字段吗？ → 使用 `FieldValidationService`
- [ ] 需要检查唯一性吗？ → 使用 `UniquenessChecker`

---

## 📚 更多信息

- [v4.0 完整报告](V4-FINAL-COMPLETE-REPORT.md) - 详细的优化说明
- [v4.0 优化总结](V4-OPTIMIZATION-SUMMARY.md) - 完成总结
- [v4.0 详细对比](REFACTORING-RESULTS-V4.md) - 优化前后对比

---

**🎯 记住：代码越少，Bug越少，维护越简单！**

*快速参考 v4.0 | 更新日期: 2025-10-12*


