# 手机通讯录与好友系统

## 📋 概述

本次迭代为移动端新增“通讯录”页面，提供类似微信的好友列表体验，并完善后端好友管理能力。用户可以通过手机号搜索他人、发送好友请求、查看并处理好友申请，以及从通讯录直接发起实时聊天。

## ✨ 核心能力

- 手机端新增“通讯录”页签，展示好友列表并支持下拉刷新。
- 支持通过手机号精确搜索用户，判定是否已是好友或存在待处理的请求。
- 新增好友请求中心，可接受或拒绝他人请求，并查看自己发出的申请。
- 一键从通讯录进入聊天，会自动复用或创建私聊会话（基于 SignalR 的实时消息能力）。

## 🔧 后端实现

- **新数据模型**：
  - `FriendRequest`：记录好友请求（请求人、目标人、附言、状态、处理时间等）。
  - `Friendship`：存储双向好友关系（按用户维度存两条记录）。
- **扩展 AppUser**：新增 `PhoneNumber` 字段，并在注册流程中校验格式与唯一性。
- **服务层**：实现 `IFriendService`，提供好友搜索、请求管理、好友列表及创建私聊会话等方法。
- **API 控制器**：新增 `FriendsController`，覆盖如下端点：
  - `GET /api/friends`：好友列表
  - `GET /api/friends/search?phone=`：手机号搜索
  - `POST /api/friends/requests`：发送好友请求
  - `GET /api/friends/requests?direction=`：查询待处理请求（incoming / outgoing）
  - `POST /api/friends/requests/{id}/approve|reject`：处理请求
  - `POST /api/friends/{friendId}/session`：获取或创建私聊会话
- **索引与检查**：在数据初始化脚本中新增 AppUser(Phone)、Friendship、FriendRequest 等集合的索引创建。
- **聊天集成**：`ChatService` 新增 `GetOrCreateDirectSessionAsync`，用于快速复用或创建双人会话。
- **AI 助手架构**：引入 `AiAssistantCoordinator` 与 `AiCompletionService`，无需真实 AppUser 账号即可为每位用户创建虚拟好友；助手回复通过后端 HttpClient 调用配置的大模型接口，并将用户与助手的全部对话记录存入 `ChatMessage`。

## 📱 前端实现（Platform.App）

- 新增 `contacts.tsx` 页面，加入底部 Tab 栏（图标：`person.2.fill`）。
- `useFriends` Hook 统一管理好友、请求及搜索状态，与新后端接口对接。
- 支持：
  - 下拉刷新好友及请求
  - 输入手机号搜索并发送好友请求
  - 查看“新的好友”列表并即时接受 / 拒绝
  - 直接从好友项进入聊天（自动创建或复用会话）
- UI 细节遵循主题系统，深浅色模式皆表现良好。

## ✅ 接口示例

```http
GET /api/friends/search?phone=13800138000
Authorization: Bearer {token}

{
  "success": true,
  "data": [
    {
      "userId": "6820...",
      "username": "amy",
      "displayName": "Amy",
      "phoneNumber": "13800138000",
      "isFriend": false,
      "hasPendingRequest": false,
      "isIncomingRequest": false
    }
  ],
  "timestamp": "2025-11-07T05:21:00Z"
}
```

```http
POST /api/friends/requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetUserId": "6820...",
  "message": "你好，一起交流一下～"
}
```

```http
POST /api/friends/{friendId}/session
Authorization: Bearer {token}

{
  "success": true,
  "data": {
    "sessionId": "6831...",
    "friendUserId": "6820..."
  },
  "timestamp": "2025-11-07T05:25:12Z"
}
```

## 🔍 主题与可访问性

- 所有新增界面遵循 `ThemeContext`，支持深色 / 浅色模式。
- 动态颜色统一取自 `Colors.tint`、`Colors.card`、`Colors.tabIconDefault` 等主题常量，避免硬编码。
- 操作反馈通过 `Alert` 展示，关键按钮使用高对比色并提供禁用态。

## 🧪 验证与测试建议

1. 启动 Aspire 应用（`dotnet run --project Platform.AppHost`）。
2. 使用两个账号登录移动端，分别设置唯一手机号。
3. 在 A 账号中搜索 B 的手机号并发送请求：
   - B 的“新的好友”列表应出现请求。
   - B 接受后，两端都应在通讯录看到对方，并可直接聊天。
4. 验证重复请求、接受/拒绝流程、以及重新进入聊天时复用会话。

## 📚 相关文档

- [实时聊天 SignalR 集成](CHAT-REALTIME-SIGNALR.md)
- [主题系统使用指南](../theme-system.mdc)

## 🗒️ 后续规划

- 用户资料页面新增手机号维护功能。
- 在“附近的人”等社交入口集成直接添加好友操作。
- 通讯录列表支持拼音排序与字母索引。

## ✨ 新增亮点

- **内置小科 AI 助手**
  - 助手作为虚拟联系人存在，不占用真实账户资源；首次访问聊天即会自动生成专属会话
  - 后端通过 `IAiCompletionService` 统一调用大模型接口，所有双方消息均写入 `ChatMessage` 集合便于审计
  - 在聊天窗口中，助手可以实时回复文本问题；当模型不可用时会返回友好的降级提示
  - 通讯录中以与普通好友一致的样式置顶展示，并由系统固定保留不可删除

