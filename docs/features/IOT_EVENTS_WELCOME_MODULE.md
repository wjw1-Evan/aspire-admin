# IoT 事件告警模块 - 欢迎页面集成

## 概述

在欢迎页面右侧列添加了物联网平台事件告警模块，用于实时显示未处理的 IoT 设备事件。

## 功能特性

### 1. 实时事件显示
- 显示最近 5 条未处理的 IoT 事件
- 按事件发生时间倒序排列
- 支持事件级别颜色标识（Critical/Error/Warning/Info）

### 2. 事件信息展示
- **事件级别**：Critical（红）、Error（橙）、Warning（金）、Info（蓝）
- **事件类型**：Connected、Disconnected、DataReceived、Alarm、Error
- **事件描述**：详细的事件说明文本
- **设备 ID**：关联的设备标识
- **发生时间**：相对时间显示（刚刚、N分钟前、N小时前、N天前）

### 3. 未处理事件计数
- 顶部 Badge 显示未处理事件总数
- 当有未处理事件时显示警告提示

### 4. 自动轮询
- 每 30 秒自动刷新一次事件数据
- 页面不可见时停止轮询，节省资源
- 页面恢复可见时立即刷新

### 5. 权限控制
- 仅当用户有 IoT 平台访问权限时显示
- 无权限时模块自动隐藏

### 6. 快速导航
- "查看全部" 按钮可快速跳转到事件管理页面

## 文件结构

```
Platform.Admin/
├── src/
│   ├── pages/
│   │   ├── Welcome.tsx                          # 欢迎页面（已更新）
│   │   └── welcome/
│   │       └── components/
│   │           ├── index.ts                     # 导出文件（已更新）
│   │           └── IoTEventAlertsCard.tsx       # 新增组件
│   ├── services/
│   │   └── iot/
│   │       └── api.ts                           # 新增 API 服务
│   └── locales/
│       └── zh-CN/
│           └── pages.ts                         # 国际化翻译（已更新）
```

## API 接口

### 查询 IoT 事件
```typescript
queryIoTEvents(params: IoTEventQueryRequest): Promise<ApiResponse<IoTEventQueryResponse>>
```

**参数**：
- `isHandled`：是否已处理（false 表示未处理）
- `pageIndex`：页码（从 1 开始）
- `pageSize`：每页数量
- `sortBy`：排序字段（如 'occurredAt'）
- `sortOrder`：排序顺序（'asc' 或 'desc'）

**返回**：
```typescript
{
  list: IoTDeviceEvent[],
  total: number,
  page: number,
  pageSize: number
}
```

### 获取未处理事件数量
```typescript
getUnhandledEventCount(deviceId?: string): Promise<ApiResponse<number>>
```

## 国际化支持

已添加完整的中文翻译，支持以下键：

- `pages.welcome.iotEvents.title` - 模块标题
- `pages.welcome.iotEvents.empty` - 空状态提示
- `pages.welcome.iotEvents.unhandledAlert` - 未处理事件警告
- `pages.welcome.iotEvents.type.*` - 事件类型翻译
- `pages.welcome.iotEvents.time.*` - 时间格式翻译

## 使用示例

组件会自动在欢迎页面右侧列显示，无需额外配置：

```tsx
<IoTEventAlertsCard loading={loading} />
```

## 性能优化

1. **轮询优化**：
   - 使用 `document.visibilityState` 检测页面可见性
   - 页面不可见时停止轮询
   - 页面恢复可见时立即刷新

2. **错误处理**：
   - API 调用失败时仅记录警告，不中断流程
   - 支持优雅降级

3. **内存管理**：
   - 组件卸载时清理定时器和事件监听器
   - 避免内存泄漏

## 后端 API 要求

后端 IoT 控制器需要提供以下端点：

1. `POST /api/iot/events/query` - 查询事件列表
2. `GET /api/iot/events/unhandled-count` - 获取未处理事件数量

## 扩展建议

1. **实时推送**：可考虑使用 SSE 或 WebSocket 替代轮询
2. **事件过滤**：支持按事件类型、级别等过滤
3. **事件处理**：添加快速处理按钮
4. **事件详情**：点击事件显示详细信息弹窗
