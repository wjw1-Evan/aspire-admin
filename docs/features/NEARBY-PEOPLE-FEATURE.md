# 附近的人功能

## 📋 概述
- 新增 `/api/social` 下的定位上报与附近用户查询接口，为移动端提供类似微信“附近的人”体验。
- 会话和好友体系保持复用：点选附近用户可直接跳转既有聊天或进入聊天页等待创建。
- 移动端 `app/people/nearby.tsx` 重构 UI，支持范围筛选、刷新提醒与暗色模式。

## 🔌 后端能力

### 数据模型
- `UserLocationBeacon`：继承 `MultiTenantEntity`，记录用户坐标、精度、速度及最后上报时间。
- `GeoPoint`、`NearbyUsersRequest`、`NearbyUsersResponse`、`NearbyUserDto`：承载请求/响应数据。

### 新增 API
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/social/location/beacon` | 上报当前位置，幂等更新。 |
| `POST` | `/api/social/nearby-users` | 查询附近用户列表，支持半径/数量限制。 |

#### `/api/social/location/beacon`
```json
{
  "latitude": 30.27415,
  "longitude": 120.15515,
  "accuracy": 12.5,
  "altitude": 8.2,
  "heading": 120,
  "speed": 1.2
}
```

#### `/api/social/nearby-users`
请求：
```json
{
  "center": { "latitude": 30.27415, "longitude": 120.15515 },
  "radiusMeters": 2000,
  "limit": 16,
  "interests": ["技术达人", "健身"]
}
```

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "userId": "64f0...",
        "displayName": "小科",
        "avatarUrl": "https://example.com/avatar.png",
        "distanceMeters": 186.3,
        "lastActiveAt": "2025-11-08T17:59:59.089Z",
        "location": {
          "latitude": 30.27491,
          "longitude": 120.15463,
          "accuracy": 10
        },
        "interests": ["技术达人"],
        "sessionId": "690f7413401a1b6dc20a85d5"
      }
    ],
    "total": 1,
    "nextRefreshAfter": 60
  },
  "timestamp": "2025-11-08T18:05:13.571Z"
}
```

### 业务规则
- 仅返回同企业用户，自动忽略自己及 AI 助手 (`64f0000000000000000000aa`)。
- 仅搜索 30 分钟内上报的信标；老旧记录通过 TTL 索引自动清理。
- 先通过经纬度包围盒粗筛，再用哈弗森公式计算精确距离。
- 默认半径 2000m，限制范围 100–20000m；最多返回 50 人。
- 如已存在双人会话，响应附带 `sessionId`，移动端可直接进入聊天。

### 索引与持久化
- `Platform.DataInitializer` 新增索引：
  - `companyId + userId` 唯一索引，保证单企业单用户仅一条信标。
  - `companyId + lastSeenAt`，支撑最近活跃排序。
  - `lastSeenAt` TTL（2 小时），自动清理过期信标。

## 📱 移动端更新
- `useNearbyUsers` 统一处理定位权限 → 上报 → 获取列表，返回刷新结果。
- `app/people/nearby.tsx`：
  - 顶部新增“探索卡片”，显示刷新时间与距离筛选 Chips（0.5/1/2/5 公里）。
  - 支持一键刷新，过程内有加载状态提示。
  - 列表卡片展示距离、最近活跃时间、兴趣标签，暗色模式优化。
  - 列表为空时提供友好占位与刷新指引。
- `ChatContext`/`chatActions`：`refreshNearbyUsers` 返回查询结果，便于前端更新 UI。
- `AppUser` 模型新增 `Avatar`、`Tags` 字段，支持个性化显示与兴趣过滤。

## 🔧 关键技术实现
- `SocialService` 封装核心逻辑：位置上报、附近搜索、距离计算、会话复用。
- `SocialController` 统一入口，返回标准 `ApiResponse` 格式，便于前端处理。
- 使用 `IDatabaseOperationFactory<T>` 处理所有 MongoDB 操作，符合多租户规范。
- 位置上报时自动填充 `CompanyId`、审计字段；更新采用原子写入。
- interest 过滤基于用户 `Tags`（若暂无数据则忽略过滤，兼容已有账号）。

## 🧪 测试建议
1. `dotnet run --project Platform.AppHost` 启动全链路环境。
2. 使用两个账号登录移动端，允许定位权限。
3. 在 A 设备上打开发现页，记录显示列表。
4. 在 B 设备上移动定位或模拟不同坐标，再次刷新 A 设备列表，确认距离/活跃时间实时更新。
5. 验证点击附近用户：
   - 若已有会话应直接进入聊天。
   - 无会话时跳转聊天页，可手动发起对话。
6. 切换暗色模式检查背景、文字、按钮对比度。
7. 验证拒绝定位权限时不崩溃，并保持刷新按钮可重试。

## 📚 相关文档
- [聊天后端 API 实现说明](CHAT-BACKEND-API.md)
- [SignalR 实时聊天集成说明](CHAT-REALTIME-SIGNALR.md)
- [移动端通讯录与好友系统](FRIEND-CONTACTS-FEATURE.md)

