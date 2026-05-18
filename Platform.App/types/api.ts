/**
 * Common API response types
 * 与后端 Platform.ServiceDefaults.Models.ApiResponse 保持一致
 */

export interface ValidationError {
    [field: string]: string[];
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    errorCode?: string;
    errors?: ValidationError;
    timestamp?: string;
    traceId?: string;
}

export interface PagedResult<T> {
    queryable: T[];
    currentPage: number;
    pageSize: number;
    rowCount: number;
    pageCount: number;
}

export interface ErrorResponse {
    success: false;
    errorCode: string;
    message: string;
    traceId?: string;
}
