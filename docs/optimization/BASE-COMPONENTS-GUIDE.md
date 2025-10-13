# 基础组件使用指南

## 📚 概述

本指南介绍如何使用优化后的基础组件来快速开发新的服务和控制器。

## 🏗️ 基础组件列表

### 1. BaseService - 服务基类
### 2. BaseRepository<T> - 泛型仓储
### 3. ErrorMessages - 错误消息常量
### 4. ValidationExtensions - 验证扩展方法

---

## 1️⃣ BaseService 使用指南

### 继承 BaseService

```csharp
public class MyService : BaseService, IMyService
{
    public MyService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ILogger<MyService> logger)
        : base(database, httpContextAccessor, logger)
    {
        // 初始化代码
    }
}
```

### 可用方法

```csharp
// 获取当前用户ID
var userId = GetCurrentUserId();

// 获取当前用户名
var username = GetCurrentUsername();

// 获取 MongoDB 集合
var collection = GetCollection<MyEntity>("my_collection");

// 日志记录
LogError(exception, "发生错误: {Message}", ex.Message);
LogInformation("操作成功: {UserId}", userId);
LogWarning("警告: {Message}", message);
```

---

## 2️⃣ BaseRepository<T> 使用指南

### 创建仓储实例

```csharp
public class MyService : BaseService, IMyService
{
    private readonly BaseRepository<MyEntity> _repository;
    
    // 如需直接访问集合进行复杂查询
    private IMongoCollection<MyEntity> _entities => _repository.Collection;
    
    public MyService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ILogger<MyService> logger)
        : base(database, httpContextAccessor, logger)
    {
        _repository = new BaseRepository<MyEntity>(database, "my_entities", httpContextAccessor);
    }
}
```

### 实体要求

实体必须实现三个接口：

```csharp
public class MyEntity : IEntity, ISoftDeletable, ITimestamped
{
    public string? Id { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    public string? DeletedReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // 其他属性...
}
```

### 常用方法

#### 查询操作
```csharp
// 根据ID获取（自动排除已删除）
var entity = await _repository.GetByIdAsync(id);

// 获取所有（自动排除已删除）
var entities = await _repository.GetAllAsync();

// 获取所有（带排序）
var sort = Builders<MyEntity>.Sort.Descending(e => e.CreatedAt);
var entities = await _repository.GetAllAsync(sort);

// 检查是否存在
var exists = await _repository.ExistsAsync(id);

// 根据过滤器查找
var filter = Builders<MyEntity>.Filter.Eq(e => e.Name, "test");
var entity = await _repository.FindOneAsync(filter);
var entities = await _repository.FindAsync(filter);

// 统计数量
var count = await _repository.CountAsync();
var count = await _repository.CountAsync(filter);
```

#### 分页查询
```csharp
var filter = Builders<MyEntity>.Filter.Eq(e => e.IsActive, true);
var sort = Builders<MyEntity>.Sort.Descending(e => e.CreatedAt);

var (items, total) = await _repository.GetPagedAsync(
    filter: filter,
    page: 1,
    pageSize: 20,
    sort: sort
);
```

#### 创建操作
```csharp
var entity = new MyEntity
{
    Name = "Test",
    // 不需要设置 CreatedAt, UpdatedAt, IsDeleted
    // BaseRepository 会自动处理
};

var created = await _repository.CreateAsync(entity);
// created.CreatedAt 已自动设置
// created.UpdatedAt 已自动设置
// created.IsDeleted = false
```

#### 更新操作
```csharp
var update = Builders<MyEntity>.Update
    .Set(e => e.Name, "New Name")
    .Set(e => e.IsActive, true);
// 不需要设置 UpdatedAt，BaseRepository 会自动添加

var success = await _repository.UpdateAsync(id, update);
```

#### 批量更新
```csharp
var filter = Builders<MyEntity>.Filter.In(e => e.Id, ids);
var update = Builders<MyEntity>.Update.Set(e => e.IsActive, false);

var count = await _repository.UpdateManyAsync(filter, update);
```

