import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 公文状态枚举
 */
export enum DocumentStatus {
  Draft = 0,        // 草稿
  Pending = 1,      // 审批中
  Approved = 2,    // 已通过
  Rejected = 3     // 已拒绝
}

/**
 * 公文统计信息响应
 */
export type DocumentStatistics = {
  totalDocuments: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  myCreatedCount: number;
};

/**
 * 公文
 */
export interface Document {
  id?: string;
  title: string;
  content?: string;
  documentType: string;
  category?: string;
  workflowInstanceId?: string;
  status: DocumentStatus;
  createdBy: string;
  attachmentIds: string[];
  formData: Record<string, any>;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建公文请求
 */
export interface CreateDocumentRequest {
  title: string;
  content?: string;
  documentType: string;
  category?: string;
  attachmentIds?: string[];
  formData?: Record<string, any>;
}

export interface DocumentAttachmentUploadResponse {
  id: string;
  name: string;
  url: string;
  size?: number;
  contentType?: string;
}

/**
 * 更新公文请求
 */
export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  documentType?: string;
  category?: string;
  attachmentIds?: string[];
  formData?: Record<string, any>;
}

/**
 * 公文查询参数
 */
export interface DocumentQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: DocumentStatus;
  documentType?: string;
  category?: string;
  createdBy?: string;
  filterType?: 'all' | 'my' | 'pending' | 'approved' | 'rejected';
}

/**
 * 提交公文请求
 */
export interface SubmitDocumentRequest {
  workflowDefinitionId: string;
  variables?: Record<string, any>;
}

/**
 * 审批请求
 */
export interface ApprovalRequest {
  comment?: string;
}

/**
 * 退回请求
 */
export interface ReturnDocumentRequest {
  targetNodeId: string;
  comment: string;
}

/**
 * 转办请求
 */
export interface DelegateDocumentRequest {
  delegateToUserId: string;
  comment?: string;
}

/**
 * 获取公文列表
 */
export async function getDocumentList(params: DocumentQueryParams): Promise<ApiResponse<{ list: Document[]; total: number; page: number; pageSize: number }>> {
  return request('/api/documents', {
    method: 'GET',
    params,
  });
}

/**
 * 获取公文详情
 */
export async function getDocumentDetail(id: string): Promise<ApiResponse<Document & { workflowInstance?: any; workflowDefinition?: any; approvalHistory?: any[] }>> {
  return request(`/api/documents/${id}`, {
    method: 'GET',
  });
}

/**
 * 从文档实例中获取文档创建表单（使用实例快照）
 */
export async function getDocumentInstanceForm(id: string): Promise<ApiResponse<{ form: any | null; dataScopeKey?: string; initialValues?: Record<string, any> }>> {
  return request(`/api/documents/${id}/instance-form`, {
    method: 'GET',
  });
}

/**
 * 创建公文
 */
export async function createDocument(data: CreateDocumentRequest): Promise<ApiResponse<Document>> {
  return request('/api/documents', {
    method: 'POST',
    data,
  });
}

/**
 * 上传公文附件
 */
export async function uploadDocumentAttachment(file: File): Promise<ApiResponse<DocumentAttachmentUploadResponse>> {
  const formData = new FormData();
  formData.append('file', file);

  return request('/api/documents/attachments', {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
}

/**
 * 更新公文
 */
export async function updateDocument(id: string, data: UpdateDocumentRequest): Promise<ApiResponse<Document>> {
  return request(`/api/documents/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除公文
 */
export async function deleteDocument(id: string): Promise<ApiResponse<void>> {
  return request(`/api/documents/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 提交公文（启动流程）
 */
export async function submitDocument(id: string, data: SubmitDocumentRequest): Promise<ApiResponse<any>> {
  return request(`/api/documents/${id}/submit`, {
    method: 'POST',
    data,
  });
}

/**
 * 审批通过
 */
export async function approveDocument(id: string, data: ApprovalRequest): Promise<ApiResponse<boolean>> {
  return request(`/api/documents/${id}/approve`, {
    method: 'POST',
    data,
  });
}

/**
 * 审批拒绝
 */
export async function rejectDocument(id: string, data: ApprovalRequest): Promise<ApiResponse<boolean>> {
  return request(`/api/documents/${id}/reject`, {
    method: 'POST',
    data,
  });
}

/**
 * 退回
 */
export async function returnDocument(id: string, data: ReturnDocumentRequest): Promise<ApiResponse<boolean>> {
  return request(`/api/documents/${id}/return`, {
    method: 'POST',
    data,
  });
}

/**
 * 转办
 */
export async function delegateDocument(id: string, data: DelegateDocumentRequest): Promise<ApiResponse<boolean>> {
  return request(`/api/documents/${id}/delegate`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取待审批列表
 */
export async function getPendingDocuments(params: DocumentQueryParams): Promise<ApiResponse<{ list: Document[]; total: number; page: number; pageSize: number }>> {
  return request('/api/documents/pending', {
    method: 'GET',
    params,
  });
}

/** 获取公文统计信息 */
export async function getDocumentStatistics(): Promise<ApiResponse<DocumentStatistics>> {
  return request('/api/documents/statistics', {
    method: 'GET',
  });
}
