# 物联网平台数据采集流程详解

## 概述

物联网平台采用统一采集模式，根据网关类型自动选择处理策略。系统通过定时任务自动采集数据，支持HTTP网关的零配置快速接入和非HTTP网关的精细控制。

## 整体架构

```
定时调度服务 (IoTDataCollectionHostedService)
    ↓
统一采集执行器 (IoTDataCollector)
    ↓
┌─────────────────────────────────────┐
│ 按网关类型自动处理                  │
│                                     │
│ HTTP网关 → 简化模式                 │
│   (SimpleHttpDataCollector)        │
│                                     │
│ 非HTTP网关 → 传统模式               │
│   (ProcessDeviceAsync)              │
└─────────────────────────────────────┘
    ↓
数据获取客户端 (HttpIoTDataFetchClient)
    ↓
数据记录保存 (IoTDataRecord)
    ↓
统计信息更新 (设备/数据点)
```

## 详细流程

### 1. 定时调度层（IoTDataCollectionHostedService）

**职责**：按Cron表达式定时触发数据采集任务

**关键代码**：`Platform.ApiService/Services/IoTDataCollectionHostedService.cs`

**流程**：
1. 服务启动后进入调度循环
2. 检查配置是否启用（`options.Enabled`）
3. 解析Cron表达式，计算下次执行时间
4. 等待到执行时间后调用 `RunOnceAsync()`
5. 使用信号量确保同一时间只有一个采集任务运行

**配置参数**：
- `Enabled`: 是否启用定时采集
- `Cron`: Cron表达式（默认：`0 */5 * * * *`，每5分钟）
- `TimeoutSeconds`: 单次运行超时时间（默认120秒）

**特点**：
- ✅ 支持动态更新Cron表达式（通过配置热更新）
- ✅ 防止并发执行（使用信号量）
- ✅ 异常隔离（单个任务失败不影响后续调度）

---

### 2. 统一采集入口（IoTDataCollector.RunOnceAsync）

**职责**：统一处理所有网关的数据采集

**关键代码**：`Platform.ApiService/Services/IoTDataCollector.cs`

**流程**：
```
1. 检查配置是否启用
   ↓
2. 设置超时控制（基于配置的TimeoutSeconds）
   ↓
3. 查询所有启用的网关（跨租户查询）
   - 过滤条件：IsEnabled = true, 未删除
   ↓
4. 按租户分组处理（确保数据隔离）
   ↓
5. 并行处理每个网关（使用信号量控制并发度）
   - 并发度：MaxDegreeOfParallelism（默认4）
   ↓
6. 合并统计结果
   - 设备处理数
   - 数据点处理数
   - 记录插入数
   - 记录跳过数
   - 警告信息
```

**关键特性**：
- ✅ 跨租户查询（后台服务需要处理所有租户）
- ✅ 按租户分组处理（确保数据隔离）
- ✅ 并行处理（提高效率）
- ✅ 超时控制（防止任务卡死）
- ✅ 异常隔离（单个网关失败不影响其他网关）

---

### 3. 网关处理层（ProcessGatewayAsync）

**职责**：根据网关类型自动选择处理策略

**关键代码**：`Platform.ApiService/Services/IoTDataCollector.cs:ProcessGatewayAsync`

**处理策略**：

#### 3.1 HTTP网关 → 简化模式

**流程**：
```
1. 检查网关协议类型是否为HTTP
   ↓
2. 创建 SimpleHttpDataCollector 实例
   ↓
3. 调用 CollectGatewayDataAsync()
   ↓
4. 返回采集结果
```

**特点**：
- ✅ 自动创建/获取设备
- ✅ 自动发现数据点（从HTTP响应）
- ✅ 直接从网关地址采集
- ✅ 零配置快速接入

#### 3.2 非HTTP网关 → 传统模式

