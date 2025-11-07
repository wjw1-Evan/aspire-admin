# 聊天后端 API 实现说明

## 📋 概述

为配合移动端 `Platform.App` 聊天体验，本次新增 `ChatService` 及一组 REST API，用于管理会话、消息时间线、附件上传与已读状态。所有接口均要求登录用户身份，依托 `IDatabaseOperationFactory<T>` 自动应用企业隔离。

## 🏗️ 主要组件

- **数据模型**：`ChatSession`、`ChatMessage`、`ChatAttachment`（位于 `Models/ChatModels.cs`）。
- **业务服务**：`IChatService`/`ChatService`（`Services/ChatService.cs`），封装会话分页、消息发送、附件存储（GridFS）与未读计数维护。
- **控制器**：
  - `ChatSessionsController` (`api/chat/sessions`) – 会话分页查询。
  - `ChatMessagesController` (`api/chat/messages`) – 时间线、发送消息、附件上传、已读与删除操作。
- **索引脚本**：`Scripts/ChatIndexes.cs`，初始化 `chat_sessions` 与 `chat_messages` 的复合索引。

## 🔌 API 入口

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 获取会话列表 | `GET` | `/api/chat/sessions` | 支持 `page`、`pageSize`、`keyword` 查询参数，返回 `PaginatedResponse<ChatSession>` |
| 获取消息时间线 | `GET` | `/api/chat/messages/{sessionId}` | 支持 `limit`、`cursor`，返回 `ChatMessageTimelineResponse`，按时间正序 |
| 发送消息 | `POST` | `/api/chat/messages` | 请求体 `SendChatMessageRequest`，支持文本、文件、图片类型 |
| 上传附件 | `POST` | `/api/chat/messages/{sessionId}/attachments` | `multipart/form-data`，返回 `UploadAttachmentResponse`，内部使用 GridFS 存储 |
| 标记已读 | `POST` | `/api/chat/messages/{sessionId}/read` | 请求体 `MarkSessionReadRequest`，清零当前用户未读计数 |
| 删除消息 | `DELETE` | `/api/chat/messages/{sessionId}/{messageId}` | 软删除，仅允许消息发送者操作 |

所有接口默认返回 `ApiResponse<T>` 包裹的结果结构，异常由 `GlobalExceptionMiddleware` 统一处理。

## 💾 数据存储策略

- **会话 (`chat_sessions`)**：自动维护 `LastMessageId/Excerpt/At`、`Participants`、`UnreadCounts` 字典。
- **消息 (`chat_messages`)**：按会话 + 时间倒序索引，支持游标式分页，附件摘要存于消息文档中。
- **附件 (`chat_attachments`)**：元数据单独持久化，`StorageObjectId` 指向 GridFS 文件，下载地址统一走 API 代理。
- **索引**：
  - `companyId + updatedAt`、`companyId + participants`
  - `companyId + sessionId + createdAt`、`companyId + senderId + createdAt`

## 🔐 权限与安全

- 所有资源实现 `IMultiTenant`，依赖工厂自动注入 `CompanyId` 与租户过滤。
- 会话访问需验证用户是否在 `Participants` 列表内，否则抛出 `UnauthorizedAccessException`。
- 附件上传与下载需通过会话成员身份校验，禁止跨会话访问。
- 附件内容采用 SHA-256 校验，存储于 GridFS `chat_attachments` bucket。

## ✅ 测试要点

1. 使用 `dotnet run --project Platform.AppHost` 启动后端与前端，登录移动端账号。
2. 验证会话分页、消息时间线滚动、附件上传/下载、未读数与已读同步。
3. 利用 Scalar (`/scalar/v1`) 查看 OpenAPI 文档，确认新接口摘要与示例正确展示。
4. 运行 `ChatIndexes` 脚本（或重新执行 DataInitializer）以创建新的 Mongo 索引。

## 📚 相关文件

- `Platform.ApiService/Models/ChatModels.cs`
- `Platform.ApiService/Services/IChatService.cs`
- `Platform.ApiService/Services/ChatService.cs`
- `Platform.ApiService/Controllers/ChatSessionsController.cs`
- `Platform.ApiService/Controllers/ChatMessagesController.cs`
- `Platform.ApiService/Scripts/ChatIndexes.cs`

