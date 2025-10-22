# 删除图表恢复到原来的数据显示方式

## 📋 恢复概述

根据用户要求，删除了内存使用率曲线图，恢复到原来的ResourceCard数据显示方式，同时保持定时更新功能。

## 🔄 恢复内容

### 1. 删除图表组件

**删除的组件**：
```typescript
// ❌ 已删除
const MemoryUsageChart: React.FC<{
  data: Array<{ time: string; value: number; type: string; memoryMB?: number; totalMB?: number }>;
  loading?: boolean;
  totalMemoryMB?: number;
}> = React.memo(({ data, loading = false, totalMemoryMB = 0 }) => {
  // 图表组件实现
});
```

**删除的导入**：
```typescript
// ❌ 已删除
import { Line } from '@ant-design/charts';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// ✅ 恢复为
import React, { useState, useEffect, useRef, useCallback } from 'react';
```

### 2. 删除图表相关状态

**删除的状态变量**：
```typescript
// ❌ 已删除
const [memoryChartData, setMemoryChartData] = useState<Array<{ 
  time: string; 
  value: number; 
  type: string; 
  memoryMB?: number; 
  totalMB?: number 
}>>([]);
const [chartLoading] = useState(false);
```

### 3. 简化数据获取函数

**之前的复杂逻辑**：
```typescript
// ❌ 已删除
const fetchSystemResources = useCallback(async () => {
  try {
    const resourcesRes = await getSystemResources();
    
    if (resourcesRes.success && resourcesRes.data) {
      const resources = resourcesRes.data;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN');
      const memoryUsage = resources.memory?.usagePercent || 0;
      
      // 更新系统资源状态
      setSystemResources(prevResources => {
        if (prevResources?.memory?.usagePercent === memoryUsage) {
          return prevResources;
        }
        return resources;
      });
      
      // 更新曲线图数据
      setMemoryChartData(prevData => {
        const newData = [
          ...prevData,
          {
            time: timeStr,
            value: memoryUsage,
            type: '内存使用率',
            memoryMB: resources.memory?.processMemoryMB || 0,
            totalMB: resources.memory?.totalMemoryMB || 0
          }
        ];
        return newData.slice(-60);
      });
    }
  } catch (error) {
    console.error('Failed to fetch system resources:', error);
  }
}, []);
```

**恢复后的简化逻辑**：
```typescript
// ✅ 恢复后
const fetchSystemResources = useCallback(async () => {
  try {
    const resourcesRes = await getSystemResources();
    
    if (resourcesRes.success && resourcesRes.data) {
      const resources = resourcesRes.data;
      const memoryUsage = resources.memory?.usagePercent || 0;
      
      // 更新系统资源状态（只在数据变化时更新）
      setSystemResources(prevResources => {
        if (prevResources?.memory?.usagePercent === memoryUsage) {
          return prevResources; // 避免不必要的更新
        }
        return resources;
      });
    }
  } catch (error) {
    console.error('Failed to fetch system resources:', error);
  }
}, []);
```

### 4. 恢复ResourceCard显示方式