#### 软删除操作
```csharp
// 单个软删除
var success = await _repository.SoftDeleteAsync(id, reason: "测试删除");

// 批量软删除
var filter = Builders<MyEntity>.Filter.In(e => e.Id, ids);
var count = await _repository.SoftDeleteManyAsync(filter, reason: "批量删除");
```

---

## 3️⃣ ErrorMessages 常量使用

### 基本用法

```csharp
// 使用常量
return Success(ErrorMessages.CreateSuccess);
throw new InvalidOperationException(ErrorMessages.OperationFailed);

// 格式化消息
throw new KeyNotFoundException(
    string.Format(ErrorMessages.ResourceNotFound, "用户")
);

throw new ArgumentException(
    string.Format(ErrorMessages.ParameterRequired, "用户名")
);
```

### 常用常量

```csharp
// 操作结果
ErrorMessages.OperationSuccess      // "操作成功"
ErrorMessages.CreateSuccess         // "创建成功"
ErrorMessages.UpdateSuccess         // "更新成功"
ErrorMessages.DeleteSuccess         // "删除成功"
ErrorMessages.OperationFailed       // "操作失败"

// 资源相关
ErrorMessages.ResourceNotFound      // "{0}不存在"
ErrorMessages.ResourceAlreadyExists // "{0}已存在"

// 参数验证
ErrorMessages.ParameterRequired     // "{0}不能为空"
ErrorMessages.ParameterInvalid      // "{0}格式不正确"

// 用户相关
ErrorMessages.CannotDeleteSelf      // "不能删除自己的账户"
ErrorMessages.CannotModifyOwnRole   // "不能修改自己的角色"

// 验证相关
ErrorMessages.InvalidEmailFormat    // "邮箱格式不正确"
ErrorMessages.InvalidUsernameFormat // "用户名格式不正确"
ErrorMessages.PasswordTooShort      // "密码长度不能少于6个字符"
```

---

## 4️⃣ ValidationExtensions 使用指南

### 字符串验证

```csharp
// 确保不为空
request.Username.EnsureNotEmpty("用户名");
request.Email.EnsureNotEmpty("邮箱");

// 确保长度在范围内
request.Name.EnsureLength("姓名", 2, 50);

// 验证邮箱格式
if (email.IsValidEmail())
{
    // 邮箱有效
}

// 确保邮箱格式正确（无效则抛异常）
request.Email.EnsureValidEmail();

// 验证用户名格式（3-20字符，只允许字母数字下划线）
if (username.IsValidUsername())
{
    // 用户名有效
}
request.Username.EnsureValidUsername();

// 验证密码强度（6-50字符）
request.Password.EnsureValidPassword();
```

### 对象验证

```csharp
// 确保对象不为null
request.EnsureNotNull("请求对象");

// 确保集合不为空
request.UserIds.EnsureNotEmpty("用户ID列表");
```

### 数值验证

```csharp
// 确保值在指定范围内
request.Age.EnsureInRange("年龄", 18, 120);
```

### 实用方法

```csharp
// 空字符串转 null（用于可选参数）
var name = request.Name.NullIfEmpty();

// 截断字符串到指定长度
var description = longText.Truncate(200);
```

---

## 🎯 完整示例：创建新服务

### 步骤 1: 定义实体

```csharp
public class Product : IEntity, ISoftDeletable, ITimestamped, INamedEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("price")]
    public decimal Price { get; set; }
    
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
    
    // ISoftDeletable 接口
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; }
    
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }
    
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }
    
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
    
    // ITimestamped 接口
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
```

### 步骤 2: 创建服务接口

```csharp
public interface IProductService
{
    Task<List<Product>> GetAllProductsAsync();
    Task<Product?> GetProductByIdAsync(string id);
    Task<Product> CreateProductAsync(CreateProductRequest request);
    Task<bool> UpdateProductAsync(string id, UpdateProductRequest request);
    Task<bool> DeleteProductAsync(string id, string? reason = null);
}
```

### 步骤 3: 实现服务

