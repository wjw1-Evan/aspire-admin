import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

const API_PREFIX = '/apiservice/api/iot';

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
  config?: Record<string, unknown>;
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
  minValue?: number;
  maxValue?: number;
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
  remarks?: string;
  createdAt: string;
}

export interface IoTDeviceEvent {
  id: string;
  deviceId: string;
  eventType: string;
  level: string;
  description?: string;
  eventData?: Record<string, unknown>;
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
  desiredProperties: Record<string, unknown>;
  /** 设备实际上报的状态（只读） */
  reportedProperties: Record<string, unknown>;
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
  payload?: Record<string, unknown>;
  status: CommandStatus;
  expiresAt: string;
  deliveredAt?: string;
  executedAt?: string;
  responsePayload?: Record<string, unknown>;
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
// 请求类型定义
// ─────────────────────────────────────────────────────────────────
export interface CreateGatewayRequest {
  name: string;
  title: string;
  description?: string;
  gatewayId: string;
  protocolType: string;
  address: string;
  username?: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

export interface UpdateGatewayRequest {
  name?: string;
  title?: string;
  description?: string;
  protocolType?: string;
  address?: string;
  username?: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

export interface CreateDeviceRequest {
  name: string;
  title: string;
  deviceId: string;
  gatewayId: string;
  deviceType?: IoTDeviceType;
  description?: string;
  location?: string;
  tags?: Record<string, string>;
  isEnabled?: boolean;
  retentionDays?: number;
}

export interface UpdateDeviceRequest {
  name?: string;
  title?: string;
  deviceType?: IoTDeviceType;
  description?: string;
  location?: string;
  tags?: Record<string, string>;
  isEnabled?: boolean;
  retentionDays?: number;
}

export interface CreateDataPointRequest {
  name: string;
  title: string;
  deviceId: string;
  dataPointId: string;
  dataType: string;
  unit?: string;
  isReadOnly?: boolean;
  samplingInterval?: number;
  alarmConfig?: AlarmConfig;
  minValue?: number;
  maxValue?: number;
  isEnabled?: boolean;
}

export interface UpdateDataPointRequest {
  name?: string;
  title?: string;
  dataType?: string;
  unit?: string;
  isReadOnly?: boolean;
  samplingInterval?: number;
  alarmConfig?: AlarmConfig;
  minValue?: number;
  maxValue?: number;
  isEnabled?: boolean;
}

export interface ReportDataRequest {
  deviceId: string;
  dataPointId: string;
  value: string;
  dataType: string;
}

export interface BatchReportDataRequest {
  records: Array<{
    deviceId: string;
    dataPointId: string;
    value: string;
    dataType: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// API 服务（统一使用 ApiResponse<T> 包装）
// ─────────────────────────────────────────────────────────────────
export const iotService = {
  // ── Gateway ──────────────────────────────────────────────────
  createGateway: (data: CreateGatewayRequest) =>
    request<ApiResponse<IoTGateway>>(`${API_PREFIX}/gateways`, {
      method: 'POST',
      data,
    }),

  getGateways: (params?: any) => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    let url = `${API_PREFIX}/gateways?page=${page}&pageSize=${pageSize}`;
    if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
    if (params?.status) url += `&status=${encodeURIComponent(params.status)}`;
    if (params?.sortBy) url += `&sortBy=${encodeURIComponent(params.sortBy)}`;
    if (params?.sortOrder) url += `&sortOrder=${encodeURIComponent(params.sortOrder)}`;
    return request<ApiResponse<PagedResult<IoTGateway>>>(url, { method: 'GET' });
  },

  getGateway: (id: string) =>
    request<ApiResponse<IoTGateway>>(`${API_PREFIX}/gateways/${id}`, { method: 'GET' }),

  updateGateway: (id: string, data: UpdateGatewayRequest) =>
    request<ApiResponse<IoTGateway>>(`${API_PREFIX}/gateways/${id}`, { method: 'PUT', data }),

  deleteGateway: (id: string) =>
    request<ApiResponse<void>>(`${API_PREFIX}/gateways/${id}`, { method: 'DELETE' }),

  getGatewayStatistics: (gatewayId: string) =>
    request<ApiResponse<GatewayStatistics>>(`${API_PREFIX}/gateways/${gatewayId}/statistics`, { method: 'GET' }),

  // ── Device ───────────────────────────────────────────────────
  createDevice: (data: CreateDeviceRequest) =>
    request<ApiResponse<IoTDevice>>(`${API_PREFIX}/devices`, { method: 'POST', data }),

  getDevices: (params?: any) => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    let url = `${API_PREFIX}/devices?page=${page}&pageSize=${pageSize}`;
    if (params?.gatewayId) url += `&gatewayId=${encodeURIComponent(params.gatewayId)}`;
    if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
    if (params?.sortBy) url += `&sortBy=${encodeURIComponent(params.sortBy)}`;
    if (params?.sortOrder) url += `&sortOrder=${encodeURIComponent(params.sortOrder)}`;
    return request<ApiResponse<PagedResult<IoTDevice>>>(url, { method: 'GET' });
  },

