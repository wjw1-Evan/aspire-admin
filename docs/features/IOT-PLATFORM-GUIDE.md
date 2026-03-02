# 物联网平台开发指南 (IoT Platform)

> 本文档说明 Aspire Admin IoT 平台的架构设计、设备接入与监控逻辑。

## 📋 概述

IoT 平台提供四位一体的管理体系：网关管理、设备状态监控、数据点实时采集与事件告警闭环。

核心服务：`Platform.ApiService/Services/IoTService.cs`

## 🏗️ 平台架构

### 1. 网关 (Gateway)
连接物理设备与云端的桥梁。支持状态检测、心跳维护与远程配置同步。

### 2. 设备 (Device)
挂载在网关下的终端实体。系统支持数万级设备的挂载与实时监控。

### 3. 数据点 (DataPoint)
设备采集的具体业务指标（如温度、湿度、电压、开关状态）。
- **实时性**: 支持高频数据采集。
- **持久化**: 采用时序友好的存储策略。

### 4. 事件与告警 (Event & Alert)
设备状态异常或数据点超过阈值时触发。
- **生命周期**: 触发 -> 待处理 -> 处理中 -> 已关闭。

## 🔄 数据流转

1. **采集**: `IoTDataCollector` 获取原始报文。
2. **清洗**: 验证合法性，解析为统一的数据点格式。
3. **存储**: 写入数据库，并更新设备最新快照。
4. **分发**: 通过 SSE 实时推送到管理前端展示。
5. **检测**: 触发规则引擎进行告警判断。

## 🛠️ 核心后台任务 (Hosted Services)

- **IoTGatewayStatusCheckHostedService**: 每分钟检查一次网关在线状态。
- **IoTDataCollectionHostedService**: 处理异步数据采集队列，确保吞吐量。
- **IoTDataRetentionHostedService**: 自动清理过期历史数据，保持数据库性能。

## 🚀 API 规范

- 控制器：`IoTController.cs`
- 权限：所有操作均通过 `[RequireMenu("iot-platform")]` 保护。

## 📝 开发指南
- ✅ 接入新网关时，需确保 `DeviceId` 全局唯一。
- ✅ 高频数据点应配置合理的采样率，避免数据库过载。
- ✅ 告警逻辑优先在后端 `IoTService` 中预定义规则。

---
相关文档：
- [IoT 菜单配置说明](IOT-MENU-CONFIGURATION.md)
- [SSE 实时通信指南](SSE-REALTIME-COMMUNICATION.md)
