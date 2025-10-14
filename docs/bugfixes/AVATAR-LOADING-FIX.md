# 右上角头像一直转圈问题修复

## 📋 问题描述

用户登录后，右上角的个人头像图标一直显示加载状态（转圈），无法显示用户信息和下拉菜单。

### 问题表现
- `/api/currentUser` API 返回数据正确
- 浏览器控制台无明显错误
- 右上角头像一直显示 Spin 加载状态
- 无法点击头像显示下拉菜单

## 🔍 问题分析

### 根本原因

前后端字段名不匹配导致前端无法正确识别用户信息。

### 详细分析

1. **后端模型定义** (`Platform.ApiService/Models/AuthModels.cs`):
   ```csharp
   [BsonElement("displayName")]
   public string? DisplayName { get; set; }
   ```
   - 使用 `BsonElement("displayName")` 用于 MongoDB 存储
   - 但 JSON 序列化时也使用了 `displayName` 字段名

2. **前端组件检查** (`Platform.Admin/src/components/RightContent/AvatarDropdown.tsx`):
   ```typescript
   if (!currentUser?.name) {
     return loading;  // 显示加载状态
   }
   ```
   - 前端期望 `name` 字段
   - 但后端返回的是 `displayName` 字段
   - 导致 `currentUser.name` 为 `undefined`
   - 组件一直显示加载状态

3. **数据流**:
   ```
   后端返回: { displayName: "管理员" }
                    ↓
   前端接收: currentUser.displayName = "管理员"
             currentUser.name = undefined  ❌
                    ↓
   组件检查: !currentUser?.name = true
                    ↓
   显示加载: return loading  🔄
   ```

## ✅ 解决方案

### 1. 后端模型修复

在 `CurrentUser.DisplayName` 属性上添加 `JsonPropertyName` 特性：

```csharp
/// <summary>
/// 显示名称（对应 AppUser.Name）
/// </summary>
[BsonElement("displayName")]
[System.Text.Json.Serialization.JsonPropertyName("name")]  // ✅ 新增
public string? DisplayName { get; set; }
```

**效果**：
- MongoDB 存储时使用 `displayName` 字段名
- JSON 序列化时使用 `name` 字段名
- 与前端期望的字段名一致

### 2. 修复 DisplayName 为 null 问题

在 `AuthService.GetCurrentUserAsync()` 中使用后备值：

```csharp
DisplayName = user.Name ?? user.Username,  // ✅ 如果 Name 为空，使用 Username
```

### 3. 配置全局 JSON 序列化选项

在 `Program.cs` 中配置：

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = false;
    });
```

### 4. 修复响应格式化中间件

在 `ResponseFormattingMiddleware` 中添加 JSON 序列化选项：

```csharp
private static readonly JsonSerializerOptions JsonOptions = new()
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};