```csharp
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
    
    public async Task<List<Product>> GetAllProductsAsync()
    {
        var sort = Builders<Product>.Sort.Descending(p => p.CreatedAt);
        return await _productRepository.GetAllAsync(sort);
    }
    
    public async Task<Product?> GetProductByIdAsync(string id)
    {
        return await _productRepository.GetByIdAsync(id);
    }
    
    public async Task<Product> CreateProductAsync(CreateProductRequest request)
    {
        // 参数验证
        request.Name.EnsureNotEmpty("产品名称");
        request.Price.EnsureInRange("价格", 0.01m, 999999.99m);
        
        var product = new Product
        {
            Name = request.Name,
            Price = request.Price,
            IsActive = true
            // CreatedAt, UpdatedAt, IsDeleted 会自动设置
        };
        
        return await _productRepository.CreateAsync(product);
    }
    
    public async Task<bool> UpdateProductAsync(string id, UpdateProductRequest request)
    {
        var updateBuilder = Builders<Product>.Update;
        var updates = new List<UpdateDefinition<Product>>();
        
        if (!string.IsNullOrEmpty(request.Name))
            updates.Add(updateBuilder.Set(p => p.Name, request.Name));
        
        if (request.Price.HasValue)
            updates.Add(updateBuilder.Set(p => p.Price, request.Price.Value));
        
        if (updates.Count == 0)
            return false;
        
        // UpdatedAt 会自动设置
        return await _productRepository.UpdateAsync(id, updateBuilder.Combine(updates));
    }
    
    public async Task<bool> DeleteProductAsync(string id, string? reason = null)
    {
        return await _productRepository.SoftDeleteAsync(id, reason);
    }
}
```

