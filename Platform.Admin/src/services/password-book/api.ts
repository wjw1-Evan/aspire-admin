import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';
import type {
  PasswordBookEntry,
  PasswordBookEntryDetail,
  CreatePasswordBookEntryRequest,
  UpdatePasswordBookEntryRequest,
  PasswordBookQueryRequest,
  PasswordBookListResponse,
  PasswordStrengthResult,
  GeneratePasswordRequest,
  GeneratePasswordResponse,
  ExportPasswordBookRequest,
  PasswordBookStatistics,
} from '@/pages/password-book/types';

/**
 * 创建密码本条目
 */
export async function createPasswordBookEntry(data: CreatePasswordBookEntryRequest) {
  return request<ApiResponse<PasswordBookEntry>>('/api/password-book', {
    method: 'POST',
    data,
  });
}

/**
 * 更新密码本条目
 */
export async function updatePasswordBookEntry(
  id: string,
  data: UpdatePasswordBookEntryRequest,
) {
  return request<ApiResponse<PasswordBookEntry>>(`/api/password-book/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 获取密码本条目详情（包含解密后的密码）
 */
export async function getPasswordBookEntry(id: string) {
  return request<ApiResponse<PasswordBookEntryDetail>>(`/api/password-book/${id}`, {
    method: 'GET',
  });
}

/**
 * 分页查询密码本条目列表
 */
export async function getPasswordBookList(data: PasswordBookQueryRequest) {
  return request<ApiResponse<PasswordBookListResponse>>('/api/password-book/list', {
    method: 'POST',
    data,
  });
}

/**
 * 删除密码本条目
 */
export async function deletePasswordBookEntry(id: string) {
  return request<ApiResponse<void>>(`/api/password-book/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 获取所有分类
 */
export async function getCategories() {
  return request<ApiResponse<string[]>>('/api/password-book/categories', {
    method: 'GET',
  });
}

/**
 * 生成密码
 */
export async function generatePassword(data: GeneratePasswordRequest) {
  return request<ApiResponse<GeneratePasswordResponse>>('/api/password-book/generate', {
    method: 'POST',
    data,
  });
}

/**
 * 检测密码强度
 */
export async function checkPasswordStrength(password: string) {
  return request<ApiResponse<PasswordStrengthResult>>('/api/password-book/check-strength', {
    method: 'POST',
    data: { password },
  });
}

/**
 * 导出密码本数据
 */
export async function exportPasswordBook(data: ExportPasswordBookRequest) {
  const response = await request<Blob>(`/api/password-book/export`, {
    method: 'POST',
    data,
    responseType: 'blob',
    getResponse: true,
  });
  
  const blob = response.data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.download = `password-book-export-${timestamp}.${data.format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 获取统计信息
 */
export async function getPasswordBookStatistics() {
  return request<ApiResponse<PasswordBookStatistics>>('/api/password-book/statistics', {
    method: 'GET',
  });
}