**流程**：
```
1. 查询网关下的所有启用设备
   - 过滤条件：GatewayId匹配，IsEnabled = true
   ↓
2. 遍历每个设备
   ↓
3. 调用 ProcessDeviceAsync() 处理设备
   ↓
4. 合并设备处理结果
```

**特点**：
- ✅ 使用手动创建的设备
- ✅ 使用手动创建的数据点
- ✅ 按设备配置采集
- ✅ 完整控制

---

### 4. HTTP网关简化模式（SimpleHttpDataCollector）

**职责**：处理HTTP网关的自动采集流程

**关键代码**：`Platform.ApiService/Services/SimpleHttpDataCollector.cs`

**详细流程**：

```
1. 验证网关
   - 检查是否启用
   - 检查协议类型是否为HTTP
   - 获取网关HTTP地址（优先从Config.urlTemplate，回退到Address）
   ↓
2. 获取或创建默认设备
   - 优先查找网关下已启用的设备
   - 如果没有，查找任何设备（包括禁用的）并启用
   - 如果完全没有，创建默认设备
   ↓
3. 采集HTTP数据
   - 构建HTTP请求（支持GET/POST/PUT/PATCH/DELETE）
   - 发送请求（支持自定义请求头）
   - 解析JSON响应
   ↓
4. 自动发现并创建数据点
   - 遍历HTTP响应的所有字段
   - 检查数据点是否已存在（按名称或DataPointId）
   - 为不存在的数据点自动创建：
     * 自动推断数据类型（数值/布尔/字符串/JSON）
     * 设置默认采样间隔（60秒）
     * 标记为只读（IsReadOnly = true）
   ↓
5. 保存数据记录
   - 遍历HTTP响应的所有字段
   - 匹配对应的数据点
   - 检查重复（设备ID + 数据点ID + 上报时间）
   - 创建数据记录（IoTDataRecord）
   - 更新数据点最后值（LastValue, LastUpdatedAt）
   - 更新设备最后上报时间（LastReportedAt）
```

**数据点自动发现规则**：
- 按字段名称匹配（忽略大小写）
- 按DataPointId匹配（如果字段名是DataPointId）
- 自动推断数据类型：
  - 布尔值 → `DataPointType.Boolean`
  - 数值 → `DataPointType.Numeric`
  - 字符串 → `DataPointType.String`
  - 对象/数组 → `DataPointType.Json`

**特点**：
- ✅ 零配置：只需配置网关HTTP地址
- ✅ 自动发现：自动创建设备和数据点
- ✅ 智能匹配：支持名称和ID两种匹配方式
- ✅ 类型推断：自动识别数据类型

---

### 5. 传统模式设备处理（ProcessDeviceAsync）

**职责**：处理非HTTP网关或手动配置的设备

**关键代码**：`Platform.ApiService/Services/IoTDataCollector.cs:ProcessDeviceAsync`

**详细流程**：

```
1. 验证设备信息
   - 检查CompanyId
   - 检查GatewayId
   ↓
2. 查找网关信息
   - 根据GatewayId查找网关
   - 验证网关存在
   ↓
3. 查询设备的数据点
   - 过滤条件：DeviceId匹配，IsEnabled = true
   ↓
4. 调用数据获取客户端采集数据
   - 传入：网关、设备、数据点列表
   - 返回：采集到的数据点值列表
   ↓
5. 处理采集结果
   - 遍历采集到的数据
   - 匹配对应的数据点
   - 检查重复
   - 创建数据记录
   - 更新数据点统计
   - 更新设备统计
```

**特点**：
- ✅ 使用手动配置的设备
- ✅ 使用手动配置的数据点
- ✅ 支持复杂协议（通过IIoTDataFetchClient扩展）

---

### 6. 数据获取客户端（HttpIoTDataFetchClient）

**职责**：从HTTP接口拉取设备数据

**关键代码**：`Platform.ApiService/Services/HttpIoTDataFetchClient.cs`

**详细流程**：

