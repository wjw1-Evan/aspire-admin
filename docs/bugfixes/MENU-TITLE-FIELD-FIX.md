# 菜单标题字段缺失修复

## 📋 问题描述

在菜单权限分配弹窗中，菜单树显示的是英文的 `name` 字段值（如 `welcome`, `system`, `user-management`），而不是中文的 `title` 字段值（如"欢迎"、"系统管理"、"用户管理"）。

### 现象

```
显示内容：
- welcome
- system
  - user-management
  - role-management
  - menu-management
  - 用户日志

期望显示：
- 欢迎
- 系统管理
  - 用户管理
  - 角色管理
  - 菜单管理
  - 用户日志
```

### 根本原因

经过排查发现有两个问题：

1. **代码问题**：`MenuService.cs` 的 `CreateMenuAsync` 和 `UpdateMenuAsync` 方法中没有处理 `Title` 字段
2. **数据问题**：数据库中的现有菜单记录缺少 `Title` 字段的值

## ✅ 修复内容

### 1. 修复菜单创建逻辑

**文件**：`Platform.ApiService/Services/MenuService.cs`

#### 问题代码（CreateMenuAsync）

```csharp
// ❌ 创建菜单时缺少 Title 字段
public async Task<Menu> CreateMenuAsync(CreateMenuRequest request)
{
    var menu = new Menu
    {
        Name = request.Name,
        // ❌ 缺少 Title = request.Title,
        Path = request.Path,
        // ...
    };
}
```

#### 修复后代码

```csharp
// ✅ 添加 Title 字段
public async Task<Menu> CreateMenuAsync(CreateMenuRequest request)
{
    var menu = new Menu
    {
        Name = request.Name,
        Title = request.Title,  // ✅ 添加标题字段
        Path = request.Path,
        // ...
    };
}
```

### 2. 修复菜单更新逻辑

**文件**：`Platform.ApiService/Services/MenuService.cs`

#### 问题代码（UpdateMenuAsync）

```csharp
// ❌ 更新菜单时缺少 Title 字段
if (request.Name != null)
    updates.Add(updateBuilder.Set(m => m.Name, request.Name));
// ❌ 缺少 Title 字段的更新
if (request.Path != null)
    updates.Add(updateBuilder.Set(m => m.Path, request.Path));
```

#### 修复后代码

```csharp
// ✅ 添加 Title 字段的更新
if (request.Name != null)
    updates.Add(updateBuilder.Set(m => m.Name, request.Name));
if (request.Title != null)
    updates.Add(updateBuilder.Set(m => m.Title, request.Title));  // ✅ 添加
if (request.Path != null)
    updates.Add(updateBuilder.Set(m => m.Path, request.Path));
```

### 3. 创建数据迁移脚本

**文件**：`Platform.ApiService/Scripts/MigrateMenuTitles.cs`

创建了新的数据迁移工具来修复现有菜单数据：

```csharp
/// <summary>
/// 菜单标题数据迁移工具
/// 为已存在但缺少 title 字段的菜单添加中文标题
/// </summary>
public class MigrateMenuTitles
{
    public async Task MigrateAsync()
    {
        // 查找所有没有 title 或 title 为空的菜单
        var filter = Builders<Menu>.Filter.Or(
            Builders<Menu>.Filter.Eq(m => m.Title, null),
            Builders<Menu>.Filter.Eq(m => m.Title, "")
        );

        var menusToUpdate = await _menus.Find(filter).ToListAsync();

        // 菜单名称到中文标题的映射
        var titleMappings = new Dictionary<string, string>
        {
            { "welcome", "欢迎" },
            { "system", "系统管理" },
            { "user-management", "用户管理" },
            { "role-management", "角色管理" },
            { "menu-management", "菜单管理" },
            { "user-log", "用户日志" },
            // ...
        };

        // 批量更新菜单标题
        foreach (var menu in menusToUpdate)
        {
            if (titleMappings.TryGetValue(menu.Name, out var title))
            {
                await _menus.UpdateOneAsync(
                    m => m.Id == menu.Id,
                    Builders<Menu>.Update.Set(m => m.Title, title)
                );
            }
        }
    }
}
```

### 4. 注册迁移脚本

**文件**：`Platform.ApiService/Program.cs`

在应用启动时自动执行菜单标题迁移：

```csharp
// 初始化菜单和角色
var initialMenuData = new InitialMenuData(database);
await initialMenuData.InitializeAsync();

// ✅ 迁移菜单标题（为旧菜单添加中文标题）
var migrateMenuTitles = new MigrateMenuTitles(database,
    scope.ServiceProvider.GetRequiredService<ILogger<MigrateMenuTitles>>());
await migrateMenuTitles.MigrateAsync();

// 初始化权限系统
var initializePermissions = new InitializePermissions(database, 
    scope.ServiceProvider.GetRequiredService<ILogger<InitializePermissions>>());
await initializePermissions.InitializeAsync();
```

## 🎯 修复效果

### 修复前

菜单权限弹窗显示：
```
分配权限 - super-admin
├─ welcome
├─ system
│  ├─ user-management
│  ├─ role-management
│  ├─ menu-management
│  └─ user-log
```

### 修复后

菜单权限弹窗显示：
```
分配权限 - Super Admin
├─ 欢迎
├─ 系统管理
│  ├─ 用户管理
│  ├─ 角色管理
│  ├─ 菜单管理
│  └─ 用户日志
```

## 🔧 技术细节

### 数据模型

```csharp
public class Menu : ISoftDeletable, INamedEntity
{
    public string Name { get; set; } = string.Empty;   // 英文标识
    public string Title { get; set; } = string.Empty;  // 中文标题 ✅
    public string Path { get; set; } = string.Empty;
    // ...
}

public class MenuTreeNode
{
    public string Name { get; set; } = string.Empty;   // 英文标识
    public string Title { get; set; } = string.Empty;  // 中文标题 ✅
    public string Path { get; set; } = string.Empty;
    // ...
}
```

