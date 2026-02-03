# 物联网平台统一采集模式

## 概述

系统已完全统一采集模式，不再区分简化模式和传统模式。系统会根据网关类型自动选择最优的处理策略。

## 统一采集流程

```
数据采集任务启动
    ↓
查找所有启用的网关
    ↓
┌─────────────────────────────────────┐
│ 按网关类型自动处理                  │
│                                     │
│ HTTP网关 → 简化模式                 │
│   - 自动创建/获取设备               │
│   - 自动发现数据点                  │
│   - 直接从网关地址采集              │
│                                     │
│ 非HTTP网关 → 传统模式               │
│   - 使用手动创建的设备              │
│   - 使用手动创建的数据点            │
│   - 按设备配置采集                  │
└─────────────────────────────────────┘
    ↓
合并结果，返回统计信息
```

## 核心实现

### 统一入口：`IoTDataCollector.RunOnceAsync`

```csharp
// 1. 查找所有启用的网关
var gateways = await _gatewayFactory.FindAsync(gatewayFilter);

// 2. 并行处理每个网关
foreach (var gateway in gateways)
{
    await ProcessGatewayAsync(gateway, token);
}
```

### 网关处理：`ProcessGatewayAsync`

```csharp
if (gateway.ProtocolType == "HTTP")
{
    // HTTP网关：使用简化模式
    // - 自动创建设备（如果不存在）
    // - 自动发现数据点（从API响应）
    // - 直接从网关地址采集
    await simpleCollector.CollectGatewayDataAsync(gateway);
}
else
{
    // 非HTTP网关：使用传统模式
    // - 查找网关下的所有设备
    // - 使用设备配置的数据点
    // - 按设备采集数据
    foreach (var device in devices)
    {
        await ProcessDeviceAsync(device);
    }
}
```

## 处理策略

### HTTP网关（自动简化）

**处理流程**：
1. 自动获取或创建设备
2. 从HTTP响应自动发现数据点
3. 直接从网关地址采集数据
4. 保存数据记录

**特点**：
- ✅ 零配置快速接入
- ✅ 自动发现数据点
- ✅ 无需手动创建

### 非HTTP网关（传统模式）

**处理流程**：
1. 查找网关下的所有设备
2. 使用设备配置的数据点
3. 按设备采集数据
4. 保存数据记录

**特点**：
- ✅ 完整控制
- ✅ 精细配置
- ✅ 支持复杂协议

## 代码结构

```
IoTDataCollector
├─ RunOnceAsync()           # 统一入口
│   └─ ProcessGatewayAsync() # 按网关处理
│       ├─ HTTP网关 → SimpleHttpDataCollector
│       └─ 非HTTP网关 → ProcessDeviceAsync()
└─ ProcessDeviceAsync()     # 设备级处理
    └─ HttpIoTDataFetchClient
```

## 优势

1. **统一入口**：所有网关通过同一个流程处理
2. **自动选择**：根据网关类型自动选择策略
3. **代码简化**：移除模式区分，代码更清晰
4. **易于维护**：单一流程，易于理解和维护
5. **性能优化**：并行处理网关，提高效率

## 使用场景

### HTTP网关快速接入

```
1. 创建HTTP网关 → 配置地址
2. 系统自动处理 → 创建设备、发现数据点、采集数据
3. 可选优化 → 编辑数据点配置
```

### MQTT/其他协议

```
1. 创建网关 → 配置连接信息
2. 手动创建设备 → 关联到网关
3. 手动创建数据点 → 配置采集规则
4. 系统自动采集 → 按配置采集数据
```

## 总结

统一模式实现了：
- ✅ 单一采集流程
- ✅ 自动策略选择
- ✅ HTTP网关零配置
- ✅ 非HTTP网关完整控制
- ✅ 代码简洁易维护

系统现在完全统一，不再区分两种模式，所有网关都通过统一的流程处理。
