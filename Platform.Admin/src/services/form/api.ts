import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export enum FormFieldType {
    Text = 'Text',
    TextArea = 'TextArea',
    Number = 'Number',
    Date = 'Date',
    DateTime = 'DateTime',
    Select = 'Select',
    Radio = 'Radio',
    Checkbox = 'Checkbox',
    Switch = 'Switch',
    Attachment = 'Attachment',
}

export interface FormFieldOption {
    label: string;
    value: string;
}

export interface FormField {
    id?: string;
    label: string;
    type: FormFieldType;
    required?: boolean;
    placeholder?: string;
    defaultValue?: any;
    options?: FormFieldOption[];
    dataKey: string;
}

export interface FormDefinition {
    id?: string;
    name: string;
    key: string;
    version: number;
    description?: string;
    fields: FormField[];
    isActive: boolean;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export async function getFormList(params: { current?: number; pageSize?: number; keyword?: string; isActive?: boolean }): Promise<ApiResponse<{ list: FormDefinition[]; total: number; page: number; pageSize: number }>> {
    return request('/api/forms', {
        method: 'GET',
        params,
    });
}

export async function getFormDetail(id: string): Promise<ApiResponse<FormDefinition>> {
    return request(`/api/forms/${id}`, {
        method: 'GET',
    });
}

export async function createForm(data: Partial<FormDefinition>): Promise<ApiResponse<FormDefinition>> {
    return request('/api/forms', {
        method: 'POST',
        data,
    });
}

export async function updateForm(id: string, data: Partial<FormDefinition>): Promise<ApiResponse<FormDefinition>> {
    return request(`/api/forms/${id}`, {
        method: 'PUT',
        data,
    });
}

export async function deleteForm(id: string): Promise<ApiResponse<void>> {
    return request(`/api/forms/${id}`, {
        method: 'DELETE',
    });
}