```
1. 构建获取选项
   - 优先使用网关配置（如果网关协议是HTTP）
   - 回退到全局配置（HttpFetchOptions）
   ↓
2. 构建HTTP请求
   - URL模板替换：{deviceId} → 实际设备ID
   - 查询参数替换：支持{deviceId}占位符
   - 请求头替换：支持{deviceId}占位符
   - Body替换：支持{deviceId}占位符（非GET请求）
   ↓
3. 发送HTTP请求（支持重试）
   - 重试策略：仅对幂等方法（GET/PUT/DELETE/PULL）
   - 重试次数：可配置（默认1次）
   - 重试延迟：可配置（默认500ms）
   ↓
4. 解析响应
   - 解析JSON响应为字典
   - 错误处理：HTTP错误码、JSON解析错误
   ↓
5. 映射数据点
   - 优先按DataPointId匹配
   - 回退到按Name匹配
   - 返回匹配的数据点值列表
```

**支持的HTTP方法**：
- GET（默认）
- POST
- PUT
- PATCH
- DELETE
- PULL（自定义）

**URL模板示例**：
- `https://api.example.com/devices/{deviceId}/data`
- `https://api.example.com/data?device={deviceId}`

**特点**：
- ✅ 灵活的URL模板（支持{deviceId}占位符）
- ✅ 支持多种HTTP方法
- ✅ 自动重试（仅幂等方法）
- ✅ 智能匹配（DataPointId优先，Name回退）

---

### 7. 数据保存与更新

**职责**：保存数据记录并更新统计信息

**关键代码**：`Platform.ApiService/Services/IoTDataCollector.cs`

**流程**：

```
1. 构建数据记录（BuildRecord）
   - 设备ID、数据点ID
   - 数据值、数据类型
   - 上报时间
   - 告警评估（EvaluateAlarm）
   ↓
2. 检查重复（CheckDuplicate）
   - 查询条件：设备ID + 数据点ID + 上报时间
   - 如果已存在，跳过保存
   ↓
3. 保存数据记录
   - 使用工厂的CreateAsync方法
   - 自动维护审计字段（CreatedAt等）
   ↓
4. 更新数据点统计（UpdateDataPointAsync）
   - LastValue：最新数据值
   - LastUpdatedAt：最后更新时间
   ↓
5. 更新设备统计（UpdateDeviceAsync）
   - LastReportedAt：最后上报时间
```

**告警评估（EvaluateAlarm）**：
- 如果数据源已提供告警信息，直接使用
- 否则根据数据点告警配置评估：
  - `HighThreshold`：数值 > 阈值
  - `LowThreshold`：数值 < 阈值
  - `RangeThreshold`：数值 < 阈值 或 数值 > (阈值 * 2)

**特点**：
- ✅ 去重检查（防止重复数据）
- ✅ 自动审计（创建时间等）
- ✅ 统计更新（数据点/设备最后值）
- ✅ 告警评估（自动判断告警状态）

---

## 数据流向图

```
┌─────────────────────────────────────────────────────────────┐
│ 定时调度服务 (IoTDataCollectionHostedService)               │
│ - Cron表达式：0 */5 * * * * (每5分钟)                       │
│ - 信号量控制：防止并发执行                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 统一采集执行器 (IoTDataCollector.RunOnceAsync)              │
│ - 查询所有启用的网关（跨租户）                               │
│ - 按租户分组处理                                             │
│ - 并行处理（MaxDegreeOfParallelism = 4）                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌───────────────────────┐      ┌──────────────────────────┐
│ HTTP网关              │      │ 非HTTP网关                │
│ (简化模式)            │      │ (传统模式)                │
│                       │      │                          │
│ SimpleHttpDataCollector│      │ ProcessDeviceAsync       │
│ - 自动创建设备        │      │ - 使用手动创建的设备      │
│ - 自动发现数据点      │      │ - 使用手动创建的数据点    │
│ - 直接从网关地址采集  │      │ - 按设备配置采集          │
└───────────────────────┘      └──────────────────────────┘
        ↓                                   ↓
        └─────────────────┬─────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 数据获取客户端 (HttpIoTDataFetchClient)                     │
│ - 构建HTTP请求（URL模板、请求头、Body）                     │
│ - 发送请求（支持重试）                                       │
│ - 解析JSON响应                                              │
│ - 映射数据点（DataPointId/Name匹配）                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 数据保存与更新                                              │
│ - 检查重复                                                  │
│ - 创建数据记录 (IoTDataRecord)                              │
│ - 更新数据点统计 (LastValue, LastUpdatedAt)                 │
│ - 更新设备统计 (LastReportedAt)                              │
│ - 评估告警 (EvaluateAlarm)                                  │
└─────────────────────────────────────────────────────────────┘
```

