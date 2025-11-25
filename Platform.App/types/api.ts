/**
 * Common API response types
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    errorCode?: string;
    errorMessage?: string;
    showType?: number;
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
    errorMessage: string;
    showType: number;
    traceId?: string;
}
