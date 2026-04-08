import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';
import type { PageParams } from '@/types';

const API_PREFIX = '/apiservice/api/iot';

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

export type IoTEventQueryResponse = PagedResult<IoTDeviceEvent>;

export const queryIoTEvents = (params: PageParams) =>
    request<ApiResponse<IoTEventQueryResponse>>(`${API_PREFIX}/events/query`, {
        method: 'GET',
        params: params,
    });

/**
 * 获取未处理事件数量
 */
export const getUnhandledEventCount = (deviceId?: string) => {
    let url = `${API_PREFIX}/events/unhandled-count`;
    if (deviceId) url += `?deviceId=${deviceId}`;
    return request<ApiResponse<{ count: number }>>(url, { method: 'GET' });
};

/**
 * 处理事件
 */
export const handleIoTEvent = (eventId: string, remarks: string) =>
    request<ApiResponse<boolean>>(`${API_PREFIX}/events/${eventId}/handle`, {
        method: 'POST',
        data: { remarks },
    });
