/**
 * Common API response types
 * 与后端 Platform.ServiceDefaults.Models.ApiResponse 保持一致
 */

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errorCode?: string;
    errors?: any;
    timestamp?: string;
    traceId?: string;
}

export interface PagedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ErrorResponse {
    success: false;
    errorCode: string;
    message: string;
    traceId?: string;
}