**恢复的UI结构**：
```typescript
// ✅ 恢复后
{systemResources ? (
  <Card 
    title={
      <Space>
        <DatabaseOutlined />
        <span>系统资源监控</span>
        <Tag color="blue">5秒更新</Tag>
      </Space>
    }
    style={{ marginTop: '24px', borderRadius: '12px' }}
  >
    <Row gutter={[16, 16]}>
      {/* 内存使用率 */}
      {systemResources.memory && (
        <Col xs={24} sm={12} md={8}>
          <ResourceCard
            title="内存使用率"
            value={`${systemResources.memory?.usagePercent || 0}%`}
            icon={<ThunderboltOutlined />}
            color={getResourceColor(systemResources.memory?.usagePercent || 0)}
            loading={loading}
            token={token}
          />
          <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
            {systemResources.memory?.processMemoryMB || 0}MB / {systemResources.memory?.totalMemoryMB || 0}MB
          </div>
        </Col>
      )}
      
      {/* CPU 使用率 */}
      {systemResources.cpu && (
        <Col xs={24} sm={12} md={8}>
          <ResourceCard
            title="CPU 使用率"
            value={`${systemResources.cpu?.usagePercent || 0}%`}
            icon={<CiOutlined />}
            color={getResourceColor(systemResources.cpu?.usagePercent || 0)}
            loading={loading}
            token={token}
          />
          <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
            {systemResources.cpu?.processorCount || 0} 核心
          </div>
        </Col>
      )}
      
      {/* 磁盘使用率 */}
      {systemResources.disk && (
        <Col xs={24} sm={12} md={8}>
          <ResourceCard
            title="磁盘使用率"
            value={`${systemResources.disk?.usagePercent || 0}%`}
            icon={<HddOutlined />}
            color={getResourceColor(systemResources.disk?.usagePercent || 0)}
            loading={loading}
            token={token}
          />
          <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
            {systemResources.disk?.usedSizeGB || 0}GB / {systemResources.disk?.totalSizeGB || 0}GB
          </div>
        </Col>
      )}
      
      {/* 系统状态 */}
      <Col xs={24} sm={12} md={8}>
        <ResourceCard
          title="系统状态"
          value={(() => {
            if (systemStatus?.status === 'healthy') return '正常';
            if (systemStatus?.status === 'warning') return '警告';
            return '异常';
          })()}
          icon={<MonitorOutlined />}
          color={(() => {
            if (systemStatus?.status === 'healthy') return '#52c41a';
            if (systemStatus?.status === 'warning') return '#faad14';
            return '#ff4d4f';
          })()}
          loading={loading}
          token={token}
        />
        <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
          {systemStatus?.message || '状态未知'}
        </div>
      </Col>
    </Row>
    
    {/* 系统详细信息 */}
    {systemResources?.system && (
      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">机器名: </Text>
            <Text strong>{systemResources.system?.machineName || 'Unknown'}</Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">CPU 核心: </Text>
            <Text strong>{systemResources.system?.processorCount || 0}</Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">系统架构: </Text>
            <Text strong>{systemResources.system?.is64BitOperatingSystem ? '64位' : '32位'}</Text>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary">系统运行时间: </Text>
            <Text strong>{Math.round((systemResources.system?.systemUpTime || 0) / 3600)}小时</Text>
          </Col>
        </Row>
      </div>
    )}
  </Card>
) : (
  <Card 
    title={
      <Space>
        <DatabaseOutlined />
        <span>系统资源监控</span>
        <Tag color="blue">5秒更新</Tag>
      </Space>
    }
    style={{ marginTop: '24px', borderRadius: '12px' }}
  >
    <Alert
      message="系统资源数据不可用"
      description="无法获取系统资源信息，请检查后端服务是否正常运行。"
      type="warning"
      showIcon
      style={{ borderRadius: '8px' }}
    />
  </Card>
)}
```

## 📊 恢复后的显示效果

### ResourceCard 布局
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   内存使用率     │    CPU 使用率    │   磁盘使用率     │    系统状态      │
│      45%        │      12%        │      78%        │      正常       │
│  1024MB/2048MB  │     8 核心       │  156GB/200GB    │   状态未知       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 系统详细信息
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 机器名: iMac-Pro    CPU 核心: 8    系统架构: 64位    系统运行时间: 72小时  │
└─────────────────────────────────────────────────────────────────────────┘
```

## ⚡ 保持的功能

### 1. 定时更新功能
- ✅ 保持每5秒自动更新一次
- ✅ 使用 `setInterval` 定时器
- ✅ 组件卸载时自动清理定时器

### 2. 数据获取逻辑
- ✅ 保持 `fetchSystemResources` 函数
- ✅ 保持错误处理机制
- ✅ 保持数据变化检测优化

### 3. 状态管理
- ✅ 保持 `systemResources` 状态
- ✅ 保持 `systemStatus` 状态
- ✅ 保持加载状态管理

### 4. UI 组件
- ✅ 保持 `ResourceCard` 组件
- ✅ 保持颜色编码系统
- ✅ 保持响应式布局

## 🔧 技术改进

### 代码简化
- 删除了复杂的图表配置
- 移除了图表数据管理逻辑
- 简化了数据更新流程

### 性能优化
- 减少了不必要的状态更新
- 移除了图表渲染开销
- 保持了数据变化检测

### 维护性提升
- 代码结构更简单
- 依赖更少
- 更容易理解和维护

## 📚 相关文件

### 修改的文件
- `Platform.Admin/src/pages/Welcome.tsx` - 主要恢复文件

### 恢复内容
- 删除图表组件和相关导入
- 恢复ResourceCard显示方式
- 简化数据获取逻辑
- 保持定时更新功能

## ✅ 恢复完成

所有恢复工作已成功完成：
- ✅ 删除了MemoryUsageChart图表组件
- ✅ 移除了@ant-design/charts图表库导入
- ✅ 删除了图表相关的状态变量
- ✅ 简化了fetchSystemResources函数
- ✅ 恢复了ResourceCard显示方式
- ✅ 保持了5秒定时更新功能
- ✅ 修复了Card组件结构问题
- ✅ 保留了系统详细信息显示

恢复后的系统资源监控现在使用简洁的ResourceCard方式显示数据，同时保持了定时更新功能，提供了清晰直观的数据展示。
