import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export interface OrganizationUnit {
    id?: string;
    name: string;
    code?: string;
    parentId?: string;
    description?: string;
    sortOrder?: number;
    managerUserId?: string;
    createdAt?: string;
    updatedAt?: string;
    children?: OrganizationUnit[];
}

export type OrganizationTreeNode = OrganizationUnit;

export interface CreateOrganizationUnitRequest {
    name: string;
    code?: string;
    parentId?: string;
    description?: string;
    sortOrder?: number;
    managerUserId?: string;
}

export type UpdateOrganizationUnitRequest = CreateOrganizationUnitRequest;

export async function getOrganizationTree() {
    return request<ApiResponse<OrganizationTreeNode[]>>('/api/organization/tree', {
        method: 'GET',
    });
}

export async function getOrganizationNode(id: string) {
    return request<ApiResponse<OrganizationUnit>>(`/api/organization/${id}`, {
        method: 'GET',
    });
}

export async function createOrganizationNode(data: CreateOrganizationUnitRequest) {
    return request<ApiResponse<OrganizationUnit>>('/api/organization', {
        method: 'POST',
        data,
    });
}

export async function updateOrganizationNode(id: string, data: UpdateOrganizationUnitRequest) {
    return request<ApiResponse<boolean>>(`/api/organization/${id}`, {
        method: 'PUT',
        data,
    });
}

export async function deleteOrganizationNode(id: string) {
    return request<ApiResponse<boolean>>(`/api/organization/${id}`, {
        method: 'DELETE',
    });
}

export interface OrganizationReorderItem {
    id: string;
    parentId?: string;
    sortOrder: number;
}

export async function reorderOrganization(items: OrganizationReorderItem[]) {
    return request<ApiResponse<boolean>>('/api/organization/reorder', {
        method: 'POST',
        data: items,
    });
}

export interface AssignUserOrganizationRequest {
    userId: string;
    organizationUnitId: string;
    isPrimary?: boolean;
}

export async function assignUserToOrganization(data: AssignUserOrganizationRequest) {
    return request<ApiResponse<boolean>>('/api/organization/assign-user', {
        method: 'POST',
        data,
    });
}

export interface RemoveUserOrganizationRequest {
    userId: string;
    organizationUnitId: string;
}

export async function removeUserFromOrganization(data: RemoveUserOrganizationRequest) {
    return request<ApiResponse<boolean>>('/api/organization/remove-user', {
        method: 'POST',
        data,
    });
}

export interface OrganizationMemberItem {
    userId: string;
    username: string;
    email?: string;
    organizationUnitId: string;
    organizationUnitName?: string;
}

export async function getOrganizationMembers(organizationUnitId: string) {
    return request<ApiResponse<OrganizationMemberItem[]>>(`/api/organization/${organizationUnitId}/members`, {
        method: 'GET',
    });
}
