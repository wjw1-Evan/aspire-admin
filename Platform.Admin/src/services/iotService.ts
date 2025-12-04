import { request } from '@umijs/max';

const API_PREFIX = '/api/iot';

export interface IoTGateway {
  id: string;
  name: string;
  title: string;
  description?: string;
  gatewayId: string;
  protocolType: string;
  address: string;
  port: number;
  username?: string;
  isEnabled: boolean;
  status: string;
  lastConnectedAt?: string;
  deviceCount: number;
  tags: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  title: string;
  description?: string;
  deviceId: string;
  gatewayId: string;
  deviceType: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  status: string;
  isEnabled: boolean;
  lastReportedAt?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  dataPoints: string[];
  properties?: Record<string, any>;
  tags: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IoTDataPoint {
  id: string;
  name: string;
  title: string;
  description?: string;
  deviceId: string;
  dataPointId: string;
  dataType: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  precision: number;
  isReadOnly: boolean;
  samplingInterval: number;
  lastValue?: string;
  lastUpdatedAt?: string;
  isEnabled: boolean;
  alarmConfig?: AlarmConfig;
  tags: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmConfig {
  isEnabled: boolean;
  alarmType: string;
  threshold: number;
  level: string;
  message?: string;
}

export interface IoTDataRecord {
  id: string;
  deviceId: string;
  dataPointId: string;
  value: string;
  dataType: string;
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
  eventData?: Record<string, any>;
  occurredAt: string;
  isHandled: boolean;
  handledRemarks?: string;
  createdAt: string;
}

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

// Gateway APIs
export const iotService = {
  // Gateway Operations
  createGateway: (data: any) =>
    request<{ success: boolean; data: IoTGateway }>(`${API_PREFIX}/gateways`, {
      method: 'POST',
      data,
    }),

  getGateways: (pageIndex = 1, pageSize = 20) =>
    request<{ success: boolean; data: { list: IoTGateway[]; total: number; page: number; pageSize: number } }>(
      `${API_PREFIX}/gateways?pageIndex=${pageIndex}&pageSize=${pageSize}`,
      { method: 'GET' }
    ),

  getGateway: (id: string) =>
    request<{ success: boolean; data: IoTGateway }>(`${API_PREFIX}/gateways/${id}`, {
      method: 'GET',
    }),

  updateGateway: (id: string, data: any) =>
    request<{ success: boolean; data: IoTGateway }>(`${API_PREFIX}/gateways/${id}`, {
      method: 'PUT',
      data,
    }),

  deleteGateway: (id: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/gateways/${id}`, {
      method: 'DELETE',
    }),

  getGatewayStatistics: (gatewayId: string) =>
    request<{ success: boolean; data: GatewayStatistics }>(
      `${API_PREFIX}/gateways/${gatewayId}/statistics`,
      { method: 'GET' }
    ),

  // Device Operations
  createDevice: (data: any) =>
    request<{ success: boolean; data: IoTDevice }>(`${API_PREFIX}/devices`, {
      method: 'POST',
      data,
    }),

  getDevices: (gatewayId?: string, pageIndex = 1, pageSize = 20) => {
    let url = `${API_PREFIX}/devices?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (gatewayId) {
      url += `&gatewayId=${gatewayId}`;
    }
    return request<{ success: boolean; data: { list: IoTDevice[]; total: number; page: number; pageSize: number } }>(url, { method: 'GET' });
  },

  getDevice: (id: string) =>
    request<{ success: boolean; data: IoTDevice }>(`${API_PREFIX}/devices/${id}`, {
      method: 'GET',
    }),

  updateDevice: (id: string, data: any) =>
    request<{ success: boolean; data: IoTDevice }>(`${API_PREFIX}/devices/${id}`, {
      method: 'PUT',
      data,
    }),

  deleteDevice: (id: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/devices/${id}`, {
      method: 'DELETE',
    }),

  getDeviceStatistics: (deviceId: string) =>
    request<{ success: boolean; data: DeviceStatistics }>(
      `${API_PREFIX}/devices/${deviceId}/statistics`,
      { method: 'GET' }
    ),

  // DataPoint Operations
  createDataPoint: (data: any) =>
    request<{ success: boolean; data: IoTDataPoint }>(`${API_PREFIX}/datapoints`, {
      method: 'POST',
      data,
    }),

  getDataPoints: (deviceId?: string, pageIndex = 1, pageSize = 20) => {
    let url = `${API_PREFIX}/datapoints?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (deviceId) {
      url += `&deviceId=${deviceId}`;
    }
    return request<{ success: boolean; data: { list: IoTDataPoint[]; total: number; page: number; pageSize: number } }>(url, { method: 'GET' });
  },

  getDataPoint: (id: string) =>
    request<{ success: boolean; data: IoTDataPoint }>(`${API_PREFIX}/datapoints/${id}`, {
      method: 'GET',
    }),

  updateDataPoint: (id: string, data: any) =>
    request<{ success: boolean; data: IoTDataPoint }>(`${API_PREFIX}/datapoints/${id}`, {
      method: 'PUT',
      data,
    }),

  deleteDataPoint: (id: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/datapoints/${id}`, {
      method: 'DELETE',
    }),

  // Data Record Operations
  reportData: (data: any) =>
    request<{ success: boolean; data: IoTDataRecord }>(`${API_PREFIX}/data/report`, {
      method: 'POST',
      data,
    }),

  batchReportData: (data: any) =>
    request<{ success: boolean; data: IoTDataRecord[] }>(`${API_PREFIX}/data/batch-report`, {
      method: 'POST',
      data,
    }),

  queryDataRecords: (data: any) =>
    request<{ success: boolean; data: { Records: IoTDataRecord[]; Total: number } }>(
      `${API_PREFIX}/data/query`,
      { method: 'POST', data }
    ),

  getLatestData: (dataPointId: string) =>
    request<{ success: boolean; data: IoTDataRecord }>(`${API_PREFIX}/data/latest/${dataPointId}`, {
      method: 'GET',
    }),

  getDataStatistics: (dataPointId: string, startTime: string, endTime: string) =>
    request<{ success: boolean; data: DataStatistics }>(
      `${API_PREFIX}/data/statistics/${dataPointId}?startTime=${startTime}&endTime=${endTime}`,
      { method: 'GET' }
    ),

  // Event Operations
  queryEvents: (data: any) =>
    request<{ success: boolean; data: { Events: IoTDeviceEvent[]; Total: number } }>(
      `${API_PREFIX}/events/query`,
      { method: 'POST', data }
    ),

  handleEvent: (eventId: string, remarks: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/events/${eventId}/handle`, {
      method: 'POST',
      data: { remarks },
    }),

  getUnhandledEventCount: (deviceId?: string) => {
    let url = `${API_PREFIX}/events/unhandled-count`;
    if (deviceId) {
      url += `?deviceId=${deviceId}`;
    }
    return request<{ success: boolean; data: { Count: number } }>(url, { method: 'GET' });
  },

  // Statistics Operations
  getPlatformStatistics: () =>
    request<{ success: boolean; data: PlatformStatistics }>(
      `${API_PREFIX}/statistics/platform`,
      { method: 'GET' }
    ),

  getDeviceStatusStatistics: () =>
    request<{ success: boolean; data: any }>(`${API_PREFIX}/statistics/device-status`, {
      method: 'GET',
    }),
};

