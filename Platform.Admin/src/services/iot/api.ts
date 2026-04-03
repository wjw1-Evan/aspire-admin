import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types/unified-api';
import type { PageParams } from '@/types/page-params';

const API_PREFIX = '/api/iot';

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

export interface IoTEventQueryRequest extends PageParams {
    isHandled?: boolean;
    deviceId?: string;
    eventType?: string;
    level?: string;
    startTime?: string;
    endTime?: string;
}

export type IoTEventQueryResponse = PagedResult<IoTDeviceEvent>;

export const queryIoTEvents = (params: IoTEventQueryRequest) =>
    request<ApiResponse<IoTEventQueryResponse>>(`${API_PREFIX}/events/query`, {
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
