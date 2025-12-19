import { request } from '@umijs/max';

/**
 * 小科配置相关类型
 */
export interface XiaokeConfig {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateXiaokeConfigRequest {
  name: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  isEnabled?: boolean;
  isDefault?: boolean;
}

export interface UpdateXiaokeConfigRequest {
  name?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  isEnabled?: boolean;
  isDefault?: boolean;
}

export interface XiaokeConfigListResponse {
  data: XiaokeConfig[];
  total: number;
  success: boolean;
  pageSize: number;
  current: number;
}

export interface ChatHistoryListItem {
  sessionId: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessageExcerpt?: string;
  lastMessageAt?: string;
  messageCount: number;
  createdAt: string;
}

export interface ChatHistoryListResponse {
  data: ChatHistoryListItem[];
  total: number;
  success: boolean;
  pageSize: number;
  current: number;
}

export interface ChatHistoryQueryRequest {
  current?: number;
  pageSize?: number;
  sessionId?: string;
  userId?: string;
  content?: string;
  startTime?: string;
  endTime?: string;
  sorter?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName?: string;
  recipientId?: string;
  type: string;
  content?: string;
  attachment?: any;
  metadata: Record<string, any>;
  isRecalled: boolean;
  clientMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessageExcerpt?: string;
  lastMessageId?: string;
  lastMessageAt?: string;
  unreadCounts: Record<string, number>;
  lastReadMessageIds: Record<string, string>;
  topicTags: string[];
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryDetailResponse {
  session: ChatSession;
  messages: ChatMessage[];
}

/**
 * 获取配置列表
 */
export async function getXiaokeConfigs(params?: {
  page?: number;
  pageSize?: number;
  name?: string;
  isEnabled?: boolean;
  sorter?: string;
}) {
  return request<API.ApiResponse<XiaokeConfigListResponse>>('/api/xiaoke/config', {
    method: 'GET',
    params,
  });
}

/**
 * 根据ID获取配置详情
 */
export async function getXiaokeConfigById(id: string) {
  return request<API.ApiResponse<XiaokeConfig>>(`/api/xiaoke/config/${id}`, {
    method: 'GET',
  });
}

/**
 * 获取默认配置
 */
export async function getDefaultXiaokeConfig() {
  return request<API.ApiResponse<XiaokeConfig>>('/api/xiaoke/config/default', {
    method: 'GET',
  });
}

/**
 * 创建配置
 */
export async function createXiaokeConfig(data: CreateXiaokeConfigRequest) {
  return request<API.ApiResponse<XiaokeConfig>>('/api/xiaoke/config', {
    method: 'POST',
    data,
  });
}

/**
 * 更新配置
 */
export async function updateXiaokeConfig(id: string, data: UpdateXiaokeConfigRequest) {
  return request<API.ApiResponse<XiaokeConfig>>(`/api/xiaoke/config/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除配置
 */
export async function deleteXiaokeConfig(id: string) {
  return request<API.ApiResponse<void>>(`/api/xiaoke/config/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 设置默认配置
 */
export async function setDefaultXiaokeConfig(id: string) {
  return request<API.ApiResponse<void>>(`/api/xiaoke/config/${id}/set-default`, {
    method: 'POST',
  });
}

/**
 * 获取聊天记录列表
 */
export async function getChatHistory(data: ChatHistoryQueryRequest) {
  return request<API.ApiResponse<ChatHistoryListResponse>>('/api/xiaoke/chat-history/list', {
    method: 'POST',
    data,
  });
}

/**
 * 获取会话详情和消息
 */
export async function getChatHistoryDetail(sessionId: string) {
  return request<API.ApiResponse<ChatHistoryDetailResponse>>(
    `/api/xiaoke/chat-history/${sessionId}`,
    {
      method: 'GET',
    },
  );
}

/**
 * 删除会话
 */
export async function deleteChatHistory(sessionId: string) {
  return request<API.ApiResponse<void>>(`/api/xiaoke/chat-history/${sessionId}`, {
    method: 'DELETE',
  });
}