### 前端显示逻辑

```typescript
const convertToTreeData = (menus: MenuTreeNode[]): DataNode[] => {
  return menus.map(menu => ({
    key: menu.id!,
    title: menu.title || menu.name,  // 优先使用 title，回退到 name
    children: menu.children && menu.children.length > 0 
      ? convertToTreeData(menu.children) 
      : undefined,
  }));
};
```

## 📝 数据迁移日志示例

应用启动时会看到类似的日志输出：

```
[INFO] 开始菜单标题数据迁移...
[INFO] 找到 7 个需要迁移的菜单
[INFO] ✅ 更新菜单: welcome -> 欢迎
[INFO] ✅ 更新菜单: system -> 系统管理
[INFO] ✅ 更新菜单: user-management -> 用户管理
[INFO] ✅ 更新菜单: role-management -> 角色管理
[INFO] ✅ 更新菜单: menu-management -> 菜单管理
[INFO] ✅ 更新菜单: user-log -> 用户日志
[INFO] 菜单标题迁移完成！更新: 6, 跳过: 0
```

## 🚀 部署说明

### 自动迁移

修复后，只需重启应用即可：

```bash
# 停止应用
# Ctrl + C

# 重新启动
dotnet run --project Platform.AppHost
```

应用会自动执行以下步骤：
1. ✅ 检查数据库中的菜单
2. ✅ 识别缺少 title 的菜单
3. ✅ 自动补全中文标题
4. ✅ 记录迁移日志

### 手动迁移（可选）

如果需要手动为自定义菜单添加标题：

1. 进入菜单管理页面
2. 编辑菜单
3. 填写"标题"字段
4. 保存

## ⚠️ 注意事项

### 1. 新建菜单

从现在开始，创建新菜单时必须同时填写：
- **Name**（英文标识）：如 `user-management`
- **Title**（中文标题）：如 `用户管理`

### 2. 自定义菜单

如果您之前创建了自定义菜单，迁移脚本只会处理系统默认菜单。自定义菜单需要：
- 手动在菜单管理页面更新标题
- 或者在 `MigrateMenuTitles.cs` 的 `titleMappings` 中添加映射

### 3. 多语言支持

当前标题使用的是中文。如果需要支持多语言：
- 后续可以扩展为 `titleZh`, `titleEn`, `titleJa` 等字段
- 或者使用前端国际化系统根据 `name` 映射显示文本

## 📚 相关文件

**修改的文件**：
- [MenuService.cs](mdc:Platform.ApiService/Services/MenuService.cs) - 菜单服务
- [Program.cs](mdc:Platform.ApiService/Program.cs) - 应用入口

**新增的文件**：
- [MigrateMenuTitles.cs](mdc:Platform.ApiService/Scripts/MigrateMenuTitles.cs) - 迁移脚本

**相关模型**：
- [MenuModels.cs](mdc:Platform.ApiService/Models/MenuModels.cs) - 菜单数据模型
- [InitialMenuData.cs](mdc:Platform.ApiService/Scripts/InitialMenuData.cs) - 初始菜单数据

## 🔗 相关问题

此次修复解决了：
- ✅ 菜单权限弹窗显示英文 name 而非中文 title
- ✅ 菜单管理页面显示不友好
- ✅ 用户界面国际化不完整

## 📖 相关文档

- [菜单权限弹窗国际化修复](mdc:docs/bugfixes/MENU-PERMISSION-I18N-FIX.md)
- [多语言支持](mdc:docs/features/MULTILINGUAL-SUPPORT.md)
- [数据迁移指南](mdc:docs/optimization/README.md)

## 🎯 测试验证

### 验证步骤

1. **启动应用**
   ```bash
   dotnet run --project Platform.AppHost
   ```

2. **检查迁移日志**
   - 查看控制台输出
   - 确认菜单标题已更新

3. **测试菜单权限弹窗**
   - 登录系统
   - 进入角色管理
   - 点击"菜单权限"按钮
   - 验证菜单树显示中文标题

4. **测试菜单管理**
   - 进入菜单管理页面
   - 验证列表显示中文标题
   - 创建新菜单测试 title 字段

### 预期结果

- ✅ 所有默认菜单都显示中文标题
- ✅ 菜单树结构正确
- ✅ 新建菜单可以设置标题
- ✅ 更新菜单可以修改标题

## 🐛 故障排除

### 问题：迁移后仍显示英文

**可能原因**：
- 缓存未刷新
- 前端数据未重新加载

**解决方法**：
1. 刷新浏览器（Ctrl+F5 强制刷新）
2. 清除浏览器缓存
3. 重新登录

### 问题：自定义菜单没有标题

**原因**：迁移脚本只处理系统默认菜单

**解决方法**：
1. 手动编辑菜单添加标题
2. 或在 `MigrateMenuTitles.cs` 中添加映射后重启

## ✨ 未来改进

1. **完整的多语言支持**
   - 支持 `title_zh`, `title_en`, `title_ja` 等
   - 根据用户语言偏好自动切换

2. **自动翻译**
   - 集成翻译API自动生成多语言标题

3. **验证机制**
   - 创建菜单时强制要求填写标题
   - 添加字段验证规则

## 🎊 总结

此次修复彻底解决了菜单标题显示的问题：
- ✅ 修复了代码层面的字段缺失
- ✅ 迁移了数据库中的历史数据
- ✅ 自动化了迁移流程
- ✅ 提供了完整的文档和测试指南

用户现在可以看到友好的中文菜单标题，提升了系统的可用性和用户体验！

