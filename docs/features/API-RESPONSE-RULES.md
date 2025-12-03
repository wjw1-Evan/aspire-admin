## 统一 API 响应与控制器规范

> 本文档展开说明 `ApiResponse<T>`、`PagedResult<T>` 与 `BaseApiController` 的使用规范，`.cursor/rules/rule.mdc` 只保留硬规则摘要。

### 1. ApiResponse<T> 统一模型

- **位置**：`Platform.ServiceDefaults.Models.ApiResponse<T>`。
- **结构约定**：
  - `success: bool`：操作是否成功（必填）。
  - `data: T?`：业务数据，失败时通常为 `null`。
  - `errorCode: string?`：错误代码（仅失败时有值）。
  - `errorMessage: string?`：面向用户/前端的错误消息。
  - `timestamp: string`：ISO UTC 时间字符串，由模型默认填充。
  - `traceId: string?`：请求追踪 ID，一般由 `HttpContext.TraceIdentifier` 赋值。
- **静态工厂方法**：
  - `SuccessResult(T data, string? traceId = null)`：创建成功响应。
  - `ErrorResult(string errorCode, string errorMessage, string? traceId = null)`：创建失败响应。
  - `ValidationErrorResult(string errorMessage, string? traceId = null)`：验证错误。
  - `NotFoundResult(string resource, string id, string? traceId = null)`：资源未找到。
  - `UnauthorizedResult(string message = "未授权访问", string? traceId = null)`：未授权。
  - `PagedResult(IEnumerable<T> data, long total, int page, int pageSize, string? traceId = null)`：分页成功响应。

### 2. 分页模型 PagedResult<T>

- **位置**：`Platform.ServiceDefaults.Models.PagedResult<T>`。
- **字段**：
  - `list: List<T>`：数据列表。
  - `total: long`：总记录数。
  - `page: int`：当前页码。
  - `pageSize: int`：每页大小。
  - `totalPages: int`：总页数（由 `total` / `pageSize` 推导）。
- **约定**：
  - 所有分页接口统一返回 `ApiResponse<PagedResult<T>>`。
  - 分页参数命名统一使用 `page` / `pageSize`（或在 Query DTO 中保持一致语义）。

### 3. BaseApiController 使用规范

- **位置**：`Platform.ServiceDefaults.Controllers.BaseApiController`。
- **强制规则**：
  - 所有 API 控制器必须继承自 `BaseApiController`，而不是直接继承 `ControllerBase`。
  - 禁止在控制器中直接构造 `ApiResponse<T>` 或返回裸 JSON，统一通过基类方法。
- **核心辅助方法**：
  - `Success<T>(T data, string? message = null)`：返回 `ApiResponse<T>` 成功响应。
  - `Success(string? message = null)`：无数据成功响应（`data` 为 `null`）。
  - `SuccessPaged<T>(IEnumerable<T> data, long total, int page, int pageSize)`：分页成功响应。
  - `Error(string errorCode, string errorMessage)`：业务错误。
  - `ValidationError(string errorMessage)`：参数/模型验证错误。
  - `NotFoundError(string resource, string id)`：未找到资源。
  - `UnauthorizedError(string message = "未授权访问")`：未授权。
  - `ForbiddenError(string message = "禁止访问")`：403。
  - `ServerError(string message = "服务器内部错误")`：500。
- **控制器示例**：
  ```csharp
  [ApiController]
  [Route("api/resources")]
  public class ResourceController : BaseApiController
  {
      private readonly IResourceService _service;

      public ResourceController(IResourceService service)
      {
          _service = service;
      }

      [HttpGet("{id}")]
      public async Task<IActionResult> GetById(string id)
      {
          var resource = await _service.GetByIdAsync(id);
          return Success(resource.EnsureFound("资源", id));
      }
  }
  ```

### 4. 错误码与错误处理约定

- **标准错误码**（建议统一使用以下常量）：
  - `VALIDATION_ERROR`：参数或模型验证失败。
  - `NOT_FOUND`：目标资源不存在。
  - `UNAUTHORIZED`：未认证或认证信息无效。
  - `FORBIDDEN`：已认证但无访问权限。
  - `INTERNAL_ERROR`：未预期的服务器内部错误。
- **使用建议**：
  - 验证错误优先使用 `ValidationErrorResult` / `ValidationError`。
  - 找不到资源时优先使用 `EnsureFound` + `NotFoundError` 或 `NotFoundResult`。
  - 鉴权失败统一通过 `UnauthorizedError` 或中间件，而不是随意返回 200 + 错误信息。
  - 对前端暴露的 `errorMessage` 要可读、可本地化，不暴露内部实现细节。

### 5. 与中间件的关系

- **首选方式**：新的 API 控制器全部通过 `BaseApiController` 返回 `ApiResponse<T>`，从源头保证统一格式。
- **兼容方式**：`ResponseFormattingMiddleware` 会对仍返回裸 JSON 的旧接口进行兜底包装：
  - 将原始 JSON 作为 `data` 字段；
  - 设置 `success = true`，并补充 `timestamp`。
- **建议**：
  - 新增和改造接口时，应直接使用 `BaseApiController` 辅助方法，而不是依赖中间件兜底行为。
  - 对外公开文档只描述 `ApiResponse<T>` 结构，不要求调用方关心中间件存在与否。

### 6. 在 Cursor Rules 总纲中的位置

- `.cursor/rules/rule.mdc` 中仅保留以下**硬规则摘要**：
  - 所有后端 API 必须以 `ApiResponse<T>` 为统一返回模型；
  - 控制器必须继承 `BaseApiController` 并使用其辅助方法；
  - 分页统一返回 `ApiResponse<PagedResult<T>>`，并遵守字段约定；
  - 错误码需使用统一约定，不得任意自造格式。
- 详细结构、枚举与示例以本文件为准。


