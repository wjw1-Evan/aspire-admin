import { request } from '@umijs/max';

const API_PREFIX = '/api/iot';

// ─────────────────────────────────────────────────────────────────
// 枚举与基础类型
// ─────────────────────────────────────────────────────────────────
export type IoTDeviceStatus = 'Online' | 'Offline' | 'Fault' | 'Maintenance';
export type IoTDeviceType = 'Sensor' | 'Actuator' | 'Gateway' | 'Other';
export type CommandStatus = 'Pending' | 'Delivered' | 'Executed' | 'Failed' | 'Expired';

// ─────────────────────────────────────────────────────────────────
// 实体类型
// ─────────────────────────────────────────────────────────────────
export interface IoTGateway {
  id: string;
  name: string;
  title: string;
  description?: string;
  gatewayId: string;
  protocolType: string;
  address: string;
  username?: string;
  isEnabled: boolean;
  status: IoTDeviceStatus;
  lastConnectedAt?: string;
  deviceCount: number;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  title: string;
  deviceId: string;
  gatewayId: string;
  isEnabled: boolean;
  /** 持久化状态字段（Online/Offline/Fault/Maintenance，旧文档可能为 null） */
  status?: IoTDeviceStatus;
  /** 设备类型（旧文档可能为 null） */
  deviceType?: IoTDeviceType;
  /** 设备描述 */
  description?: string;
  /** 物理位置 */
  location?: string;
  /** 标签（对标 Azure IoT Device Tags） */
  tags?: Record<string, string>;
  /** ApiKey 是否已设置（后端仅返回是否存在，不返回原文） */
  hasApiKey?: boolean;
  /** 遥测数据保留天数（null 或 0=永久） */
  retentionDays?: number;
  lastReportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmConfig {
  isEnabled: boolean;
  alarmType: string;
  threshold: number;
  /** RangeThreshold 模式的上界阈值 */
  thresholdHigh?: number;
  level: string;
}

export interface IoTDataPoint {
  id: string;
  name: string;
  title: string;
  deviceId: string;
  dataPointId: string;
  dataType: string;
  unit?: string;
  isReadOnly: boolean;
  samplingInterval: number;
  lastValue?: string;
  lastUpdatedAt?: string;
  isEnabled: boolean;
  alarmConfig?: AlarmConfig;
  createdAt: string;
  updatedAt: string;
}

export interface IoTDataRecord {
  id: string;
  deviceId: string;
  dataPointId: string;
  value: string;
  dataType: string;
  samplingInterval: number;
  reportedAt: string;
  isAlarm: boolean;
  alarmLevel?: string;
  createdAt: string;
}

export interface IoTDeviceEvent {
  id: string;
  deviceId: string;
  eventType: string;
  level: string;
  description?: string;
  eventData?: Record<string, any>;
  occurredAt: string;
  isHandled: boolean;
  handledRemarks?: string;
  createdAt: string;
}

/** 设备孪生 - 对标 Azure IoT Hub Device Twin */
export interface IoTDeviceTwin {
  id: string;
  deviceId: string;
  /** 云端期望状态（管理端可编辑） */
  desiredProperties: Record<string, any>;
  /** 设备实际上报的状态（只读） */
  reportedProperties: Record<string, any>;
  desiredVersion: number;
  reportedVersion: number;
  etag: string;
  desiredUpdatedAt?: string;
  reportedUpdatedAt?: string;
}

/** 云到设备命令 - 对标 Azure IoT Hub Direct Method */
export interface IoTDeviceCommand {
  id: string;
  deviceId: string;
  commandName: string;
  payload?: Record<string, any>;
  status: CommandStatus;
  expiresAt: string;
  deliveredAt?: string;
  executedAt?: string;
  responsePayload?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

/** 生成 ApiKey 的结果（明文仅返回一次） */
export interface GenerateApiKeyResult {
  deviceId: string;
  apiKey: string;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// 统计类型
// ─────────────────────────────────────────────────────────────────
export interface PlatformStatistics {
  totalGateways: number;
  onlineGateways: number;
  totalDevices: number;
  onlineDevices: number;
  totalDataPoints: number;
  totalDataRecords: number;
  unhandledAlarms: number;
  lastUpdatedAt: string;
}

export interface GatewayStatistics {
  gatewayId: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  faultDevices: number;
  lastConnectedAt?: string;
}

export interface DeviceStatistics {
  deviceId: string;
  totalDataPoints: number;
  enabledDataPoints: number;
  totalDataRecords: number;
  unhandledAlarms: number;
  lastReportedAt?: string;
}

export interface DataStatistics {
  dataPointId: string;
  recordCount: number;
  averageValue?: number;
  minValue?: number;
  maxValue?: number;
  startTime: string;
  endTime: string;
}

// ─────────────────────────────────────────────────────────────────
// API 服务
// ─────────────────────────────────────────────────────────────────
export const iotService = {
  // ── Gateway ──────────────────────────────────────────────────
  createGateway: (data: any) =>
    request<{ success: boolean; data: IoTGateway }>(`${API_PREFIX}/gateways`, {
      method: 'POST',
      data,
    }),

  getGateways: (pageIndex = 1, pageSize = 20, keyword?: string, status?: string) => {
    let url = `${API_PREFIX}/gateways?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return request<{ success: boolean; data: { list: IoTGateway[]; total: number; page: number; pageSize: number } }>(
      url,
      { method: 'GET' }
    );
  },

  getGateway: (id: string) =>
    request<{ success: boolean; data: IoTGateway }>(`${API_PREFIX}/gateways/${id}`, { method: 'GET' }),

  updateGateway: (id: string, data: any) =>
    request<{ success: boolean; data: IoTGateway }>(`${API_PREFIX}/gateways/${id}`, { method: 'PUT', data }),

  deleteGateway: (id: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/gateways/${id}`, { method: 'DELETE' }),

  getGatewayStatistics: (gatewayId: string) =>
    request<{ success: boolean; data: GatewayStatistics }>(`${API_PREFIX}/gateways/${gatewayId}/statistics`, { method: 'GET' }),

  // ── Device ───────────────────────────────────────────────────
  createDevice: (data: any) =>
    request<{ success: boolean; data: IoTDevice }>(`${API_PREFIX}/devices`, { method: 'POST', data }),

  getDevices: (gatewayId?: string, pageIndex = 1, pageSize = 20, keyword?: string) => {
    let url = `${API_PREFIX}/devices?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (gatewayId) url += `&gatewayId=${gatewayId}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    return request<{ success: boolean; data: { list: IoTDevice[]; total: number; page: number; pageSize: number } }>(url, { method: 'GET' });
  },

  getDevice: (id: string) =>
    request<{ success: boolean; data: IoTDevice }>(`${API_PREFIX}/devices/${id}`, { method: 'GET' }),

  updateDevice: (id: string, data: any) =>
    request<{ success: boolean; data: IoTDevice }>(`${API_PREFIX}/devices/${id}`, { method: 'PUT', data }),

  deleteDevice: (id: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/devices/${id}`, { method: 'DELETE' }),

  getDeviceStatistics: (deviceId: string) =>
    request<{ success: boolean; data: DeviceStatistics }>(`${API_PREFIX}/devices/${deviceId}/statistics`, { method: 'GET' }),

  // ── Device Twin ───────────────────────────────────────────────
  /** 获取设备孪生（不存在时后端自动初始化） */
  getDeviceTwin: (deviceId: string) =>
    request<{ success: boolean; data: IoTDeviceTwin }>(`${API_PREFIX}/devices/${deviceId}/twin`, { method: 'GET' }),

  /** 更新期望属性（增量 patch，null 值删除键） */
  updateDesiredProperties: (deviceId: string, properties: Record<string, any>) =>
    request<{ success: boolean; data: IoTDeviceTwin }>(`${API_PREFIX}/devices/${deviceId}/twin/desired`, {
      method: 'PATCH',
      data: { properties },
    }),

  // ── C2D Commands ──────────────────────────────────────────────
  /** 发送云到设备命令 */
  sendCommand: (deviceId: string, commandName: string, payload?: Record<string, any>, ttlHours = 24) =>
    request<{ success: boolean; data: IoTDeviceCommand }>(`${API_PREFIX}/devices/${deviceId}/commands`, {
      method: 'POST',
      data: { commandName, payload, ttlHours },
    }),

  /** 查询设备命令历史（通过事件列表模拟） */
  getCommandHistory: (deviceId: string, pageIndex = 1, pageSize = 10) => {
    const url = `${API_PREFIX}/events/query`;
    return request<{ success: boolean; data: { Events: IoTDeviceEvent[]; Total: number } }>(url, {
      method: 'POST',
      data: { deviceId, eventType: 'Command', pageIndex, pageSize },
    });
  },

  // ── ApiKey Management ─────────────────────────────────────────
  /** 生成/重置设备 ApiKey（明文仅此次返回） */
  generateApiKey: (deviceId: string) =>
    request<{ success: boolean; data: GenerateApiKeyResult }>(`${API_PREFIX}/devices/${deviceId}/apikey`, {
      method: 'POST',
    }),

  // ── DataPoint ─────────────────────────────────────────────────
  createDataPoint: (data: any) =>
    request<{ success: boolean; data: IoTDataPoint }>(`${API_PREFIX}/datapoints`, { method: 'POST', data }),

  getDataPoints: (deviceId?: string, pageIndex = 1, pageSize = 20, keyword?: string) => {
    let url = `${API_PREFIX}/datapoints?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    return request<{ success: boolean; data: { list: IoTDataPoint[]; total: number; page: number; pageSize: number } }>(url, { method: 'GET' });
  },

  getDataPoint: (id: string) =>
    request<{ success: boolean; data: IoTDataPoint }>(`${API_PREFIX}/datapoints/${id}`, { method: 'GET' }),

  updateDataPoint: (id: string, data: any) =>
    request<{ success: boolean; data: IoTDataPoint }>(`${API_PREFIX}/datapoints/${id}`, { method: 'PUT', data }),

  deleteDataPoint: (id: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/datapoints/${id}`, { method: 'DELETE' }),

  // ── Data Records ──────────────────────────────────────────────
  reportData: (data: any) =>
    request<{ success: boolean; data: IoTDataRecord }>(`${API_PREFIX}/data/report`, { method: 'POST', data }),

  batchReportData: (data: any) =>
    request<{ success: boolean; data: IoTDataRecord[] }>(`${API_PREFIX}/data/batch-report`, { method: 'POST', data }),

  queryDataRecords: (data: any) =>
    request<{ success: boolean; data: { Records: IoTDataRecord[]; Total: number } }>(`${API_PREFIX}/data/query`, {
      method: 'POST',
      data,
    }),

  getLatestData: (dataPointId: string) =>
    request<{ success: boolean; data: IoTDataRecord }>(`${API_PREFIX}/data/latest/${dataPointId}`, { method: 'GET' }),

  getDataStatistics: (dataPointId: string, startTime: string, endTime: string) =>
    request<{ success: boolean; data: DataStatistics }>(
      `${API_PREFIX}/data/statistics/${dataPointId}?startTime=${startTime}&endTime=${endTime}`,
      { method: 'GET' }
    ),

  // ── Events ────────────────────────────────────────────────────
  queryEvents: (data: any) =>
    request<{ success: boolean; data: { Events: IoTDeviceEvent[]; Total: number } }>(`${API_PREFIX}/events/query`, {
      method: 'POST',
      data,
    }),

  handleEvent: (eventId: string, remarks: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/events/${eventId}/handle`, {
      method: 'POST',
      data: { remarks },
    }),

  getUnhandledEventCount: (deviceId?: string) => {
    let url = `${API_PREFIX}/events/unhandled-count`;
    if (deviceId) url += `?deviceId=${deviceId}`;
    return request<{ success: boolean; data: { Count: number } }>(url, { method: 'GET' });
  },

  // ── Statistics ────────────────────────────────────────────────
  getPlatformStatistics: () =>
    request<{ success: boolean; data: PlatformStatistics }>(`${API_PREFIX}/statistics/platform`, { method: 'GET' }),

  getDeviceStatusStatistics: () =>
    request<{ success: boolean; data: any }>(`${API_PREFIX}/statistics/device-status`, { method: 'GET' }),
};