// 使用时传入选项
JsonSerializer.Deserialize<object>(bodyText, JsonOptions)
JsonSerializer.Serialize(wrappedResponse, JsonOptions)
```

### 2. 前端类型更新

更新 `CurrentUser` 类型定义，添加注释和新字段：

```typescript
type CurrentUser = {
  name?: string;          // 对应后端 DisplayName (通过 JsonPropertyName 映射)
  avatar?: string;
  // ... 其他字段
  roles?: string[];       // v5.0: 角色列表
  permissions?: string[]; // v5.0: 权限列表
  currentCompanyId?: string;
};
```

### 3. 添加调试日志

在 `app.tsx` 中添加调试日志，方便未来排查类似问题：

```typescript
console.log('🔍 API 响应完整数据:', JSON.stringify(msg, null, 2));
console.log('🔍 用户信息:', JSON.stringify(userInfo, null, 2));
```

## 🔧 修改文件

### 后端
- ✅ `Platform.ApiService/Models/AuthModels.cs`
  - 添加 `[JsonPropertyName("name")]` 特性
- ✅ `Platform.ApiService/Services/AuthService.cs`
  - 修复 `DisplayName` 为 null 的问题
- ✅ `Platform.ApiService/Program.cs`
  - 配置全局 JSON 序列化选项
- ✅ `Platform.ApiService/Middleware/ResponseFormattingMiddleware.cs`
  - 添加 JSON 序列化选项配置

### 前端
- ✅ `Platform.Admin/src/app.tsx`
  - 清理代码（移除临时调试日志）
- ✅ `Platform.Admin/src/services/ant-design-pro/typings.d.ts`
  - 更新 `CurrentUser` 类型定义，添加新字段

## 🧪 验证步骤

1. 重启后端服务:
   ```bash
   dotnet run --project Platform.AppHost
   ```

2. 刷新浏览器页面

3. 检查浏览器控制台:
   ```
   ✅ 应该看到: currentUser 响应拦截器 - 用户有效，返回响应
   ✅ 应该看到: 用户信息包含 name 字段
   ```

4. 检查右上角:
   ```
   ✅ 应该显示用户名
   ✅ 可以点击显示下拉菜单
   ❌ 不应该再显示加载状态
   ```

## 📚 相关知识

### BsonElement vs JsonPropertyName

```csharp
public class MyModel
{
    [BsonElement("mongo_field")]           // MongoDB 存储字段名
    [JsonPropertyName("json_field")]       // JSON 序列化字段名
    public string? MyProperty { get; set; }
}
```

**使用场景**：
- 当 MongoDB 字段名和 API 返回字段名需要不同时
- 保持向后兼容性（数据库字段名不变，但 API 字段名需要调整）
- 符合不同命名规范（如 MongoDB 使用蛇形命名，API 使用驼峰命名）

### 为什么不直接改前端？

可以改前端使用 `displayName`，但会带来以下问题：

1. **破坏现有约定**：Ant Design Pro 默认使用 `name` 字段
2. **影响范围大**：需要修改多个组件
3. **类型定义**：需要更新多个类型定义
4. **文档示例**：大量示例代码使用 `name` 字段

因此选择在后端添加映射更合理。

## 🎯 最佳实践

### 1. 字段命名一致性

前后端应该统一字段命名规范：

```
✅ 推荐：前后端使用相同的字段名
- 后端 JSON: { "name": "..." }
- 前端使用: currentUser.name

❌ 避免：前后端字段名不一致
- 后端 JSON: { "displayName": "..." }
- 前端期望: currentUser.name
```

### 2. 使用 JsonPropertyName 映射

当数据库字段名和 API 字段名需要不同时：

```csharp
[BsonElement("db_field_name")]      // 数据库字段名
[JsonPropertyName("api_field_name")] // API 字段名
public string? Property { get; set; }
```

### 3. 添加调试日志

在关键位置添加日志，方便排查问题：

```typescript
console.log('🔍 API 响应:', response);
console.log('🔍 用户数据:', userData);
```

### 4. 类型定义添加注释

在类型定义中添加注释说明字段来源：

```typescript
type CurrentUser = {
  name?: string;  // 对应后端 DisplayName
};
```

## 📝 经验总结

1. **症状识别**：组件一直显示 loading 状态通常是数据未正确加载
2. **数据检查**：先确认 API 返回数据是否正确
3. **字段匹配**：检查前后端字段名是否一致
4. **类型安全**：使用 TypeScript 类型定义可以提前发现字段不匹配
5. **调试日志**：在关键位置添加日志方便排查问题

## 🔗 相关文档

- [CurrentUser 模型](mdc:Platform.ApiService/Models/AuthModels.cs)
- [AvatarDropdown 组件](mdc:Platform.Admin/src/components/RightContent/AvatarDropdown.tsx)
- [类型定义](mdc:Platform.Admin/src/services/ant-design-pro/typings.d.ts)

---

**修复时间**: 2025-01-14  
**修复版本**: v5.0+  
**影响范围**: 所有已登录用户的头像显示