  getDevice: (id: string) =>
    request<ApiResponse<IoTDevice>>(`${API_PREFIX}/devices/${id}`, { method: 'GET' }),

  updateDevice: (id: string, data: UpdateDeviceRequest) =>
    request<ApiResponse<IoTDevice>>(`${API_PREFIX}/devices/${id}`, { method: 'PUT', data }),

  deleteDevice: (id: string) =>
    request<ApiResponse<void>>(`${API_PREFIX}/devices/${id}`, { method: 'DELETE' }),

  /** 批量删除设备（传入 id 数组） */
  batchDeleteDevices: (ids: string[]) =>
    request<ApiResponse<{ deletedCount: number; total: number }>>(`${API_PREFIX}/devices`, {
      method: 'DELETE',
      data: ids,
    }),

  getDeviceStatistics: (deviceId: string) =>
    request<ApiResponse<DeviceStatistics>>(`${API_PREFIX}/devices/${deviceId}/statistics`, { method: 'GET' }),

  // ── Device Twin ───────────────────────────────────────────────
  /** 获取设备孪生（不存在时后端自动初始化） */
  getDeviceTwin: (deviceId: string) =>
    request<ApiResponse<IoTDeviceTwin>>(`${API_PREFIX}/devices/${deviceId}/twin`, { method: 'GET' }),

  /** 更新期望属性（增量 patch，null 值删除键） */
  updateDesiredProperties: (deviceId: string, properties: Record<string, any>) =>
    request<ApiResponse<IoTDeviceTwin>>(`${API_PREFIX}/devices/${deviceId}/twin/desired`, {
      method: 'PATCH',
      data: { properties },
    }),

  // ── C2D Commands ──────────────────────────────────────────────
  /** 发送云到设备命令 */
  sendCommand: (deviceId: string, commandName: string, payload?: Record<string, any>, ttlHours = 24) =>
    request<ApiResponse<IoTDeviceCommand>>(`${API_PREFIX}/devices/${deviceId}/commands`, {
      method: 'POST',
      data: { commandName, payload, ttlHours },
    }),

  /** 查询设备命令历史（通过事件列表模拟） */
  getCommandHistory: (params?: any) => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    let url = `${API_PREFIX}/events/query?page=${page}&pageSize=${pageSize}&eventType=Command`;
    if (params?.deviceId) url += `&deviceId=${encodeURIComponent(params.deviceId)}`;
    return request<ApiResponse<PagedResult<IoTDeviceEvent>>>(url, { method: 'GET' });
  },

  // ── ApiKey Management ─────────────────────────────────────────
  /** 生成/重置设备 ApiKey（明文仅此次返回） */
  generateApiKey: (deviceId: string) =>
    request<ApiResponse<GenerateApiKeyResult>>(`${API_PREFIX}/devices/${deviceId}/apikey`, {
      method: 'POST',
    }),

  // ── DataPoint ─────────────────────────────────────────────────
  createDataPoint: (data: CreateDataPointRequest) =>
    request<ApiResponse<IoTDataPoint>>(`${API_PREFIX}/datapoints`, { method: 'POST', data }),

  getDataPoints: (params?: any) => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    let url = `${API_PREFIX}/datapoints?page=${page}&pageSize=${pageSize}`;
    if (params?.deviceId) url += `&deviceId=${encodeURIComponent(params.deviceId)}`;
    if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
    if (params?.sortBy) url += `&sortBy=${encodeURIComponent(params.sortBy)}`;
    if (params?.sortOrder) url += `&sortOrder=${encodeURIComponent(params.sortOrder)}`;
    return request<ApiResponse<PagedResult<IoTDataPoint>>>(url, { method: 'GET' });
  },

