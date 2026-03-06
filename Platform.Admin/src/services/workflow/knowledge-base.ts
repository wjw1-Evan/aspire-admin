import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  category: string;
  itemCount: number;
  isActive: boolean;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * 获取知识库列表
 */
export async function getKnowledgeBases(params: {
  current?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<ApiResponse<{ list: KnowledgeBase[]; total: number; page: number; pageSize: number }>> {
  return request('/api/workflow/knowledge-bases', {
    method: 'GET',
    params,
  });
}

/**
 * 获取知识库详情
 */
export async function getKnowledgeBase(id: string): Promise<ApiResponse<KnowledgeBase>> {
  return request(`/api/workflow/knowledge-bases/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建知识库
 */
export async function createKnowledgeBase(data: Partial<KnowledgeBase>): Promise<ApiResponse<KnowledgeBase>> {
  return request('/api/workflow/knowledge-bases', {
    method: 'POST',
    data,
  });
}

/**
 * 更新知识库
 */
export async function updateKnowledgeBase(id: string, data: Partial<KnowledgeBase>): Promise<ApiResponse<KnowledgeBase>> {
  return request(`/api/workflow/knowledge-bases/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除知识库
 */
export async function deleteKnowledgeBase(id: string): Promise<ApiResponse<void>> {
  return request(`/api/workflow/knowledge-bases/${id}`, {
    method: 'DELETE',
  });
}