### 步骤 4: 创建控制器

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductController : BaseApiController
{
    private readonly IProductService _productService;
    
    public ProductController(IProductService productService)
    {
        _productService = productService;
    }
    
    [HttpGet]
    [RequirePermission("product", "read")]
    public async Task<IActionResult> GetAll()
    {
        var products = await _productService.GetAllProductsAsync();
        return Success(products);
    }
    
    [HttpGet("{id}")]
    [RequirePermission("product", "read")]
    public async Task<IActionResult> GetById(string id)
    {
        var product = await _productService.GetProductByIdAsync(id);
        return Success(product.EnsureFound("产品", id));
    }
    
    [HttpPost]
    [RequirePermission("product", "create")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        var product = await _productService.CreateProductAsync(request);
        return Success(product, ErrorMessages.CreateSuccess);
    }
    
    [HttpPut("{id}")]
    [RequirePermission("product", "update")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProductRequest request)
    {
        var success = await _productService.UpdateProductAsync(id, request);
        success.EnsureSuccess("产品", id);
        return Success(ErrorMessages.UpdateSuccess);
    }
    
    [HttpDelete("{id}")]
    [RequirePermission("product", "delete")]
    public async Task<IActionResult> Delete(string id, [FromQuery] string? reason = null)
    {
        var success = await _productService.DeleteProductAsync(id, reason);
        success.EnsureSuccess("产品", id);
        return Success(ErrorMessages.DeleteSuccess);
    }
}
```

### 步骤 5: 注册服务

```csharp
// Program.cs
builder.Services.AddScoped<IProductService, ProductService>();
```

---

## 💡 最佳实践

### ✅ 推荐做法

1. **使用 BaseRepository 的基础方法**
   ```csharp
   // ✅ 简洁
   return await _repository.GetByIdAsync(id);
   
   // ❌ 冗长
   var filter = MongoFilterExtensions.ByIdAndNotDeleted<MyEntity>(id);
   return await _collection.Find(filter).FirstOrDefaultAsync();
   ```

2. **使用 ValidationExtensions**
   ```csharp
   // ✅ 清晰
   request.Name.EnsureNotEmpty("名称");
   request.Email.EnsureValidEmail();
   
   // ❌ 繁琐
   if (string.IsNullOrEmpty(request.Name))
       throw new ArgumentException("名称不能为空");
   ```

3. **使用 ResourceExtensions**
   ```csharp
   // ✅ 流畅
   return Success(entity.EnsureFound("实体", id));
   
   // ❌ 啰嗦
   if (entity == null)
       throw new KeyNotFoundException($"实体 {id} 不存在");
   return Success(entity);
   ```

4. **使用 ErrorMessages 常量**
   ```csharp
   // ✅ 统一
   return Success(ErrorMessages.CreateSuccess);
   
   // ❌ 硬编码
   return Success("创建成功");
   ```

### ⚠️ 注意事项

1. **复杂查询时使用 Collection 属性**
   ```csharp
   private IMongoCollection<MyEntity> _entities => _repository.Collection;
   
   // 需要聚合或复杂查询时
   var pipeline = _entities.Aggregate()
       .Match(...)
       .Group(...)
       .ToListAsync();
   ```

2. **UpdatedAt 自动更新**
   ```csharp
   // BaseRepository.UpdateAsync 会自动添加 UpdatedAt
   var update = Builders<MyEntity>.Update.Set(e => e.Name, "New Name");
   await _repository.UpdateAsync(id, update);
   // 不需要手动 .Set(e => e.UpdatedAt, DateTime.UtcNow)
   ```

3. **软删除自动处理**
   ```csharp
   // BaseRepository 的所有查询方法都自动排除已删除记录
   var entities = await _repository.GetAllAsync();
   // 等价于 Filter.Eq(e => e.IsDeleted, false)
   ```

---

## 📖 快速参考

### BaseRepository 方法一览

| 方法 | 说明 | 自动功能 |
|------|------|----------|
| `GetByIdAsync(id)` | 根据ID获取 | 排除已删除 |
| `GetAllAsync()` | 获取所有 | 排除已删除 |
| `GetAllAsync(sort)` | 获取所有（排序） | 排除已删除 |
| `CreateAsync(entity)` | 创建实体 | 设置时间戳、IsDeleted |
| `UpdateAsync(id, update)` | 更新实体 | 自动更新 UpdatedAt |
| `SoftDeleteAsync(id, reason)` | 软删除 | 设置软删除字段 |
| `ExistsAsync(id)` | 检查存在 | 排除已删除 |
| `ExistsAsync(filter)` | 检查存在（过滤器） | 排除已删除 |
| `CountAsync(filter)` | 统计数量 | 排除已删除 |
| `FindOneAsync(filter)` | 查找单个 | 排除已删除 |
| `FindAsync(filter)` | 查找多个 | 排除已删除 |
| `GetPagedAsync(...)` | 分页查询 | 排除已删除 |
| `SoftDeleteManyAsync(...)` | 批量软删除 | 设置软删除字段 |
| `UpdateManyAsync(...)` | 批量更新 | 自动更新 UpdatedAt |

### ValidationExtensions 方法一览

| 方法 | 说明 | 抛出异常 |
|------|------|----------|
| `EnsureNotEmpty(name)` | 字符串不为空 | ArgumentException |
| `EnsureNotNull(name)` | 对象不为null | ArgumentNullException |
| `EnsureNotEmpty(name)` | 集合不为空 | ArgumentException |
| `EnsureLength(name, min, max)` | 长度范围验证 | ArgumentException |
| `EnsureInRange(name, min, max)` | 值范围验证 | ArgumentOutOfRangeException |
| `EnsureValidEmail(name)` | 邮箱格式验证 | ArgumentException |
| `EnsureValidUsername(name)` | 用户名格式验证 | ArgumentException |
| `EnsureValidPassword(name)` | 密码强度验证 | ArgumentException |
| `IsValidEmail()` | 判断邮箱是否有效 | - |
| `IsValidUsername()` | 判断用户名是否有效 | - |
| `IsValidPassword()` | 判断密码是否有效 | - |
| `NullIfEmpty()` | 空字符串转null | - |
| `Truncate(maxLength)` | 截断字符串 | - |

---

## 🎓 学习建议

1. **查看现有服务**: 参考 `UserService`, `RoleService`, `MenuService`, `NoticeService`
2. **查看现有控制器**: 参考 `UserController`, `RoleController`, `MenuController`
3. **遵循模式**: 新服务应该遵循相同的模式和约定
4. **利用基础组件**: 不要重复造轮子，使用已有的基础设施

---

**创建时间**: 2025-10-13  
**最后更新**: 2025-10-13