## 配置说明

### 应用配置（appsettings.json）

```json
{
  "IoTDataCollection": {
    "Enabled": true,
    "Cron": "0 */5 * * * *",
    "PageSize": 100,
    "MaxDegreeOfParallelism": 4,
    "TimeoutSeconds": 120,
    "GatewayStatusCheckEnabled": true,
    "GatewayPingTimeoutSeconds": 5,
    "HttpFetch": {
      "Enabled": false,
      "Method": "Get",
      "UrlTemplate": "",
      "RequestTimeoutSeconds": 30,
      "RetryCount": 1,
      "RetryDelayMs": 500
    }
  }
}
```

### 网关配置（IoTGateway）

**HTTP网关配置示例**：
```json
{
  "protocolType": "HTTP",
  "address": "https://api.example.com/data",
  "config": {
    "urlTemplate": "https://api.example.com/devices/{deviceId}/data",
    "httpMethod": "GET",
    "headers": "{\"Authorization\": \"Bearer token\"}",
    "requestTimeoutSeconds": "30"
  },
  "isEnabled": true
}
```

## 关键设计原则

### 1. 统一模式
- 所有网关通过同一个流程处理
- 根据网关类型自动选择策略
- 代码简洁，易于维护

### 2. 多租户隔离
- 跨租户查询网关（后台服务需要）
- 按租户分组处理（确保数据隔离）
- 所有数据操作自动应用租户过滤

### 3. 简化优先
- HTTP网关支持零配置快速接入
- 自动发现数据点，减少手动配置
- 自动创建默认设备

### 4. 异常隔离
- 单个网关失败不影响其他网关
- 单个设备失败不影响其他设备
- 异常记录到警告列表，不中断流程

### 5. 性能优化
- 并行处理网关（信号量控制并发度）
- 去重检查（防止重复数据）
- 超时控制（防止任务卡死）

## 使用场景

### 场景1：HTTP网关快速接入

**步骤**：
1. 创建HTTP网关 → 配置地址 `https://api.example.com/data`
2. 启用网关 → 系统自动处理
3. 系统自动创建默认设备
4. 系统自动发现数据点（从API响应）
5. 系统自动采集数据并保存

**优势**：
- ✅ 零配置快速接入
- ✅ 自动发现数据点
- ✅ 无需手动创建

### 场景2：传统模式（手动配置）

**步骤**：
1. 创建网关（HTTP/MQTT/其他）→ 配置连接信息
2. 创建设备 → 关联到网关
3. 创建数据点 → 配置采集规则
4. 系统自动采集 → 按配置采集数据

**优势**：
- ✅ 完整控制
- ✅ 精细配置
- ✅ 支持复杂协议

## 总结

物联网平台数据采集流程采用统一模式设计：

1. **定时调度**：通过Cron表达式定时触发采集任务
2. **统一入口**：所有网关通过同一个流程处理
3. **自动选择**：根据网关类型自动选择处理策略
4. **简化优先**：HTTP网关支持零配置快速接入
5. **异常隔离**：单个失败不影响整体流程
6. **性能优化**：并行处理、去重检查、超时控制

整个流程清晰、高效、易于维护，满足不同场景的数据采集需求。
