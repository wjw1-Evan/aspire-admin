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
}): Promise<ApiResponse<{ queryable: KnowledgeBase[]; rowCount: number; currentPage: number; pageSize: number }>> {
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

// ─────────────────────────────────────────────────────────────────
// 知识库文档 API
// ─────────────────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  summary?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 分页获取知识库文档列表
 */
export async function getKnowledgeDocuments(
  knowledgeBaseId: string,
  params: { page?: number; pageSize?: number; keyword?: string }
): Promise<ApiResponse<{ queryable: KnowledgeDocument[]; rowCount: number; currentPage: number; pageSize: number }>> {
  return request(`/api/workflow/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: 'GET',
    params,
  });
}

/**
 * 获取文档详情
 */
export async function getKnowledgeDocument(
  knowledgeBaseId: string,
  id: string
): Promise<ApiResponse<KnowledgeDocument>> {
  return request(`/api/workflow/knowledge-bases/${knowledgeBaseId}/documents/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建文档
 */
export async function createKnowledgeDocument(
  knowledgeBaseId: string,
  data: { title: string; content: string; summary?: string; sortOrder?: number }
): Promise<ApiResponse<KnowledgeDocument>> {
  return request(`/api/workflow/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: 'POST',
    data,
  });
}

/**
 * 更新文档
 */
export async function updateKnowledgeDocument(
  knowledgeBaseId: string,
  id: string,
  data: Partial<{ title: string; content: string; summary?: string; sortOrder?: number }>
): Promise<ApiResponse<KnowledgeDocument>> {
  return request(`/api/workflow/knowledge-bases/${knowledgeBaseId}/documents/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除文档
 */
export async function deleteKnowledgeDocument(
  knowledgeBaseId: string,
  id: string
): Promise<ApiResponse<void>> {
  return request(`/api/workflow/knowledge-bases/${knowledgeBaseId}/documents/${id}`, {
    method: 'DELETE',
  });
}
