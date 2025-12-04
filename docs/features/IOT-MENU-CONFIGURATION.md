# IoT 平台菜单配置说明

## 概述

IoT 平台功能已拆分为独立的页面，需要在数据库中配置相应的菜单项。主页面显示概览统计，各个功能模块（网关管理、设备管理、数据点管理、事件告警）作为独立的子菜单项。

## 路由配置

已创建以下路由：

- `/iot-platform` - 物联网平台概览（主页面）
- `/iot-platform/gateway-management` - 网关管理
- `/iot-platform/device-management` - 设备管理
- `/iot-platform/datapoint-management` - 数据点管理
- `/iot-platform/event-management` - 事件告警

## 数据库菜单配置

需要在 `Menu` 集合中创建以下菜单项：

### 1. 父菜单：物联网平台

```json
{
  "name": "iot-platform",
  "title": "物联网平台",
  "path": "/iot-platform",
  "icon": "CloudServerOutlined",
  "component": "/iot-platform",
  "sortOrder": 100,
  "isEnabled": true,
  "isVisible": true
}
```

### 2. 子菜单：网关管理

```json
{
  "name": "iot-platform-gateway",
  "title": "网关管理",
  "path": "/iot-platform/gateway-management",
  "icon": "CloudServerOutlined",
  "component": "/iot-platform/gateway-management",
  "parentId": "<父菜单ID>",
  "sortOrder": 1,
  "isEnabled": true,
  "isVisible": true
}
```

### 3. 子菜单：设备管理

```json
{
  "name": "iot-platform-device",
  "title": "设备管理",
  "path": "/iot-platform/device-management",
  "icon": "DesktopOutlined",
  "component": "/iot-platform/device-management",
  "parentId": "<父菜单ID>",
  "sortOrder": 2,
  "isEnabled": true,
  "isVisible": true
}
```

### 4. 子菜单：数据点管理

```json
{
  "name": "iot-platform-datapoint",
  "title": "数据点管理",
  "path": "/iot-platform/datapoint-management",
  "icon": "DatabaseOutlined",
  "component": "/iot-platform/datapoint-management",
  "parentId": "<父菜单ID>",
  "sortOrder": 3,
  "isEnabled": true,
  "isVisible": true
}
```

### 5. 子菜单：事件告警

```json
{
  "name": "iot-platform-event",
  "title": "事件告警",
  "path": "/iot-platform/event-management",
  "icon": "AlertOutlined",
  "component": "/iot-platform/event-management",
  "parentId": "<父菜单ID>",
  "sortOrder": 4,
  "isEnabled": true,
  "isVisible": true
}
```

## 权限配置

所有 IoT 平台相关的 API 端点都使用 `RequireMenu("iot-platform")` 权限检查。确保：

1. 角色拥有 `iot-platform` 菜单权限，才能访问所有 IoT 相关功能
2. 或者为每个子菜单配置独立的权限（如果需要在菜单级别进行更细粒度的控制）

## 页面说明

### 物联网平台概览 (`/iot-platform`)

- 显示平台整体统计信息
- 包括网关、设备、数据点、告警等统计数据
- 每 30 秒自动刷新

### 网关管理 (`/iot-platform/gateway-management`)

- 网关的增删改查
- 网关状态监控
- 网关统计信息查看

### 设备管理 (`/iot-platform/device-management`)

- 设备的增删改查
- 设备状态监控
- 设备统计信息查看
- 支持按网关筛选

### 数据点管理 (`/iot-platform/datapoint-management`)

- 数据点的增删改查
- 数据点配置管理
- 支持按设备筛选

### 事件告警 (`/iot-platform/event-management`)

- 设备事件查询
- 告警处理
- 事件筛选和搜索

## 注意事项

1. 所有路由都已配置为 `hideInMenu: true`，菜单完全由数据库控制
2. 确保菜单的 `component` 字段与路由路径匹配
3. 子菜单的 `parentId` 必须指向父菜单的 ID
4. 菜单的 `name` 字段用于权限检查，确保与后端 `RequireMenu` 属性中的值一致