  getDataPoint: (id: string) =>
    request<ApiResponse<IoTDataPoint>>(`${API_PREFIX}/datapoints/${id}`, { method: 'GET' }),

  updateDataPoint: (id: string, data: UpdateDataPointRequest) =>
    request<ApiResponse<IoTDataPoint>>(`${API_PREFIX}/datapoints/${id}`, { method: 'PUT', data }),

  deleteDataPoint: (id: string) =>
    request<ApiResponse<void>>(`${API_PREFIX}/datapoints/${id}`, { method: 'DELETE' }),

  // ── Data Records ──────────────────────────────────────────────
  reportData: (data: ReportDataRequest) =>
    request<ApiResponse<IoTDataRecord>>(`${API_PREFIX}/data/report`, { method: 'POST', data }),

  batchReportData: (data: BatchReportDataRequest) =>
    request<ApiResponse<IoTDataRecord[]>>(`${API_PREFIX}/data/batch-report`, { method: 'POST', data }),

  queryDataRecords: (params?: any) => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    let url = `${API_PREFIX}/data/query?page=${page}&pageSize=${pageSize}`;
    if (params?.deviceId) url += `&deviceId=${encodeURIComponent(params.deviceId)}`;
    if (params?.dataPointId) url += `&dataPointId=${encodeURIComponent(params.dataPointId)}`;
    if (params?.startTime) url += `&startTime=${encodeURIComponent(params.startTime)}`;
    if (params?.endTime) url += `&endTime=${encodeURIComponent(params.endTime)}`;
    return request<ApiResponse<PagedResult<IoTDataRecord>>>(url, { method: 'GET' });
  },

  getLatestData: (dataPointId: string) =>
    request<ApiResponse<IoTDataRecord>>(`${API_PREFIX}/data/latest/${dataPointId}`, { method: 'GET' }),

  getDataStatistics: (dataPointId: string, startTime: string, endTime: string) =>
    request<ApiResponse<DataStatistics>>(
      `${API_PREFIX}/data/statistics/${dataPointId}?startTime=${startTime}&endTime=${endTime}`,
      { method: 'GET' }
    ),

  // ── Events ────────────────────────────────────────────────────
  queryEvents: (params?: any) => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    let url = `${API_PREFIX}/events/query?page=${page}&pageSize=${pageSize}`;
    if (params?.deviceId) url += `&deviceId=${encodeURIComponent(params.deviceId)}`;
    if (params?.eventType) url += `&eventType=${encodeURIComponent(params.eventType)}`;
    if (params?.level) url += `&level=${encodeURIComponent(params.level)}`;
    if (params?.isHandled !== undefined) url += `&isHandled=${params.isHandled}`;
    if (params?.startTime) url += `&startTime=${encodeURIComponent(params.startTime)}`;
    if (params?.endTime) url += `&endTime=${encodeURIComponent(params.endTime)}`;
    if (params?.sortBy) url += `&sortBy=${encodeURIComponent(params.sortBy)}`;
    if (params?.sortOrder) url += `&sortOrder=${encodeURIComponent(params.sortOrder)}`;
    return request<ApiResponse<PagedResult<IoTDeviceEvent>>>(url, { method: 'GET' });
  },

  handleEvent: (eventId: string, remarks: string) =>
    request<ApiResponse<void>>(`${API_PREFIX}/events/${eventId}/handle`, {
      method: 'POST',
      data: { remarks },
    }),

  getUnhandledEventCount: (deviceId?: string) => {
    let url = `${API_PREFIX}/events/unhandled-count`;
    if (deviceId) url += `?deviceId=${deviceId}`;
    return request<ApiResponse<{ count: number }>>(url, { method: 'GET' });
  },

  // ── Statistics ────────────────────────────────────────────────
  getPlatformStatistics: () =>
    request<ApiResponse<PlatformStatistics>>(`${API_PREFIX}/statistics/platform`, { method: 'GET' }),

  getDeviceStatusStatistics: () =>
    request<ApiResponse<any>>(`${API_PREFIX}/statistics/device-status`, { method: 'GET' }),
};
