import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/api-response';

export interface MenuItem { id: string; name: string; title: string; path?: string; icon?: string; sortOrder?: number; parentId?: string; type?: string; children?: MenuItem[]; }
export interface MenuTreeNode { id?: string; name?: string; title?: string; children?: MenuTreeNode[]; }
export interface CreateMenuRequest { name: string; title: string; path?: string; icon?: string; sortOrder?: number; parentId?: string; type?: string; }
export interface UpdateMenuRequest extends Partial<CreateMenuRequest> {}
export interface ReorderMenusRequest { items: { id: string; parentId?: string; sortOrder: number }[]; }

/**
 * 获取所有菜单
 */
export async function getAllMenus(options?: Record<string, any>) {
  return request<ApiResponse<MenuItem[]>>('/api/menu', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取菜单树
 */
export async function getMenuTree(options?: Record<string, any>) {
  return request<ApiResponse<MenuTreeNode[]>>('/api/menu/tree', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取用户菜单
 */
export async function getUserMenus(options?: Record<string, any>) {
  return request<ApiResponse<MenuTreeNode[]>>('/api/menu/user', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 根据ID获取菜单
 */
export async function getMenuById(id: string, options?: Record<string, any>) {
  return request<ApiResponse<MenuItem>>(`/api/menu/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 创建菜单
 */
export async function createMenu(data: CreateMenuRequest, options?: Record<string, any>) {
  return request<ApiResponse<MenuItem>>('/api/menu', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 更新菜单
 */
export async function updateMenu(
  id: string,
  data: UpdateMenuRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>(`/api/menu/${id}`, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

/**
 * 删除菜单
 */
export async function deleteMenu(id: string, reason?: string, options?: Record<string, any>) {
  return request<ApiResponse<boolean>>(`/api/menu/${id}`, {
    method: 'DELETE',
    params: { reason },
    ...(options || {}),
  });
}

/**
 * 菜单排序
 */
export async function reorderMenus(data: ReorderMenusRequest, options?: Record<string, any>) {
  return request<ApiResponse<boolean>>('/api/menu/reorder', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

