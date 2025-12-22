## 菜单级权限与角色模型规范

> 本文档详细说明菜单级权限模型、`RequireMenuAttribute` 使用方式以及角色与菜单的关系，`.cursor/rules/rule.mdc` 只保留硬规则摘要与链接。

### 1. 权限模型总览

- **核心思想**：后端以「菜单」为权限粒度，角色只持有菜单 ID 列表；拥有某菜单即拥有该菜单下对应 API 的访问权限。
- **关键实体**：
  - 菜单：定义前端路由/页面以及相关 API 所需的菜单标识。
  - 角色：仅包含一组 `MenuIds`，不直接存储“权限字符串”。
  - 用户-企业关系：在指定企业下，用户被授予若干角色，从而间接获得若干菜单。
- **禁止**：
  - 禁止在业务代码中硬编码角色名称进行授权判断（除极少数平台级管理员判断外）。
  - 禁止使用旧的 `RequirePermission` 风格自定义属性或手写权限检查逻辑。

### 2. RequireMenuAttribute 使用规范

- **位置**：`Platform.ApiService.Attributes.RequireMenuAttribute`。
- **用途**：在控制器或动作方法上声明访问该资源所需的“菜单标识”。
- **实现要点**：
  - 通过 `IAsyncAuthorizationFilter.OnAuthorizationAsync` 实现异步授权。
  - 从 `HttpContext.User` 读取 `userId`，通过 DI 获取 `IMenuAccessService`。
  - 调用 `HasMenuAccessAsync(userId, MenuName)` 判断是否具备该菜单访问权限。
  - 认证失败或菜单访问不足时，返回标准 JSON 错误结构（`success=false` / `errorCode=UNAUTHORIZED|FORBIDDEN`）。
- **使用示例**：
  ```csharp
  [Route("api/workflow")]
  [RequireMenu("workflow:list")]  // 权限标识使用 : 分隔
  public class WorkflowController : BaseApiController
  {
      [HttpGet]
      [RequireMenu("workflow:list")] // 可加在类或方法上
      public async Task<IActionResult> GetList([FromQuery] WorkflowQueryParams query)
      {
          var result = await _service.GetPagedAsync(query);
          return SuccessPaged(result.Items, result.Total, query.Current, query.PageSize);
      }
      
      [HttpPost]
      [RequireMenu("workflow:create")]  // 创建操作需要 workflow:create 权限
      public async Task<IActionResult> Create([FromBody] CreateWorkflowRequest request)
      {
          // ...
      }
  }
  ```
  
  **注意**：`RequireMenu` 中的标识是权限标识（使用 `:` 分隔），对应菜单定义中的 `Permissions` 字段，而不是菜单名称（菜单名称使用 `-` 分隔）。

### 3. 菜单命名与组织约定

- **菜单名称规范**（数据库中的 `Menu.Name` 字段）：
  - **统一使用连字符 `-` 分隔**，格式为 `模块-资源` 或 `模块-操作`，例如：
    - 系统管理：`user-management`、`role-management`、`company-management`
    - 项目管理：`project-management-task`、`project-management-project`
    - IoT 平台：`iot-platform-gateway`、`iot-platform-device`、`iot-platform-datapoint`
    - 小科管理：`xiaoke-management-config`、`xiaoke-management-chat-history`
    - 工作流管理：`workflow-list`、`workflow-monitor`
    - 公文管理：`document-list`、`document-approval`
  - **子菜单命名规则**：子菜单名称必须包含父菜单前缀，使用 `-` 连接
  - **禁止使用冒号 `:` 作为分隔符**

- **权限标识规范**（`RequireMenu` 属性中使用的标识）：
  - **使用冒号 `:` 分隔**，格式为 `模块:资源:操作`，例如：
    - `workflow:list`、`workflow:create`、`workflow:monitor`
    - `document:list`、`document:create`、`document:approval`
    - `user:read`、`user:invite`、`user:disable`
  - **注意**：权限标识与菜单名称是不同的概念，两者通过 `Menu.Permissions` 字段建立映射关系

- **菜单定义位置**：
  - 所有系统菜单在 `Platform.DataInitializer/Services/DataInitializerService.cs` 的 `GetExpectedMenus` 方法中定义
  - 新增菜单时需要在 `GetParentMenuNameByChildName` 方法中添加映射，并更新前端翻译文件
- **前后端统一**：
  - 后端的菜单标识应与前端路由配置/菜单 key 保持可映射关系，方便在前端展示“你拥有哪些菜单”。
  - 前端 `convertMenuTreeToProLayout` 函数会根据菜单路径和名称自动生成 locale 键，格式为 `menu.模块.资源`（使用 `.` 分隔）
  - 但**前端不再以菜单是否展示作为权限判断的唯一手段**，最终访问权限以后端的 `RequireMenu` 判定为准。

### 4. 角色与菜单的关系

- **角色内容**：
  - 角色对象只包含菜单 ID 列表（或菜单标识列表），不包含“按钮级权限字符串”。
  - 授权逻辑：用户在某企业下被授予若干角色 → 角色合并后的菜单列表 → 拥有的菜单集合。
- **权限判定流程**（简化）：
  1. `RequireMenu("workflow:list")` 在请求时被触发（权限标识使用 `:` 分隔）。
  2. 从 JWT 中取 `userId`。
  3. 通过 `IMenuAccessService` 查询：
     - 用户在当前企业下的角色；
     - 这些角色对应的菜单集合（菜单名称使用 `-` 分隔，如 `workflow-list`）；
     - 检查菜单的 `Permissions` 字段是否包含目标权限标识（如 `workflow:list`）；
     - 判断用户是否拥有该权限。
  4. 返回 401 / 403 或放行。

### 5. 匿名访问与白名单

- 默认所有业务 API 需要认证 + 菜单权限。
- 如需公开或登录前访问的接口（如登录、验证码、健康检查），应通过：
  - 在认证中间件层配置匿名白名单；
  - 或在控制器层使用允许匿名的方式（例如 `[AllowAnonymous]`，结合路由约定）。
- **注意**：即便允许匿名访问，也不应在此类 API 上使用 `RequireMenu`。

### 6. 常见错误示例

- **错误 1：仍使用旧的 RequirePermission**
  ```csharp
  // ❌ 禁止直接使用旧的权限属性或自定义属性
  [RequirePermission("rule:delete")]
  public async Task<IActionResult> Delete(string id) { ... }
  ```
- **错误 2：硬编码角色名**
  ```csharp
  // ❌ 不推荐：直接判断角色名进行授权
  if (CurrentUserRole != "admin") {
      throw new UnauthorizedAccessException();
  }
  ```
- **正确做法**：统一使用 `RequireMenu` + `IMenuAccessService` + `ITenantContext`。

### 7. 在 Cursor Rules 总纲中的位置

- `.cursor/rules/rule.mdc` 中仅保留以下**硬规则摘要**：
  - 权限采用菜单级模型，角色只包含 `MenuIds`；
  - 控制器和方法上统一使用 `RequireMenuAttribute` 声明访问菜单；
  - 前端不再隐藏按钮来“假装”权限控制，最终判断由后端完成；
  - 禁止继续使用旧的 `RequirePermission` 模型和硬编码角色名授权。
- 详细设计、命名建议与示例请以本文件为准。


