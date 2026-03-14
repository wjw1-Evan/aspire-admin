import { request } from '@umijs/max';

const API_PREFIX = '/api/iot';

// ─────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────
export type IoTDeviceStatus = 'Online' | 'Offline' | 'Fault' | 'Maintenance';
export type IoTDeviceType = 'Sensor' | 'Actuator' | 'Gateway' | 'Other';

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

export interface IoTEventQueryRequest {
    isHandled?: boolean;
    pageIndex?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    deviceId?: string;
    eventType?: string;
    level?: string;
    startTime?: string;
    endTime?: string;
}

export interface IoTEventQueryResponse {
    list: IoTDeviceEvent[];
    total: number;
    page: number;
    pageSize: number;
}

// ─────────────────────────────────────────────────────────────────
// API 方法
// ─────────────────────────────────────────────────────────────────

/**
 * 查询 IoT 事件
 */
export const queryIoTEvents = (params: IoTEventQueryRequest) =>
    request<{ success: boolean; data: IoTEventQueryResponse }>(`${API_PREFIX}/events/query`, {
        method: 'POST',
        data: params,
    });

/**
 * 获取未处理事件数量
 */
export const getUnhandledEventCount = (deviceId?: string) => {
    let url = `${API_PREFIX}/events/unhandled-count`;
    if (deviceId) url += `?deviceId=${deviceId}`;
    return request<{ success: boolean; data: number }>(url, { method: 'GET' });
};

/**
 * 处理事件
 */
export const handleIoTEvent = (eventId: string, remarks: string) =>
    request<{ success: boolean }>(`${API_PREFIX}/events/${eventId}/handle`, {
        method: 'POST',
        data: { remarks },
    });
